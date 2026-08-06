import { describe, expect, it } from 'vitest';

import {
  getColourMenuPosition,
  getNextColourOptionIndex,
} from './ColourMenuModel';

describe('colour menu model', () => {
  it('keeps the menu inside the viewport and flips it above the toolbar when needed', () => {
    expect(getColourMenuPosition(
      { top: 700, bottom: 730, left: 950 },
      { width: 300, height: 260 },
      { width: 1_100, height: 800 },
    )).toEqual({ top: 432, left: 788 });

    expect(getColourMenuPosition(
      { top: 40, bottom: 70, left: 2 },
      { width: 300, height: 260 },
      { width: 1_100, height: 800 },
    )).toEqual({ top: 78, left: 12 });
  });

  it('moves through a three-column palette with arrows, Home, and End', () => {
    expect(getNextColourOptionIndex(1, 'ArrowRight', 12)).toBe(2);
    expect(getNextColourOptionIndex(0, 'ArrowLeft', 12)).toBe(11);
    expect(getNextColourOptionIndex(2, 'ArrowDown', 12)).toBe(5);
    expect(getNextColourOptionIndex(5, 'ArrowUp', 12)).toBe(2);
    expect(getNextColourOptionIndex(4, 'Home', 12)).toBe(0);
    expect(getNextColourOptionIndex(4, 'End', 12)).toBe(11);
    expect(getNextColourOptionIndex(4, 'Escape', 12)).toBeNull();
  });
});
