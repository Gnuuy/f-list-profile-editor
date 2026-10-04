import { describe, expect, it } from 'vitest';

import { DEFAULT_BARS, DEFAULT_PATTERN } from './NalasBars';
import type { Bar, Pattern } from './NalasBars';
import { DEFAULT_BACKGROUND, DEFAULT_SETUP, setupFromQuery, setupToQuery, shareQuery } from './NalasBarsLink';

const pattern = (changes: Partial<Pattern>): Pattern => ({ ...DEFAULT_PATTERN, ...changes });
const bar = (label: string, patterns: Pattern[], changes: Partial<Bar> = {}): Bar => ({
  label, jolt: 50, wobble: 50, crack: false, variations: patterns.length - 1, patterns, ...changes,
});

const SETUP = {
  count: 4,
  bars: [
    bar('Strength, mostly', [
      pattern({ repeats: 4, rise: 180, fall: 140, max: 90, min: 10, riseStart: -25, riseEnd: 40, fallStart: 0, fallEnd: 100 }),
      pattern({ repeats: 2, rise: 30, fall: 30, max: 100, min: 0, riseStart: 0, riseEnd: 0, fallStart: 0, fallEnd: 0 }),
    ], { jolt: 100, wobble: 0, crack: true }),
    bar('Ünïcödé & #1 + 50%', [pattern({ rise: 87.5, fall: 600, max: 40, min: 40 })], { jolt: 0, wobble: 7 }),
    bar('', [pattern({}), pattern({ repeats: 3 }), pattern({ rise: 2 })]),
    bar('?=&,|~', [pattern({ rise: 45, fall: 45, max: 25 })]),
  ],
  randomness: 12,
  background: '#ff00aa',
};

describe("Nala's bars links", () => {
  it('brings back exactly the same setup, patterns and all', () => {
    expect(setupFromQuery(setupToQuery(SETUP))).toEqual(SETUP);
    expect(setupFromQuery(`?${setupToQuery(SETUP)}`)).toEqual(SETUP);
  });

  it('writes a readable link', () => {
    expect(setupToQuery(DEFAULT_SETUP)).toBe(
      'bars=4&label=1&label=2&label=3&label=4&jolt=50,50,50,50&wobble=50,50,50,50&crack=0,0,0,0'
      + '&b1=1,30,30,100,0,100,100,100,100&b2=1,45,45,100,0,100,100,100,100'
      + '&b3=1,60,60,100,0,100,100,100,100&b4=1,80,80,100,0,100,100,100,100&random=0&bg=1b1d20',
    );
  });

  it('only writes the bars shown and the patterns in use', () => {
    const query = setupToQuery({ ...SETUP, count: 1, bars: [{ ...SETUP.bars[0], variations: 0 }, ...SETUP.bars.slice(1)] });
    expect(query).toBe('bars=1&label=Strength%2C%20mostly&jolt=100&wobble=0&crack=1'
      + '&b1=4,180,140,90,10,-25,40,0,100&random=12&bg=ff00aa');

    const opened = setupFromQuery(query);
    expect(opened.count).toBe(1);
    expect(opened.bars[0].patterns).toEqual([SETUP.bars[0].patterns[0]]);
    // Bars that weren't shown come back as defaults, ready to switch on.
    expect(opened.bars.slice(1)).toEqual(DEFAULT_BARS.slice(1));
  });

  it('keeps defaults for anything missing or invalid', () => {
    const opened = setupFromQuery('?bars=&label=Only%20one&jolt=abc,500&wobble=-3&b1=0,0,,150,-5,300,x&random=99&bg=nope');
    expect(opened.count).toBe(4);
    expect(opened.bars.map(b => b.label)).toEqual(['Only one', '2', '3', '4']);
    expect(opened.bars.map(b => b.jolt)).toEqual([50, 100, 50, 50]);
    expect(opened.bars[0].wobble).toBe(0);
    expect(opened.bars[0].patterns).toEqual([pattern({ repeats: 1, rise: 1, fall: 30, max: 100, min: 0, riseStart: 100, riseEnd: 100 })]);
    expect(opened.randomness).toBe(50);
    expect(opened.background).toBe(DEFAULT_BACKGROUND);
    expect(setupFromQuery('?bars=9').count).toBe(4);
    expect(setupFromQuery('?bars=0').count).toBe(1);
  });

  it('opens links from before patterns the same as they looked', () => {
    const opened = setupFromQuery('?bars=2&label=A&label=B&bpm=90,0&max=60,70&min=10,0&wobble=20,80&bg=2e2828');
    expect(opened.count).toBe(2);
    expect(opened.bars[0]).toEqual(bar('A', [pattern({ rise: 90, fall: 90, max: 60, min: 10 })], { jolt: 20, wobble: 20 }));
    // 0 BPM stood still at its max.
    expect(opened.bars[1].patterns).toEqual([pattern({ max: 70, min: 70 })]);
    expect(opened.background).toBe('#2e2828');
  });

  it('gives the default setup when the link has none', () => {
    expect(setupFromQuery('')).toEqual(DEFAULT_SETUP);
  });

  it('cuts labels to 20 characters, like the label boxes', () => {
    expect(setupFromQuery(`?label=${'x'.repeat(30)}`).bars[0].label).toBe('x'.repeat(20));
  });

  it('keeps the address clean while nothing has changed', () => {
    expect(shareQuery(DEFAULT_SETUP)).toBe('');
    expect(shareQuery(SETUP)).toBe(setupToQuery(SETUP));
  });
});
