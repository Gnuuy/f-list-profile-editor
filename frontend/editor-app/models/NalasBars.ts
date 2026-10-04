export type Bar = { label: string; speed: number };

export const DEFAULT_BARS: readonly Bar[] = [
  { label: '1', speed: 25 },
  { label: '2', speed: 40 },
  { label: '3', speed: 60 },
  { label: '4', speed: 80 },
];

// GIF frame delays are whole hundredths of a second, and 2/100 s is the
// shortest every browser plays at its real speed.
export const GIF_FRAME_DELAY_MS = 20;
export const GIF_FRAMES_PER_SECOND = 1000 / GIF_FRAME_DELAY_MS;

const MIN_LOOP_SECONDS = 1;
const MAX_LOOP_SECONDS = 12;
// How far, on the 0–100 speed scale, a bar's speed may move so all bars loop together.
const SPEED_TOLERANCE = 3;

export function clampSpeed(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** Radians per second. Low speeds stay gentle; 100 is fast. */
export function angularSpeed(speed: number): number {
  return 0.25 + speed * 0.1065;
}

function speedFromAngular(angular: number): number {
  return (angular - 0.25) / 0.1065;
}

/** Each bar starts at a different point, so they don't move in step. */
export function startPhase(index: number): number {
  return index * 0.75;
}

export type LoopPlan = {
  frames: number;
  seconds: number;
  /** Radians per second for each bar, so each finishes a whole number of cycles per loop. */
  angularSpeeds: number[];
  /** The largest change to any bar's speed, on the 0–100 scale. */
  largestChange: number;
};

/**
 * Finds the shortest loop in which every bar completes a whole number of
 * fill cycles, nudging speeds by at most SPEED_TOLERANCE. If no loop up to
 * MAX_LOOP_SECONDS is that close, it takes the closest one.
 */
export function planLoop(speeds: readonly number[]): LoopPlan {
  const cyclesPerSecond = speeds.map(speed => angularSpeed(clampSpeed(speed)) / (Math.PI * 2));
  let best: LoopPlan | null = null;

  for (let frames = MIN_LOOP_SECONDS * GIF_FRAMES_PER_SECOND; frames <= MAX_LOOP_SECONDS * GIF_FRAMES_PER_SECOND; frames += 1) {
    const seconds = frames / GIF_FRAMES_PER_SECOND;
    const angularSpeeds = cyclesPerSecond.map(rate => (Math.PI * 2 * Math.max(1, Math.round(rate * seconds))) / seconds);
    const largestChange = Math.max(0, ...angularSpeeds.map((angular, index) => (
      Math.abs(speedFromAngular(angular) - clampSpeed(speeds[index]))
    )));
    const plan = { frames, seconds, angularSpeeds, largestChange };
    if (largestChange <= SPEED_TOLERANCE) return plan;
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
 * The bar at a point in its cycle. Every wobble repeats a whole number of
 * times per fill cycle, so the pose at `phase + 2π` is the same as at `phase`
 * and loops never jump.
 */
export function barPose(phase: number, speed: number): BarPose {
  const sine = Math.sin(phase);
  // Smooth fill movement from empty to full and back.
  const wave = (sine + 1) / 2;
  // Extra movement near the ends: near 1 at full and empty, near 0 between.
  const edge = Math.abs(sine) ** 16;

  const fillBounceStrength = Math.max(0, speed - 50) / 50;
  const fillBounce = Math.sin(phase * 4) * edge * fillBounceStrength * 0.035;
  const fill = Math.max(0, Math.min(1, wave + fillBounce));

  // The whole bar starts bouncing above 80, more and more up to 100.
  const bounceLevel = speed <= 80 ? 0 : (speed - 80) / 20;
  if (bounceLevel === 0) return { fill, lift: 0, sway: 0, tilt: 0, scaleX: 1, scaleY: 1 };

  const strength = bounceLevel * bounceLevel;
  return {
    fill,
    lift: Math.abs(Math.sin(phase * 4.5)) * edge * (4 + strength * 20),
    sway: Math.sin(phase * 2) * strength * 3,
    tilt: Math.sin(phase * 3) * strength * 2,
    scaleX: 1 + edge * strength * 0.26,
    scaleY: 1 - edge * strength * 0.2,
  };
}

/** Every bar's pose at a time in the loop, in seconds. */
export function posesAt(bars: readonly Bar[], plan: LoopPlan, time: number): BarPose[] {
  return bars.map((bar, index) => (
    barPose(startPhase(index) + plan.angularSpeeds[index] * time, clampSpeed(bar.speed))
  ));
}
