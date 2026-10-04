/** One rhythm a bar can play: rise to `max`, fall to `min`, `repeats` times in a row. */
export type Pattern = {
  /** How many times in a row the white rises and falls. */
  repeats: number;
  /** Rise speed in BPM: rising takes half a beat at this tempo. */
  rise: number;
  /** Fall speed in BPM: falling takes half a beat at this tempo. */
  fall: number;
  /** How far up the white rises, 0–100. */
  max: number;
  /** How far down the white falls, 0–100. Equal to `max`, the bar pauses. */
  min: number;
  // How each stroke starts and ends: -100 accelerates (faster), 0 is a
  // steady speed, 100 dampens (slower, easing in or out).
  riseStart: number;
  riseEnd: number;
  fallStart: number;
  fallEnd: number;
};

export type Bar = {
  label: string;
  /** How much the bar hops and squashes as the white hits the top, 0–100. */
  jolt: number;
  /** How much the bar sways and tilts, 0–100. */
  wobble: number;
  /** Whether the top of the bar cracks when the white hits it. */
  crack: boolean;
  /** Whether the top breaks off once the white has slammed into it faster than BREAK_SPEED `impacts` times. */
  broken: boolean;
  /** How many slams it takes to break the top off, 1 or more. */
  impacts: number;
  /** How many patterns follow the first: 0 plays one pattern over and over. */
  variations: number;
  /** At least `variations + 1` patterns. Extra ones are kept for when variations go back up. */
  patterns: Pattern[];
};

export const MAX_VARIATIONS = 9;
export const MIN_SPEED = 1;
export const MAX_REPEATS = 99;
export const MAX_RANDOMNESS = 50;

export const DEFAULT_PATTERN: Pattern = {
  repeats: 1,
  rise: 60,
  fall: 60,
  max: 100,
  min: 0,
  riseStart: 100,
  riseEnd: 100,
  fallStart: 100,
  fallEnd: 100,
};

const defaultBar = (label: string, bpm: number): Bar => ({
  label,
  jolt: 50,
  wobble: 50,
  crack: false,
  broken: false,
  impacts: 1,
  variations: 0,
  patterns: [{ ...DEFAULT_PATTERN, rise: bpm, fall: bpm }],
});

export const DEFAULT_BARS: readonly Bar[] = [
  defaultBar('1', 30),
  defaultBar('2', 45),
  defaultBar('3', 60),
  defaultBar('4', 80),
];

export const MIN_BAR_COUNT = 1;
export const MAX_BAR_COUNT = DEFAULT_BARS.length;

const clampTo = (low: number, high: number, fallback: number) => (value: number) => (
  Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback
);

export const clampPercent = clampTo(0, 100, 0);
export const clampEase = clampTo(-100, 100, 0);
export const clampRandomness = clampTo(0, MAX_RANDOMNESS, 0);
/** Speeds have no upper limit. */
export const clampSpeed = clampTo(MIN_SPEED, Infinity, 60);

export function clampWhole(low: number, high: number, fallback: number) {
  return (value: number) => (Number.isFinite(value) ? Math.max(low, Math.min(high, Math.round(value))) : fallback);
}

export const clampBarCount = clampWhole(MIN_BAR_COUNT, MAX_BAR_COUNT, MAX_BAR_COUNT);
export const clampRepeats = clampWhole(1, MAX_REPEATS, 1);
export const clampVariations = clampWhole(0, MAX_VARIATIONS, 0);
/** Any whole number of impacts from 1 up. */
export const clampImpacts = clampWhole(1, Infinity, 1);

/** The patterns a bar plays, in order. */
export function activePatterns(bar: Bar): Pattern[] {
  return bar.patterns.slice(0, clampVariations(bar.variations) + 1);
}

/** Sets how many variations a bar has, adding copies of its last pattern when it needs more. */
export function withVariations(bar: Bar, variations: number): Bar {
  const count = clampVariations(variations);
  const patterns = [...bar.patterns];
  while (patterns.length < count + 1) patterns.push({ ...patterns[patterns.length - 1] });
  return { ...bar, variations: count, patterns };
}

/** How long a stroke takes at a speed: half a beat at that BPM. */
export function strokeSeconds(speed: number): number {
  return 30 / clampSpeed(speed);
}

/**
 * Progress through a stroke, 0 to 1, at a point 0 to 1 through its time.
 * Each end's speed is a share of the stroke's average speed: dampening slows
 * that end down (100 starts from a standstill), accelerating speeds it up.
 */
