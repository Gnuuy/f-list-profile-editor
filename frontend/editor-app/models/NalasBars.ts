export type Bar = {
  label: string;
  /** Beats per minute. The white rises and falls once per beat; 0 stands still. */
  bpm: number;
  /** How far up the bar the white rises, 0–100. */
  depth: number;
  /** How much the bar bounces as the white turns at the top, 1–100. */
  wobble: number;
};

export const DEFAULT_BARS: readonly Bar[] = [
  { label: '1', bpm: 30, depth: 100, wobble: 50 },
  { label: '2', bpm: 45, depth: 100, wobble: 50 },
  { label: '3', bpm: 60, depth: 100, wobble: 50 },
  { label: '4', bpm: 80, depth: 100, wobble: 50 },
];

// GIF frame delays are whole hundredths of a second, and 2/100 s is the
// shortest every browser plays at its real speed.
export const GIF_FRAME_DELAY_MS = 20;
export const GIF_FRAMES_PER_SECOND = 1000 / GIF_FRAME_DELAY_MS;

const MIN_LOOP_SECONDS = 1;
const MAX_LOOP_SECONDS = 12;
// How far a bar's BPM may move so all bars loop together.
const BPM_TOLERANCE = 3;

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

export type LoopPlan = {
  frames: number;
  seconds: number;
  /** Each bar's beats per second, so each finishes a whole number of beats per loop. */
  beatsPerSecond: number[];
  /** The largest change to any bar's BPM. */
  largestChange: number;
};

/**
 * Finds the shortest loop in which every bar completes a whole number of
 * beats, nudging BPMs by at most BPM_TOLERANCE. If no loop up to
 * MAX_LOOP_SECONDS is that close, it takes the closest one.
 */
export function planLoop(bars: readonly Pick<Bar, 'bpm'>[]): LoopPlan {
  const wanted = bars.map(bar => clampBpm(bar.bpm) / 60);
  let best: LoopPlan | null = null;

  for (let frames = MIN_LOOP_SECONDS * GIF_FRAMES_PER_SECOND; frames <= MAX_LOOP_SECONDS * GIF_FRAMES_PER_SECOND; frames += 1) {
    const seconds = frames / GIF_FRAMES_PER_SECOND;
    const beatsPerSecond = wanted.map(rate => (rate === 0 ? 0 : Math.max(1, Math.round(rate * seconds)) / seconds));
    const largestChange = Math.max(0, ...beatsPerSecond.map((rate, index) => Math.abs(rate - wanted[index]) * 60));
    const plan = { frames, seconds, beatsPerSecond, largestChange };
    if (largestChange <= BPM_TOLERANCE) return plan;
    if (!best || largestChange < best.largestChange) best = plan;
  }
  return best!;
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
 * The white rises and falls in the first `depth` percent of each beat, so it
 * moves at the same speed whatever the fill, then rests at the bottom until
 * the next beat. Wobble 100 is the strongest bounce, and lower values scale
 * all of it down evenly. Everything repeats every beat, so loops never jump.
 */
export function barPose(beat: number, { bpm, depth, wobble }: Pick<Bar, 'bpm' | 'depth' | 'wobble'>): BarPose {
  const share = clampPercent(depth) / 100;
  // Standing still: the bar shows its fill.
  if (clampBpm(bpm) === 0) return { fill: share, lift: 0, sway: 0, tilt: 0, scaleX: 1, scaleY: 1 };

  const strength = clampWobble(wobble) / 100;
  // Sway and tilt follow the beat, so they carry on while the white rests.
  const inBeat = beat - Math.floor(beat);
  const angle = inBeat * Math.PI * 2;
  const sway = Math.sin(angle * 2) * strength * 3;
  const tilt = Math.sin(angle * 3) * strength * 2;

  if (inBeat >= share) return { fill: 0, lift: 0, sway, tilt, scaleX: 1, scaleY: 1 };

  // From empty, up to the fill and back down to empty.
  const phase = -Math.PI / 2 + (inBeat / share) * Math.PI * 2;
  const sine = Math.sin(phase);
  const wave = (sine + 1) / 2;
  // Extra movement as the white turns at the top: near 1 there, 0 elsewhere.
  const top = Math.max(0, sine) ** 16;

  const fillBounce = Math.sin(phase * 4) * top * strength * 0.035;
  return {
    fill: Math.max(0, Math.min(1, wave + fillBounce)) * share,
    lift: Math.abs(Math.sin(phase * 4.5)) * top * strength * 24,
    sway,
    tilt,
    scaleX: 1 + top * strength * 0.26,
    scaleY: 1 - top * strength * 0.2,
  };
}

/** Every bar's pose at a time in the loop, in seconds. */
export function posesAt(bars: readonly Bar[], plan: LoopPlan, time: number): BarPose[] {
  return bars.map((bar, index) => (
    barPose(startOffset(index) + plan.beatsPerSecond[index] * time, bar)
  ));
}
