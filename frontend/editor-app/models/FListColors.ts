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

export const F_LIST_COLOR_SHORTCUTS: Record<FListColorName, string> = {
  red: 'R',
  orange: 'O',
  yellow: 'Y',
  green: 'G',
  cyan: 'C',
  blue: 'B',
  purple: 'U',
  pink: 'P',
  brown: 'N',
  black: 'K',
  white: 'W',
  gray: 'A',
};

export function getFListColourByShortcut(key: string) {
  const shortcut = key.toUpperCase();
  const name = F_LIST_COLOR_NAMES.find(candidate => (
    F_LIST_COLOR_SHORTCUTS[candidate] === shortcut
  ));
  return name ? { name, css: F_LIST_COLORS[name] } : null;
}

export function getFListColorValue(name: string): string | undefined {
  const normalized = name.toLowerCase() === 'grey' ? 'gray' : name.toLowerCase();
  return F_LIST_COLORS[normalized as FListColorName];
}
