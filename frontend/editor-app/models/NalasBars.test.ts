import { describe, expect, it } from 'vitest';

import {
  angularSpeed,
  barPose,
  clampSpeed,
  DEFAULT_BARS,
  GIF_FRAMES_PER_SECOND,
  planLoop,
  posesAt,
} from './NalasBars';

const SPEED_SETS = [
  [25, 40, 60, 80],
  [100, 100, 100, 100],
  [0, 40, 60, 80],
  [3, 51, 87, 99],
  [80, 81, 82, 83],
];

describe("Nala's bars loop", () => {
  it.each(SPEED_SETS)('makes every bar finish whole cycles: %o', (...speeds) => {
    const plan = planLoop(speeds);

    expect(plan.frames).toBe(Math.round(plan.seconds * GIF_FRAMES_PER_SECOND));
    for (const angular of plan.angularSpeeds) {
      const cycles = (angular * plan.seconds) / (Math.PI * 2);
      expect(cycles).toBeCloseTo(Math.round(cycles), 9);
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1);
    }
  });

  it.each(SPEED_SETS)('ends exactly where it starts: %o', (...speeds) => {
    const bars = speeds.map(speed => ({ label: '', speed }));
    const plan = planLoop(speeds);
    const start = posesAt(bars, plan, 0);
    const end = posesAt(bars, plan, plan.seconds);

    end.forEach((pose, index) => {
      for (const [key, value] of Object.entries(pose)) {
        expect(value).toBeCloseTo(start[index][key as keyof typeof pose], 9);
      }
    });
  });

  it('keeps speeds within 3 of what was set, and loops short when it can', () => {
    const plan = planLoop(DEFAULT_BARS.map(bar => bar.speed));
    expect(plan.largestChange).toBeLessThanOrEqual(3);
    expect(plan.seconds).toBe(5.84);

    // Bars at the same speed loop after one cycle each.
    const same = planLoop([25, 25, 25, 25]);
    expect(same.angularSpeeds.map(angular => Math.round((angular * same.seconds) / (Math.PI * 2)))).toEqual([1, 1, 1, 1]);
    expect(same.seconds).toBeLessThanOrEqual((Math.PI * 2) / angularSpeed(25) + 0.2);
  });

  it('copes with a bar at speed 0, which takes 25 seconds to fill once', () => {
    const plan = planLoop([0, 0, 0, 0]);
    expect(plan.seconds).toBeLessThanOrEqual(12);
    expect(plan.largestChange).toBeLessThanOrEqual(3);
  });
});

describe("Nala's bars motion", () => {
  it('fills from empty to full', () => {
    expect(barPose(-Math.PI / 2, 25).fill).toBeCloseTo(0, 9);
    expect(barPose(Math.PI / 2, 25).fill).toBeCloseTo(1, 9);
    expect(barPose(0, 25).fill).toBeCloseTo(0.5, 9);
  });

  it('only bounces the whole bar above speed 80', () => {
    expect(barPose(Math.PI / 2 + 0.1, 80)).toMatchObject({ lift: 0, sway: 0, tilt: 0, scaleX: 1, scaleY: 1 });
    const fast = barPose(Math.PI / 2 + 0.1, 100);
    expect(fast.lift).toBeGreaterThan(0);
    expect(fast.scaleX).toBeGreaterThan(1);
  });

  it('keeps the fill between empty and full', () => {
    for (let phase = 0; phase < Math.PI * 2; phase += 0.01) {
      const { fill } = barPose(phase, 100);
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(1);
    }
  });

  it('clamps speeds to 0–100', () => {
    expect(clampSpeed(-5)).toBe(0);
    expect(clampSpeed(140)).toBe(100);
    expect(clampSpeed(Number.NaN)).toBe(0);
  });
});
