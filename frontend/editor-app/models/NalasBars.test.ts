import { describe, expect, it } from 'vitest';

import {
  activePatterns,
  clampBarCount,
  clampEase,
  clampImpacts,
  clampRandomness,
  clampSpeed,
  createBarMotion,
  DEFAULT_PATTERN,
  strokeProgress,
  strokeSeconds,
  withVariations,
} from './NalasBars';
import type { Bar, BarPose, Pattern } from './NalasBars';

const STEADY = { riseStart: 0, riseEnd: 0, fallStart: 0, fallEnd: 0 };

const bar = (patterns: Partial<Pattern>[], extra: Partial<Bar> = {}): Bar => ({
  label: '',
  jolt: 0,
  wobble: 0,
  crack: false,
  broken: false,
  impacts: 1,
  variations: patterns.length - 1,
  patterns: patterns.map(pattern => ({ ...DEFAULT_PATTERN, ...pattern })),
  ...extra,
});

/** Samples a bar every hundredth of a second. */
function sample(target: Bar, seconds: number, options = {}): BarPose[] {
  const motion = createBarMotion(target, options);
  return Array.from({ length: Math.round(seconds * 100) + 1 }, (_, step) => motion(step / 100));
}

/** How many times the white turns round at the top. */
function tops(poses: BarPose[]): number {
  let count = 0;
  for (let i = 1; i < poses.length - 1; i += 1) {
    if (poses[i].fill > poses[i - 1].fill + 1e-9 && poses[i].fill >= poses[i + 1].fill) count += 1;
  }
  return count;
}

describe('strokes', () => {
  it('takes half a beat at its speed', () => {
    expect(strokeSeconds(60)).toBe(0.5);
    expect(strokeSeconds(30)).toBe(1);
    expect(strokeSeconds(0)).toBe(30);
  });

  it('runs from start to end whatever the easing', () => {
    for (const [start, end] of [[100, 100], [0, 0], [-100, 50], [25, -60]]) {
      expect(strokeProgress(0, start, end)).toBe(0);
      expect(strokeProgress(1, start, end)).toBeCloseTo(1, 12);
      for (let t = 0; t < 1; t += 0.01) {
        expect(strokeProgress(t + 0.01, start, end)).toBeGreaterThanOrEqual(strokeProgress(t, start, end) - 1e-12);
      }
    }
  });

  it('dampens or accelerates the start and end', () => {
    const speedAtStart = (ease: number) => strokeProgress(0.001, ease, 0) / 0.001;
    const speedAtEnd = (ease: number) => (1 - strokeProgress(0.999, 0, ease)) / 0.001;
    expect(speedAtStart(0)).toBeCloseTo(1, 2);
    // Dampening of 25% starts 25% slower; accelerating 25% starts 25% faster.
    expect(speedAtStart(25)).toBeCloseTo(0.75, 2);
    expect(speedAtStart(-25)).toBeCloseTo(1.25, 2);
    expect(speedAtStart(100)).toBeCloseTo(0, 2);
    expect(speedAtEnd(40)).toBeCloseTo(0.6, 2);
    // Steady both ends: halfway through the time is halfway there.
    expect(strokeProgress(0.5, 0, 0)).toBeCloseTo(0.5, 12);
  });
});

