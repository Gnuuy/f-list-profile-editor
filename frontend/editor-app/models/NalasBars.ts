export type Bar = {
  label: string;
  /** Beats per minute: the white rises and falls once per beat. 0 stands still. */
  bpm: number;
  /** How far up the white rises, 0–100. */
  max: number;
  /** How far down the white falls, 0–100. */
  min: number;
  /** How much the bar bounces as the white turns at the top, 1–100. */
  wobble: number;
};

export const DEFAULT_BARS: readonly Bar[] = [
  { label: '1', bpm: 30, max: 100, min: 0, wobble: 50 },
  { label: '2', bpm: 45, max: 100, min: 0, wobble: 50 },
  { label: '3', bpm: 60, max: 100, min: 0, wobble: 50 },
  { label: '4', bpm: 80, max: 100, min: 0, wobble: 50 },
];

export const MIN_BAR_COUNT = 1;
export const MAX_BAR_COUNT = DEFAULT_BARS.length;

export function clampBarCount(value: number): number {
  return Number.isFinite(value) ? Math.max(MIN_BAR_COUNT, Math.min(MAX_BAR_COUNT, Math.round(value))) : MAX_BAR_COUNT;
}

export function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function clampWobble(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(100, value)) : 1;
}

/** Any BPM from 0 up. */
export function clampBpm(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Each bar starts a little later in its beat than the one before, so they don't move in step. */
export function startOffset(index: number): number {
  return index * 0.12;
}

export type BarPose = {
  /** How full the bar is, 0–1. */
  fill: number;
  /** Pixels the whole bar hops up. */
  lift: number;
  /** Pixels the bar sways sideways. */
  sway: number;
  /** Degrees the bar tilts. */
  tilt: number;
  scaleX: number;
  scaleY: number;
};

/**
 * The bar at a point in its beats: 1.5 is halfway through the second beat.
 * Every beat, the white rises from its min to its max and falls back, taking
 * the whole beat however far apart they are. Wobble 100 is the strongest
 * bounce, and lower values scale all of it down evenly.
 */
export function barPose(beat: number, { bpm, max, min, wobble }: Pick<Bar, 'bpm' | 'max' | 'min' | 'wobble'>): BarPose {
  const low = clampPercent(min) / 100;
  const high = Math.max(clampPercent(max) / 100, low);
  // Standing still: the bar shows its max.
  if (clampBpm(bpm) === 0) return { fill: high, lift: 0, sway: 0, tilt: 0, scaleX: 1, scaleY: 1 };

  const strength = clampWobble(wobble) / 100;
  // Starts each beat at the min, reaches the max halfway through.
  const phase = -Math.PI / 2 + (beat - Math.floor(beat)) * Math.PI * 2;
  const sine = Math.sin(phase);
  const wave = (sine + 1) / 2;
  // Extra movement as the white turns at the top: near 1 there, 0 elsewhere.
  const top = Math.max(0, sine) ** 16;
  const fillBounce = Math.sin(phase * 4) * top * strength * 0.035;

  return {
    fill: low + Math.max(0, Math.min(1, wave + fillBounce)) * (high - low),
    lift: Math.abs(Math.sin(phase * 4.5)) * top * strength * 24,
    sway: Math.sin(phase * 2) * strength * 3,
    tilt: Math.sin(phase * 3) * strength * 2,
    scaleX: 1 + top * strength * 0.26,
    scaleY: 1 - top * strength * 0.2,
  };
}

/** Every bar's pose a number of seconds in. */
export function posesAt(bars: readonly Bar[], seconds: number): BarPose[] {
  return bars.map((bar, index) => barPose(startOffset(index) + (clampBpm(bar.bpm) / 60) * seconds, bar));
}
