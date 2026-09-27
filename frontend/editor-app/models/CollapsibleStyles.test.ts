import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../global.css', import.meta.url), 'utf8');

describe('collapsible state styles', () => {
  it('scopes open and closed styles to each dropdown instead of leaking through nesting', () => {
    expect(css).toContain('.ProseMirror .collapse:not(.is-collapsed) > .collapse-header');
    expect(css).toContain('.ProseMirror .collapse.is-collapsed > .collapse-header');
    expect(css).not.toContain('.ProseMirror .collapse:not(.is-collapsed) .collapse-header');
    expect(css).not.toContain('.ProseMirror .collapse.is-collapsed .collapse-header');
  });

  it('preserves F-list label styling on closed nested dropdowns', () => {
    expect(css).toMatch(
      /\.ProseMirror \.collapse \.collapse\.is-collapsed > \.collapse-header\s*\{[^}]*color: #eeeeee;[^}]*text-shadow: #fff 0 1px 2px;/s,
    );
  });

  it("lets dark mode dropdowns show the surrounding text colour, like F-list's dark theme", () => {
    expect(css).toMatch(
      /\.dark \.ProseMirror \.collapse\.indentable:not\(\.is-collapsed\),\s*\.dark \.ProseMirror \.collapse:not\(\.is-collapsed\) > \.collapse-header\s*\{[^}]*color: inherit;/s,
    );
    expect(css).toMatch(
      /\.dark \.ProseMirror \.collapse\.is-collapsed > \.collapse-header\s*\{[^}]*color: inherit;/s,
    );
  });

  it('recreates the header-owned 25px body inset used by F-list', () => {
    expect(css).toMatch(
      /\.collapse-body[^}]*\{[^}]*margin: 10px 10px 10px 25px;/s,
    );
    expect(css).not.toContain('margin-left: calc(2px + 3em');
  });

  it('removes the internal header line and title shadow while expanded', () => {
    expect(css).toMatch(
      /\.collapse:not\(\.is-collapsed\) > \.collapse-header\s*\{[^}]*text-shadow: none;[^}]*box-shadow: none;/s,
    );
  });

  it('keeps the faint shadow on closed white dropdown titles in every theme', () => {
    const rule = css.indexOf('.ProseMirror .collapse.is-collapsed:is([style*="color: #ffffff" i]');
    const darkRule = css.indexOf('.dark .ProseMirror .collapse.is-collapsed > .collapse-header');
    expect(rule).toBeGreaterThan(-1);
    // Later in the file than the dark-mode "no shadow" rule, so it wins there too.
    expect(rule).toBeGreaterThan(darkRule);
    expect(css.slice(rule, css.indexOf('}', rule))).toContain('text-shadow: #000 0 1px 2px;');
  });

  it('lets dropdown titles inherit italics from their F-list container', () => {
    expect(css).toMatch(
      /\.collapse \.collapse-title\s*\{[^}]*font-style: inherit;/s,
    );
  });

});