describe('bar motion', () => {
  it('rises and falls as many times a minute as its BPM when rise and fall match', () => {
    expect(tops(sample(bar([{ rise: 120, fall: 120 }]), 60))).toBe(120);
  });

  it('gives rising and falling their own speeds', () => {
    // Rise at 30 (1 s), fall at 100 (0.3 s): one cycle every 1.3 s.
    const poses = sample(bar([{ rise: 30, fall: 100, ...STEADY }]), 13);
    expect(tops(poses)).toBe(10);
    expect(poses[100].fill).toBeCloseTo(1, 6);
    expect(poses[115].fill).toBeCloseTo(0.5, 1);
    expect(poses[130].fill).toBeCloseTo(0, 6);
  });

  it('stays between its min and max', () => {
    for (const pose of sample(bar([{ rise: 90, fall: 90, max: 80, min: 30 }], { jolt: 100 }), 5)) {
      expect(pose.fill).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(pose.fill).toBeLessThanOrEqual(0.8 + 1e-9);
    }
  });

  it('plays each pattern its number of times, then loops', () => {
    // Fast ×4 (0.5 s each), then slow ×2 (2 s each): 6 s, then again.
    const target = bar([{ rise: 120, fall: 120, repeats: 4 }, { rise: 30, fall: 30, repeats: 2 }]);
    expect(tops(sample(target, 6))).toBe(6);
    expect(tops(sample(target, 12))).toBe(12);
    const poses = sample(target, 6);
    // During the slow part, the white is still on its way up after half a second.
    expect(poses[250].fill).toBeLessThan(0.9);
  });

  it('pauses on a pattern whose min equals its max', () => {
    const target = bar([{ rise: 60, fall: 60, repeats: 1 }, { rise: 60, fall: 60, max: 0, min: 0, repeats: 2 }], { jolt: 100, wobble: 100 });
    const pause = sample(target, 3).slice(110, 290);
    for (const pose of pause) expect(pose).toMatchObject({ fill: 0, lift: 0, sway: 0, tilt: 0, scaleX: 1 });
  });

  it('moves smoothly from one pattern to the next, even with a different min', () => {
    const target = bar([{ rise: 60, fall: 60, min: 0 }, { rise: 60, fall: 60, min: 50, max: 90 }]);
    const poses = sample(target, 8);
    for (let i = 1; i < poses.length; i += 1) {
      expect(Math.abs(poses[i].fill - poses[i - 1].fill)).toBeLessThan(0.05);
    }
  });

  it('keeps the jolt and the wobble apart', () => {
    const at = (extra: Partial<Bar>) => createBarMotion(bar([{ rise: 60, fall: 60 }], extra))(0.52);
    const joltOnly = at({ jolt: 100, wobble: 0 });
    expect(joltOnly.lift).toBeGreaterThan(0);
    expect(joltOnly.scaleX).toBeGreaterThan(1);
    expect(joltOnly).toMatchObject({ sway: 0, tilt: 0 });

    const wobbleOnly = at({ jolt: 0, wobble: 100 });
    expect(wobbleOnly).toMatchObject({ lift: 0, scaleX: 1, scaleY: 1 });
    expect(Math.abs(wobbleOnly.sway) + Math.abs(wobbleOnly.tilt)).toBeGreaterThan(0);

    // Half the setting is half the movement.
    expect(at({ jolt: 50 }).lift).toBeCloseTo(joltOnly.lift / 2, 9);
  });

  it('varies each cycle by up to the randomness, the same way every time', () => {
    const target = bar([{ rise: 60, fall: 60, ...STEADY }]);
    const steady = sample(target, 30);
    const random = sample(target, 30, { randomness: 10 });
    expect(random).toEqual(sample(target, 30, { randomness: 10 }));
    expect(random).not.toEqual(steady);
    // 30 one-second cycles, each 0.9–1.1 s long: between 27 and 34 tops.
    expect(tops(random)).toBeGreaterThanOrEqual(27);
    expect(tops(random)).toBeLessThanOrEqual(34);
  });

  it('starts each bar a little later than the one before', () => {
    const target = bar([{ rise: 60, fall: 60 }]);
    expect(createBarMotion(target, { index: 0 })(0).fill).toBeCloseTo(0, 9);
    expect(createBarMotion(target, { index: 1 })(0).fill).toBeGreaterThan(0);
  });

  it('can be played backwards in time', () => {
    const motion = createBarMotion(bar([{ rise: 120, fall: 120, repeats: 3 }, { rise: 40, fall: 40 }]));
    const later = motion(7.3);
    motion(0.2);
    expect(motion(7.3)).toEqual(later);
  });
});

describe('variations', () => {
  it('adds copies of the last pattern, and keeps patterns when variations go down', () => {
    const one = bar([{ rise: 90, repeats: 4 }]);
    const three = withVariations(one, 2);
    expect(activePatterns(three)).toHaveLength(3);
    expect(three.patterns[2]).toEqual(one.patterns[0]);

    const edited = { ...three, patterns: three.patterns.map((p, i) => (i === 2 ? { ...p, rise: 10 } : p)) };
    const back = withVariations(withVariations(edited, 0), 2);
    expect(activePatterns(withVariations(edited, 0))).toHaveLength(1);
    expect(back.patterns[2].rise).toBe(10);
  });
});

describe('limits', () => {
  it('keeps settings in range', () => {
    expect([0, 1, 2.6, 4, 9, Number.NaN].map(clampBarCount)).toEqual([1, 1, 3, 4, 4, 1]);
    expect(clampSpeed(0)).toBe(1);
    expect(clampSpeed(5000)).toBe(5000);
    expect(clampEase(-300)).toBe(-100);
    expect(clampRandomness(80)).toBe(50);
    // Impacts have no upper limit, but are whole and at least 1.
    expect([0, 2.6, 5000, 1e9, Number.NaN].map(clampImpacts)).toEqual([1, 3, 5000, 1e9, 1]);
  });
});

