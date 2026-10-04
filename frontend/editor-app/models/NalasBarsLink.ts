import { clampBarCount, clampBpm, clampPercent, clampWobble, DEFAULT_BARS, MAX_BAR_COUNT } from './NalasBars';
import type { Bar } from './NalasBars';

export const DEFAULT_BACKGROUND = '#1b1d20';
export const MAX_LABEL_LENGTH = 20;
export const DEFAULT_SETUP: BarsSetup = {
  count: MAX_BAR_COUNT,
  bars: [...DEFAULT_BARS],
  background: DEFAULT_BACKGROUND,
};

/** All four bars' settings are kept; `count` says how many are shown. */
export type BarsSetup = { count: number; bars: Bar[]; background: string };

/**
 * The setup as a link's query, for example
 * `bars=2&label=Strength&label=Speed&bpm=30,45&max=100,80&min=0,20&wobble=50,50&bg=1b1d20`.
 * Only the bars shown are written. Each label is its own `label=`, so labels can hold commas.
 */
export function setupToQuery({ count, bars, background }: BarsSetup): string {
  const shown = bars.slice(0, clampBarCount(count));
  const list = (pick: (bar: Bar) => number) => shown.map(pick).join(',');
  return [
    `bars=${shown.length}`,
    ...shown.map(bar => `label=${encodeURIComponent(bar.label)}`),
    `bpm=${list(bar => bar.bpm)}`,
    `max=${list(bar => bar.max)}`,
    `min=${list(bar => bar.min)}`,
    `wobble=${list(bar => bar.wobble)}`,
    `bg=${background.replace(/^#/, '').toLowerCase()}`,
  ].join('&');
}

/** Reads a setup from a link's query. Anything missing or invalid keeps its default. */
export function setupFromQuery(search: string): BarsSetup {
  const params = new URLSearchParams(search);
  const labels = params.getAll('label');
  const numbers = (key: string) => (params.get(key) ?? '').split(',');
  const bpms = numbers('bpm');
  const maxes = numbers('max');
  const mins = numbers('min');
  const wobbles = numbers('wobble');

  // A blank or non-numeric entry keeps the default instead of becoming 0.
  const read = (values: string[], index: number, clamp: (value: number) => number, fallback: number) => {
    const value = values[index]?.trim();
    return value && Number.isFinite(Number(value)) ? clamp(Number(value)) : fallback;
  };

  const bars = DEFAULT_BARS.map((bar, index) => ({
    label: labels[index] === undefined ? bar.label : labels[index].slice(0, MAX_LABEL_LENGTH),
    bpm: read(bpms, index, clampBpm, bar.bpm),
    max: read(maxes, index, clampPercent, bar.max),
    min: read(mins, index, clampPercent, bar.min),
    wobble: read(wobbles, index, clampWobble, bar.wobble),
  }));

  const colour = params.get('bg')?.trim().replace(/^#/, '') ?? '';
  const background = /^[0-9a-f]{6}$/i.test(colour) ? `#${colour.toLowerCase()}` : DEFAULT_BACKGROUND;
  const countText = params.get('bars')?.trim();
  const count = countText && Number.isFinite(Number(countText)) ? clampBarCount(Number(countText)) : MAX_BAR_COUNT;
  return { count, bars, background };
}

/** The query to show in the address bar; empty when everything is at its default. */
export function shareQuery(setup: BarsSetup): string {
  const query = setupToQuery(setup);
  return query === setupToQuery(DEFAULT_SETUP) ? '' : query;
}
