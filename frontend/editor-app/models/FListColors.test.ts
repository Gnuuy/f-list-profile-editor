import { describe, expect, it } from 'vitest';

import {
  F_LIST_COLORS,
  F_LIST_COLOR_NAMES,
  getFListColorValue,
  getFListColourByShortcut,
} from './FListColors';

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

  it('gives every colour a unique one-key menu shortcut', () => {
    const choices = F_LIST_COLOR_NAMES.map(name => getFListColourByShortcut(
      ({ red: 'r', orange: 'o', yellow: 'y', green: 'g', cyan: 'c', blue: 'b', purple: 'u', pink: 'p', brown: 'n', black: 'k', white: 'w', gray: 'a' } as const)[name],
    ));

    expect(choices.map(choice => choice?.name)).toEqual(F_LIST_COLOR_NAMES);
  });
});
