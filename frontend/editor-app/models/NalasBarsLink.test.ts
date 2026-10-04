import { describe, expect, it } from 'vitest';

import { DEFAULT_BARS } from './NalasBars';
import { DEFAULT_BACKGROUND, DEFAULT_SETUP, setupFromQuery, setupToQuery, shareQuery } from './NalasBarsLink';

const SETUP = {
  count: 4,
  bars: [
    { label: 'Strength, mostly', bpm: 87.5, max: 70, min: 10, wobble: 100 },
    { label: 'Ünïcödé & #1 + 50%', bpm: 0, max: 0, min: 0, wobble: 1 },
    { label: '', bpm: 600, max: 100, min: 55, wobble: 33 },
    { label: '?=&,|', bpm: 45, max: 25, min: 0, wobble: 66 },
  ],
  background: '#ff00aa',
};

describe("Nala's bars links", () => {
  it('brings back exactly the same setup', () => {
    expect(setupFromQuery(setupToQuery(SETUP))).toEqual(SETUP);
    expect(setupFromQuery(`?${setupToQuery(SETUP)}`)).toEqual(SETUP);
  });

  it('writes readable numbers and colours', () => {
    expect(setupToQuery(DEFAULT_SETUP)).toBe(
      'bars=4&label=1&label=2&label=3&label=4&bpm=30,45,60,80&max=100,100,100,100&min=0,0,0,0&wobble=50,50,50,50&bg=1b1d20',
    );
  });

  it('only writes the bars shown, and brings back how many', () => {
    const query = setupToQuery({ ...SETUP, count: 2 });
    expect(query).toBe('bars=2&label=Strength%2C%20mostly&label=%C3%9Cn%C3%AFc%C3%B6d%C3%A9%20%26%20%231%20%2B%2050%25'
      + '&bpm=87.5,0&max=70,0&min=10,0&wobble=100,1&bg=ff00aa');

    const opened = setupFromQuery(query);
    expect(opened.count).toBe(2);
    expect(opened.bars.slice(0, 2)).toEqual(SETUP.bars.slice(0, 2));
    // Bars that weren't shown come back as defaults, ready to switch on.
    expect(opened.bars.slice(2)).toEqual(DEFAULT_BARS.slice(2));
  });

  it('keeps defaults for anything missing or invalid', () => {
    const { count, bars, background } = setupFromQuery(
      '?bars=&label=Only%20one&bpm=120,,abc&max=150,-5&min=-1,abc,30&wobble=0,500&bg=nope',
    );

    expect(count).toBe(4);
    expect(bars.map(bar => bar.label)).toEqual(['Only one', '2', '3', '4']);
    expect(bars.map(bar => bar.bpm)).toEqual([120, 45, 60, 80]);
    expect(bars.map(bar => bar.max)).toEqual([100, 0, 100, 100]);
    expect(bars.map(bar => bar.min)).toEqual([0, 0, 30, 0]);
    expect(bars.map(bar => bar.wobble)).toEqual([1, 100, 50, 50]);
    expect(background).toBe(DEFAULT_BACKGROUND);
    expect(setupFromQuery('?bars=9').count).toBe(4);
    expect(setupFromQuery('?bars=0').count).toBe(1);
  });

  it('fills in defaults for settings a link leaves out', () => {
    const opened = setupFromQuery('?label=A&bpm=90&max=60&wobble=20&bg=2e2828');
    expect(opened.count).toBe(4);
    expect(opened.bars[0]).toEqual({ label: 'A', bpm: 90, max: 60, min: 0, wobble: 20 });
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
