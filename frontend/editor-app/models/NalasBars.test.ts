import { describe, expect, it } from 'vitest';

import {
  barPose,
  clampBpm,
  clampPercent,
  clampWobble,
  DEFAULT_BARS,
  GIF_FRAMES_PER_SECOND,
  planLoop,
  posesAt,
} from './NalasBars';

const BPM_SETS = [
  [30, 45, 60, 80],
  [120, 120, 120, 120],
  [0, 45, 60, 80],
  [3, 51, 87, 99],
  [140, 175, 333, 1000],
];

const bars = (bpms: number[], depth = 100) => bpms.map(bpm => ({ label: '', bpm, depth, wobble: 100 }));

describe("Nala's bars loop", () => {
  it.each(BPM_SETS)('makes every bar finish whole beats: %o', (...bpms) => {
    const plan = planLoop(bars(bpms));

    expect(plan.frames).toBe(Math.round(plan.seconds * GIF_FRAMES_PER_SECOND));
    plan.beatsPerSecond.forEach((rate, index) => {
      const beats = rate * plan.seconds;
      expect(beats).toBeCloseTo(Math.round(beats), 9);
      if (bpms[index] > 0) expect(Math.round(beats)).toBeGreaterThanOrEqual(1);
    });
  });

  it.each(BPM_SETS)('ends exactly where it starts: %o', (...bpms) => {
    for (const depth of [100, 70, 25]) {
      const loopBars = bars(bpms, depth);
      const plan = planLoop(loopBars);
      const start = posesAt(loopBars, plan, 0);
      const end = posesAt(loopBars, plan, plan.seconds);

      end.forEach((pose, index) => {
        for (const [key, value] of Object.entries(pose)) {
          expect(value).toBeCloseTo(start[index][key as keyof typeof pose], 6);
        }
      });
    }
  });

  it('keeps BPMs within 3 of what was set, and loops short when it can', () => {
    const plan = planLoop(DEFAULT_BARS);
    expect(plan.largestChange).toBeLessThanOrEqual(3);
    expect(plan.seconds).toBeLessThanOrEqual(6);

    // Bars at the same BPM loop after one beat.
    expect(planLoop(bars([60, 60, 60, 60]))).toMatchObject({ seconds: 1, largestChange: 0 });
  });

  it('lets a bar at 0 BPM stand still without stretching the loop', () => {
    const plan = planLoop(bars([0, 60, 60, 60]));
    expect(plan).toMatchObject({ seconds: 1, largestChange: 0 });
    expect(plan.beatsPerSecond[0]).toBe(0);
  });
});

const pose = (beat: number, bpm: number, depth = 100, wobble = 100) => barPose(beat, { bpm, depth, wobble });

describe("Nala's bars motion", () => {
  it('rises from empty to its fill and back once per beat', () => {
    expect(pose(0, 60).fill).toBeCloseTo(0, 9);
    expect(pose(0.5, 60).fill).toBeCloseTo(1, 9);
    // With Fill 70 the rise and fall takes 70% of the beat, so the top is at 35%.
    expect(pose(0.35, 60, 70).fill).toBeCloseTo(0.7, 9);
    expect(pose(0.5, 60, 0).fill).toBe(0);
  });

  it('moves the white at the same speed whatever the fill, then rests', () => {
    const fastest = (depth: number) => {
      let speed = 0;
      for (let beat = 0; beat < 1; beat += 0.0001) {
        speed = Math.max(speed, Math.abs(pose(beat + 0.0001, 60, depth).fill - pose(beat, 60, depth).fill));
      }
      return speed;
    };
    expect(fastest(50)).toBeCloseTo(fastest(100), 4);
    expect(fastest(20)).toBeCloseTo(fastest(100), 4);

    // With half the fill, the white is done halfway through the beat.
    expect(pose(0.6, 60, 50).fill).toBe(0);
    expect(pose(0.99, 60, 50).fill).toBe(0);
  });

  it('bounces as much as its wobble, up to the old strongest at 100', () => {
    const strongest = pose(0.52, 60, 100, 100);
    const phase = -Math.PI / 2 + 0.52 * Math.PI * 2;
    const top = Math.max(0, Math.sin(phase)) ** 16;
    expect(strongest.lift).toBeCloseTo(Math.abs(Math.sin(phase * 4.5)) * top * 24, 9);
    expect(strongest.scaleX).toBeCloseTo(1 + top * 0.26, 9);

    const half = pose(0.52, 60, 100, 50);
    expect(half.lift).toBeCloseTo(strongest.lift / 2, 9);
    expect(half.sway).toBeCloseTo(strongest.sway / 2, 9);
    expect(half.tilt).toBeCloseTo(strongest.tilt / 2, 9);
    expect(half.scaleX - 1).toBeCloseTo((strongest.scaleX - 1) / 2, 9);

    // The BPM no longer changes how much it bounces.
    expect(pose(0.52, 200, 100, 50).lift).toBeCloseTo(half.lift, 9);
  });

  it('keeps the fill between empty and its fill', () => {
    for (let beat = 0; beat < 1; beat += 0.001) {
      const { fill } = pose(beat, 104, 60);
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(0.6);
    }
  });

  it('shows a still bar at its fill at 0 BPM', () => {
    expect(pose(0.3, 0, 70)).toMatchObject({ fill: 0.7, lift: 0, sway: 0, tilt: 0 });
  });

  it('allows any BPM from 0 up, fills of 0–100 and wobbles of 1–100', () => {
    expect(clampBpm(-5)).toBe(0);
    expect(clampBpm(2500)).toBe(2500);
    expect(clampBpm(Number.NaN)).toBe(0);
    expect(clampPercent(140)).toBe(100);
    expect(clampWobble(0)).toBe(1);
    expect(clampWobble(250)).toBe(100);
  });
});
