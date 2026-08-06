export const F_LIST_COLORS = {
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
} as const;

export type FListColorName = keyof typeof F_LIST_COLORS;

export const F_LIST_COLOR_NAMES = Object.keys(F_LIST_COLORS) as FListColorName[];

export const F_LIST_COLOR_SWATCHES = F_LIST_COLOR_NAMES.map(name => ({
  name,
  css: F_LIST_COLORS[name],
}));

export function getFListColorValue(name: string): string | undefined {
  const normalized = name.toLowerCase() === 'grey' ? 'gray' : name.toLowerCase();
  return F_LIST_COLORS[normalized as FListColorName];
}