export function strokeProgress(time: number, startEase: number, endEase: number): number {
  const start = 1 - clampEase(startEase) / 100;
  const end = 1 - clampEase(endEase) / 100;
  const t = Math.max(0, Math.min(1, time));
  return (start + end - 2) * t ** 3 + (3 - 2 * start - end) * t ** 2 + start * t;
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
  /** Cracks at the top of the bar after the white hits it, or null. */
  crack: Crack | null;
  /** Once the top has broken off: how long ago, and the shape of the break. */
  broken: { since: number; seed: number } | null;
};

/** A rise faster than this, in BPM, that hits the top breaks it off. */
export const BREAK_SPEED = 80;

export type Crack = {
  /** Picks this impact's crack shape. */
  seed: number;
  /** How far the cracks have spread, 0–1. */
  spread: number;
  /** How visible they still are, 0–1. */
  fade: number;
};

// How quickly cracks spread from the point of impact.
const CRACK_SPREAD_SECONDS = 0.08;

type Cycle = {
  /** Counts the bar's cycles, for picking a crack shape. */
  number: number;
  start: number;
  riseSeconds: number;
  fallSeconds: number;
  /** Where the white starts: the previous pattern's min. */
  from: number;
  top: number;
  bottom: number;
  pattern: Pattern;
};