describe('cracks', () => {
  // One second a cycle: rising for half a second, then the impact at 0.5 s.
  const cracking = (changes: Partial<Pattern> = {}, crack = true) => createBarMotion(bar([{ rise: 60, fall: 60, ...changes }], { crack }));

  it('cracks the top as the white hits it, spreading then fading while it falls', () => {
    const motion = cracking();
    expect(motion(0.3).crack).toBeNull();
    const fresh = motion(0.51)!.crack!;
    expect(fresh.fade).toBeCloseTo(1, 9);
    expect(fresh.spread).toBeCloseTo(0.125, 6);
    expect(motion(0.6).crack!.spread).toBe(1);
    expect(motion(0.6).crack!.fade).toBeCloseTo(1, 9);
    expect(motion(0.85).crack!.fade).toBeLessThan(0.6);
    // Gone before the white rises again.
    expect(motion(0.97).crack).toBeNull();
  });

  it('cracks differently each time, the same way every time', () => {
    const seeds = [0.6, 1.6, 2.6].map(time => cracking()(time).crack!.seed);
    expect(new Set(seeds).size).toBe(3);
    expect([0.6, 1.6, 2.6].map(time => cracking()(time).crack!.seed)).toEqual(seeds);
  });

  it('only cracks when switched on and the white reaches the top', () => {
    expect(cracking({}, false)(0.6).crack).toBeNull();
    expect(cracking({ max: 85 })(0.6).crack).toBeNull();
    expect(cracking({ max: 95 })(0.6).crack!.fade).toBeCloseTo(0.5, 6);
    // A pause at the top doesn't keep cracking.
    expect(cracking({ max: 100, min: 100 })(0.6).crack).toBeNull();
  });
});

describe('breaking', () => {
  const breaking = (patterns: Partial<Pattern>[], broken = true, impacts = 1) => createBarMotion(bar(patterns, { broken, impacts }));

  it('breaks the top off the first time the white slams into it faster than 80', () => {
    // Slow ×2 (1.5 s each), then fast ×1: rising at 120 hits the top 0.25 s into it, at 3.25 s.
    const motion = breaking([{ rise: 40, fall: 40, repeats: 2 }, { rise: 120, fall: 120 }]);
    expect(motion(3.2).broken).toBeNull();
    expect(motion(3.3).broken).toMatchObject({ since: expect.closeTo(0.05, 6) });
    // It stays broken, through the slow pattern and beyond.
    expect(motion(6).broken!.since).toBeCloseTo(2.75, 6);
    expect(motion(60).broken!.since).toBeCloseTo(56.75, 6);
    expect(motion(60).broken!.seed).toBe(motion(3.3).broken!.seed);
  });

  it('takes as many slams as its impacts setting, only counting hard ones', () => {
    // Fast (0.5 s, slam at 0.25 s) then slow (1.5 s, too slow to count), over and over:
    // slams at 0.25, 2.25 and 4.25 s.
    const motion = breaking([{ rise: 120, fall: 120 }, { rise: 40, fall: 40 }], true, 3);
    expect(motion(4.2).broken).toBeNull();
    expect(motion(4.3)!.broken!.since).toBeCloseTo(0.05, 6);
    expect(motion(30)!.broken!.since).toBeCloseTo(25.75, 6);
    // Played again from the start, it waits for the third slam again.
    expect(breaking([{ rise: 120, fall: 120 }, { rise: 40, fall: 40 }], true, 3)(2.3).broken).toBeNull();
  });

  it('only counts slams from when Broken was switched on', () => {
    // Slams at 0.25, 0.75, 1.25 … s. Switched on at 2 s, the second slam after that is at 2.75 s.
    const target = bar([{ rise: 120, fall: 120 }], { broken: true, impacts: 2 });
    expect(createBarMotion(target)(0.8).broken).not.toBeNull();
    const fromTwo = createBarMotion(target, { countSlamsFrom: 2 });
    expect(fromTwo(2.7).broken).toBeNull();
    expect(fromTwo(2.8)!.broken!.since).toBeCloseTo(0.05, 6);
  });

  it('counts a rise from 90 to 100 as a slam', () => {
    // Rising from 90 to 100 at 120: slams at 0.25 s, then every 0.5 s.
    const motion = breaking([{ rise: 120, fall: 120, min: 90, max: 100 }], true, 2);
    expect(motion(0.7).broken).toBeNull();
    expect(motion(0.8).broken).not.toBeNull();
  });

  it('stays whole when it never slams hard enough, or is switched off', () => {
    expect(breaking([{ rise: 80, fall: 80 }])(30).broken).toBeNull();
    expect(breaking([{ rise: 200, fall: 200, max: 85 }])(30).broken).toBeNull();
    expect(breaking([{ rise: 200, fall: 200 }], false)(30).broken).toBeNull();
  });

  it('breaks at the same moment when played again from the start', () => {
    const motion = breaking([{ rise: 40, fall: 40, repeats: 2 }, { rise: 120, fall: 120 }]);
    const later = motion(9);
    motion(1);
    expect(motion(1).broken).toBeNull();
    expect(motion(9)).toEqual(later);
  });
});
