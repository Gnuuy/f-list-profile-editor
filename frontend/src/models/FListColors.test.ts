import { describe, expect, it } from 'vitest';

import { F_LIST_COLORS, getFListColorValue } from './FListColors';

describe('F-list website colours', () => {
  it('matches the named colour values from the website stylesheet', () => {
    expect(F_LIST_COLORS).toEqual({
      red: '#ff4444',
      orange: '#ffa500',
      yellow: '#ffff00',
      green: '#44ff44',
      cyan: '#00ffff',
      blue: '#1e90ff',
      purple: '#e2afff',
      pink: '#ffcbdb',
      brown: '#aa840c',
      black: '#000000',
      white: '#ffffff',
      gray: '#d3d3d3',
    });
  });

  it('accepts the website grey alias', () => {
    expect(getFListColorValue('grey')).toBe(F_LIST_COLORS.gray);
  });
});