/** A repeatable random number from 0 to 1 for a bar's cycle. */
function randomFor(seed: number, cycle: number): number {
  let value = (seed ^ Math.imul(cycle + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

/** How much a stroke of this size counts as movement, so pauses don't jolt or wobble. */
function movement(distance: number): number {
  return Math.min(1, Math.abs(distance) / 0.1);
}

export type BarMotion = (seconds: number) => BarPose;

export type MotionOptions = {
  /** The bar's place in the row, which staggers its start and seeds its randomness. */
  index?: number;
  randomness?: number;
  /** Slams only count towards breaking from this many seconds in: when Broken was switched on. */
  countSlamsFrom?: number;
};

/**
 * A bar's movement over time: it plays each of its patterns `repeats` times in
 * turn, then starts over. Randomness stretches or shortens each cycle by up to
 * that percentage, the same way every time, so bars drift apart.
 */
export function createBarMotion(bar: Bar, { index = 0, randomness = 0, countSlamsFrom = 0 }: MotionOptions = {}): BarMotion {
  const patterns = activePatterns(bar);
  const jolt = clampPercent(bar.jolt) / 100;
  const wobble = clampPercent(bar.wobble) / 100;
  const spread = clampRandomness(randomness) / 100;
  const seed = Math.imul(index + 1, 2654435761) >>> 0;
  const lowOf = (pattern: Pattern) => clampPercent(pattern.min) / 100;
  const highOf = (pattern: Pattern) => Math.max(clampPercent(pattern.max) / 100, lowOf(pattern));

  const cycleAt = (number: number, start: number, patternIndex: number, from: number): Cycle => {
    const pattern = patterns[patternIndex];
    const stretch = 1 + spread * (randomFor(seed, number) * 2 - 1);
    return {
      number,
      start,
      riseSeconds: strokeSeconds(pattern.rise) * stretch,
      fallSeconds: strokeSeconds(pattern.fall) * stretch,
      from,
      top: highOf(pattern),
      bottom: lowOf(pattern),
      pattern,
    };
  };

  // Walks forward cycle by cycle, remembering where it got to, so playing
  // on is quick. Going back in time starts again from the beginning.
  const first = () => ({
    number: 0,
    patternIndex: 0,
    repeat: 0,
    cycle: cycleAt(0, 0, 0, lowOf(patterns[patterns.length - 1])),
    /** When the top broke off, if it has. */
    brokeAt: null as number | null,
    /** Slams into the top in the cycles already played. */
    slams: 0,
  });
  let state = first();
  // Each bar starts a little later in its first cycle than the one before, so they don't move in step.
  const offset = index * 0.12 * (state.cycle.riseSeconds + state.cycle.fallSeconds);
  // When a cycle's rise slams into the top hard enough to break it, if that's
  // after Broken was switched on.
  const impactsToBreak = clampImpacts(bar.impacts);
  const slam = (cycle: Cycle) => {
    const impact = cycle.start + cycle.riseSeconds;
    // The small allowance keeps a rise from 90 to 100 counting, despite rounding.
    const hard = clampSpeed(cycle.pattern.rise) > BREAK_SPEED && cycle.top >= 0.9 && cycle.top - cycle.from >= 0.1 - 1e-9;
    return bar.broken && hard && impact >= countSlamsFrom + offset ? impact : null;
  };

  // Counts a finished cycle's slam, breaking the top off on the last one it takes.
  const countSlam = (before: { brokeAt: number | null; slams: number }, impact: number | null) => {
    const slams = before.slams + (impact === null ? 0 : 1);
    return { slams, brokeAt: before.brokeAt ?? (impact !== null && slams === impactsToBreak ? impact : null) };
  };

  return seconds => {
    const time = Math.max(0, seconds + offset);
    if (time < state.cycle.start) state = first();
    while (time >= state.cycle.start + state.cycle.riseSeconds + state.cycle.fallSeconds) {
      const { cycle } = state;
      let { patternIndex, repeat } = state;
      repeat += 1;
      if (repeat >= clampRepeats(patterns[patternIndex].repeats)) {
        repeat = 0;
        patternIndex = (patternIndex + 1) % patterns.length;
      }
      const number = state.number + 1;
      state = {
        number,
        patternIndex,
        repeat,
        cycle: cycleAt(number, cycle.start + cycle.riseSeconds + cycle.fallSeconds, patternIndex, cycle.bottom),
        ...countSlam(state, slam(cycle)),
      };
    }
    const impact = slam(state.cycle);
    // The breaking slam can be in the cycle playing now.
    if (state.brokeAt === null && impact !== null && time >= impact && state.slams + 1 === impactsToBreak) {
      state.brokeAt = impact;
    }
    const pose = poseInCycle(state.cycle, time - state.cycle.start, jolt, wobble, bar.crack ? seed : null);
    return state.brokeAt === null ? pose : { ...pose, broken: { since: time - state.brokeAt, seed } };
  };
}

function poseInCycle(
  cycle: Cycle,
  local: number,
  joltStrength: number,
  wobbleStrength: number,
  crackSeed: number | null,
): BarPose {
  const { riseSeconds, fallSeconds, from, top, bottom, pattern } = cycle;
  const rising = local < riseSeconds;
  const fill = rising
    ? from + (top - from) * strokeProgress(local / riseSeconds, pattern.riseStart, pattern.riseEnd)
    : top + (bottom - top) * strokeProgress((local - riseSeconds) / fallSeconds, pattern.fallStart, pattern.fallEnd);

  // The jolt: a hop, a squash and a quiver of the white as it turns at the
  // top. `around` runs from -0.5 at the start of the rise, through 0 at the
  // top, to 0.5 at the end of the fall.
  const around = rising ? (local - riseSeconds) / (2 * riseSeconds) : (local - riseSeconds) / (2 * fallSeconds);
  const nearTop = Math.max(0, Math.cos(around * Math.PI * 2)) ** 16;
  const jolt = joltStrength * movement(top - from) * nearTop;
  const quiver = Math.sin(around * Math.PI * 8) * jolt * 0.035 * (rising ? top - from : top - bottom);
  const lowest = Math.min(from, bottom, top);

  // The wobble: sway and tilt through the whole cycle.
  const angle = (local / (riseSeconds + fallSeconds)) * Math.PI * 2;
  const wobble = wobbleStrength * movement(Math.max(Math.abs(top - from), top - bottom));

  return {
    fill: Math.max(lowest, Math.min(top, fill + quiver)),
    lift: jolt === 0 ? 0 : Math.abs(Math.sin(4.5 * (Math.PI / 2 + around * Math.PI * 2))) * jolt * 24,
    sway: wobble === 0 ? 0 : Math.sin(angle * 2) * wobble * 3,
    tilt: wobble === 0 ? 0 : Math.sin(angle * 3) * wobble * 2,
    scaleX: 1 + jolt * 0.26,
    scaleY: 1 - jolt * 0.2,
    crack: rising || crackSeed === null ? null : crackAfterImpact(cycle, local - riseSeconds, crackSeed),
    broken: null,
  };
}

/**
 * Cracks spread from the top as the white hits it, then fade while it falls,
 * gone well before it rises again. The white has to reach the top: from a Max
 * of 90 they start to show, at 100 fully. Each impact cracks differently.
 */
function crackAfterImpact(cycle: Cycle, sinceImpact: number, seed: number): Crack | null {
  const hit = Math.max(0, Math.min(1, (cycle.top - 0.9) / 0.1)) * movement(cycle.top - cycle.from);
  const falling = sinceImpact / cycle.fallSeconds;
  const fading = Math.max(0, Math.min(1, (falling - 0.4) / 0.5));
  const fade = hit * (1 - fading * fading * (3 - 2 * fading));
  if (fade <= 0) return null;
  return {
    seed: Math.floor(randomFor(seed ^ 0x5bd1e995, cycle.number) * 4294967296),
    spread: Math.min(1, sinceImpact / CRACK_SPREAD_SECONDS),
    fade,
  };
}
