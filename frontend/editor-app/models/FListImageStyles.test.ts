import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../global.css', import.meta.url), 'utf8');

describe('F-list inline image styles', () => {
  it('renders [img] assets as block images with an automatic line break', () => {
    expect(css).toMatch(
      /img\[data-placeholder-kind="inline"\]\s*\{[^}]*display: block;/s,
    );
  });

  it('keeps the 3px text descender F-list shows under an inline image', () => {
    expect(css).toMatch(
      /img\[data-placeholder-kind="inline"\]\s*\{[^}]*padding-bottom: 3px;/s,
    );
  });

  it('hides the caret line ProseMirror adds after an image that ends a line', () => {
    expect(css).toMatch(
      /img\[data-placeholder-kind="inline"\] \+ img\.ProseMirror-separator \+ br\.ProseMirror-trailingBreak[^{]*\{[^}]*display: none !important;/s,
    );
  });

  it('keeps block images aligned by their imported F-list alignment', () => {
    expect(css).toMatch(
      /img\[data-placeholder-kind="inline"\]\[data-align="center"\][^{]*\{[^}]*margin-left: auto;/s,
    );
    expect(css).toMatch(
      /img\[data-placeholder-kind="inline"\]\[data-align="right"\][^{]*\{[^}]*margin-left: auto;/s,
    );
  });
});
