import {
  activePatterns,
  clampBarCount,
  clampEase,
  clampImpacts,
  clampPercent,
  clampRandomness,
  clampRepeats,
  clampSpeed,
  DEFAULT_BAR_COUNT,
  DEFAULT_BARS,
  DEFAULT_PATTERN,
  MAX_VARIATIONS,
} from './NalasBars';
import type { Bar, Pattern } from './NalasBars';

export const DEFAULT_BACKGROUND = '#1b1d20';
export const MAX_LABEL_LENGTH = 20;

/** All four bars' settings are kept; `count` says how many are shown. */
export type BarsSetup = { count: number; bars: Bar[]; randomness: number; background: string };

export const DEFAULT_SETUP: BarsSetup = {
  count: DEFAULT_BAR_COUNT,
  bars: [...DEFAULT_BARS],
  randomness: 0,
  background: DEFAULT_BACKGROUND,
};

// A pattern in a link: its numbers in this order, separated by commas.
const PATTERN_FIELDS: ReadonlyArray<[keyof Pattern, (value: number) => number]> = [
  ['repeats', clampRepeats],
  ['rise', clampSpeed],
  ['fall', clampSpeed],
  ['max', clampPercent],
  ['min', clampPercent],
  ['riseStart', clampEase],
  ['riseEnd', clampEase],
  ['fallStart', clampEase],
  ['fallEnd', clampEase],
];
const PATTERN_SEPARATOR = '~';
// Links from before patterns always eased in and out of each stroke.
const OLD_LINK_PATTERN: Pattern = { ...DEFAULT_PATTERN, riseStart: 100, riseEnd: 100, fallStart: 100, fallEnd: 100 };

/**
 * The setup as a link's query, for example
 * `bars=2&label=Fast&label=Slow&jolt=50,0&wobble=20,50&crack=1,0&broken=0,1&impacts=1,3&b1=4,120,120,100,0,100,100,100,100~2,30,30,100,0,0,0,0,0&b2=…&random=10&bg=1b1d20`.
 * Only the bars shown are written. Each `bN` holds that bar's patterns, separated by `~`.
 */
export function setupToQuery({ count, bars, randomness, background }: BarsSetup): string {
  const shown = bars.slice(0, clampBarCount(count));
  return [
    `bars=${shown.length}`,
    ...shown.map(bar => `label=${encodeURIComponent(bar.label)}`),
    `jolt=${shown.map(bar => bar.jolt).join(',')}`,
    `wobble=${shown.map(bar => bar.wobble).join(',')}`,
    `crack=${shown.map(bar => (bar.crack ? 1 : 0)).join(',')}`,
    `broken=${shown.map(bar => (bar.broken ? 1 : 0)).join(',')}`,
    `impacts=${shown.map(bar => bar.impacts).join(',')}`,
    ...shown.map((bar, index) => `b${index + 1}=${activePatterns(bar)
      .map(pattern => PATTERN_FIELDS.map(([key]) => pattern[key]).join(','))
      .join(PATTERN_SEPARATOR)}`),
    `random=${randomness}`,
    `bg=${background.replace(/^#/, '').toLowerCase()}`,
  ].join('&');
}

// A blank or non-numeric entry keeps its default instead of becoming 0.
function read(value: string | undefined, clamp: (value: number) => number, fallback: number): number {
  const text = value?.trim();
  return text && Number.isFinite(Number(text)) ? clamp(Number(text)) : fallback;
}

function patternsFrom(text: string, fallback: Pattern): Pattern[] {
  return text.split(PATTERN_SEPARATOR).slice(0, MAX_VARIATIONS + 1).map(entry => {
    const values = entry.split(',');
    const pattern = { ...fallback };
    PATTERN_FIELDS.forEach(([key, clamp], index) => {
      pattern[key] = read(values[index], clamp, fallback[key]);
    });
    return pattern;
  });
}

/** Reads a setup from a link's query. Anything missing or invalid keeps its default. */
export function setupFromQuery(search: string): BarsSetup {
  const params = new URLSearchParams(search);
  const labels = params.getAll('label');
  const list = (key: string) => (params.get(key) ?? '').split(',');
  const jolts = list('jolt');
  const wobbles = list('wobble');
  const cracks = list('crack');
  const breaks = list('broken');
  const impacts = list('impacts');
  // Links from before patterns had one speed, max and min per bar, and one
  // wobble that covered the jolt as well.
  const oldBpms = list('bpm');
  const oldMaxes = list('max');
  const oldMins = list('min');
  const oldLink = !params.has('jolt');

  const bars = DEFAULT_BARS.map((bar, index): Bar => {
    const wobble = read(wobbles[index], clampPercent, bar.wobble);
    const encoded = params.get(`b${index + 1}`);
    let patterns: Pattern[];
    if (encoded) {
      patterns = patternsFrom(encoded, bar.patterns[0]);
    } else if ([oldBpms, oldMaxes, oldMins].some(values => values[index]?.trim())) {
      const bpm = read(oldBpms[index], value => Math.max(0, value), bar.patterns[0].rise);
      const max = read(oldMaxes[index], clampPercent, bar.patterns[0].max);
      const min = read(oldMins[index], clampPercent, bar.patterns[0].min);
      // 0 BPM stood still at its max.
      patterns = [bpm === 0
        ? { ...OLD_LINK_PATTERN, max, min: max }
        : { ...OLD_LINK_PATTERN, rise: clampSpeed(bpm), fall: clampSpeed(bpm), max, min }];
    } else {
      patterns = bar.patterns.map(pattern => ({ ...pattern }));
    }
    return {
      label: labels[index] === undefined ? bar.label : labels[index].slice(0, MAX_LABEL_LENGTH),
      jolt: oldLink ? wobble : read(jolts[index], clampPercent, bar.jolt),
      wobble,
      crack: cracks[index]?.trim() === '1',
      broken: breaks[index]?.trim() === '1',
      impacts: read(impacts[index], clampImpacts, bar.impacts),
      variations: patterns.length - 1,
      patterns,
    };
  });

  const colour = params.get('bg')?.trim().replace(/^#/, '') ?? '';
  return {
    count: read(params.get('bars') ?? undefined, clampBarCount, DEFAULT_BAR_COUNT),
    bars,
    randomness: read(params.get('random') ?? undefined, clampRandomness, 0),
    background: /^[0-9a-f]{6}$/i.test(colour) ? `#${colour.toLowerCase()}` : DEFAULT_BACKGROUND,
  };
}

/** The query to show in the address bar; empty when everything is at its default. */
export function shareQuery(setup: BarsSetup): string {
  const query = setupToQuery(setup);
  return query === setupToQuery(DEFAULT_SETUP) ? '' : query;
}
