import { describe, expect, it } from 'vitest';

import { barPose, clampBarCount, clampBpm, clampPercent, clampWobble, posesAt } from './NalasBars';

const pose = (beat: number, bpm: number, { max = 100, min = 0, wobble = 100 } = {}) => barPose(beat, { bpm, max, min, wobble });

describe("Nala's bars motion", () => {
  it('rises from its min to its max and back once per beat', () => {
    expect(pose(0, 60).fill).toBeCloseTo(0, 9);
    expect(pose(0.5, 60).fill).toBeCloseTo(1, 9);
    expect(pose(1, 60).fill).toBeCloseTo(0, 9);
    expect(pose(0, 60, { max: 80, min: 30 }).fill).toBeCloseTo(0.3, 9);
    expect(pose(0.5, 60, { max: 80, min: 30 }).fill).toBeCloseTo(0.8, 9);
  });

  it('takes the whole beat whatever its min and max', () => {
    // The top is always halfway through the beat, and the white never rests.
    for (const range of [{ max: 100, min: 0 }, { max: 50, min: 0 }, { max: 60, min: 40 }]) {
      expect(pose(0.5, 60, range).fill).toBeCloseTo(range.max / 100, 9);
      expect(pose(0.25, 60, range).fill).toBeCloseTo((range.max + range.min) / 200, 9);
      expect(pose(0.75, 60, range).fill).toBeCloseTo((range.max + range.min) / 200, 9);
    }
  });

  it('fills as many times a minute as its BPM', () => {
    const bars = [{ label: '', bpm: 120, max: 40, min: 10, wobble: 1 }];
    let tops = 0;
    let previous = posesAt(bars, 0)[0].fill;
    let rising = false;
    for (let step = 1; step <= 6000; step += 1) {
      const { fill } = posesAt(bars, step / 100)[0];
      if (rising && fill < previous) tops += 1;
      rising = fill > previous;
      previous = fill;
    }
    // 60 seconds at 120 BPM.
    expect(tops).toBe(120);
  });

  it('stays between its min and max, wobble included', () => {
    for (let beat = 0; beat < 1; beat += 0.001) {
      const { fill } = pose(beat, 110, { max: 80, min: 30 });
      expect(fill).toBeGreaterThanOrEqual(0.3);
      expect(fill).toBeLessThanOrEqual(0.8);
    }
  });

  it('stands still when its min reaches its max', () => {
    expect(pose(0.3, 60, { max: 40, min: 40 }).fill).toBe(0.4);
    expect(pose(0.7, 60, { max: 20, min: 60 }).fill).toBe(0.6);
  });

  it('shows a still bar at its max at 0 BPM', () => {
    expect(pose(0.3, 0, { max: 70 })).toMatchObject({ fill: 0.7, lift: 0, sway: 0, tilt: 0 });
  });

  it('bounces as much as its wobble, up to the old strongest at 100', () => {
    const strongest = pose(0.52, 60);
    const phase = -Math.PI / 2 + 0.52 * Math.PI * 2;
    const top = Math.max(0, Math.sin(phase)) ** 16;
    expect(strongest.lift).toBeCloseTo(Math.abs(Math.sin(phase * 4.5)) * top * 24, 9);
    expect(strongest.scaleX).toBeCloseTo(1 + top * 0.26, 9);

    const half = pose(0.52, 60, { wobble: 50 });
    expect(half.lift).toBeCloseTo(strongest.lift / 2, 9);
    expect(half.sway).toBeCloseTo(strongest.sway / 2, 9);
    expect(half.tilt).toBeCloseTo(strongest.tilt / 2, 9);
    expect(half.scaleX - 1).toBeCloseTo((strongest.scaleX - 1) / 2, 9);

    // The BPM doesn't change how much it bounces.
    expect(pose(0.52, 200, { wobble: 50 }).lift).toBeCloseTo(half.lift, 9);
  });

  it('allows 1 to 4 bars', () => {
    expect([0, 1, 2.6, 4, 9, Number.NaN].map(clampBarCount)).toEqual([1, 1, 3, 4, 4, 4]);
  });

  it('allows any BPM from 0 up, min and max of 0–100 and wobbles of 1–100', () => {
    expect(clampBpm(-5)).toBe(0);
    expect(clampBpm(2500)).toBe(2500);
    expect(clampBpm(Number.NaN)).toBe(0);
    expect(clampPercent(140)).toBe(100);
    expect(clampWobble(0)).toBe(1);
    expect(clampWobble(250)).toBe(100);
  });
});
