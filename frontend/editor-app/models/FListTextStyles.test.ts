import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../global.css', import.meta.url), 'utf8');

describe('F-list text styles', () => {
  it("uses the dark theme's #999999 profile text, which quotes inherit", () => {
    expect(css).toMatch(/\.dark \{[^}]*--profile-text: #999999;/s);
    // The [color] around a quote, or else the surrounding text colour.
    expect(css).toMatch(/\.dark \.ProseMirror blockquote\.indentable\s*\{[^}]*color: var\(--quote-colour, inherit\);/s);
  });

  it("shows black text as F-list's dark theme does, only in dark mode", () => {
    expect(css).toMatch(
      /\.dark \.ProseMirror \[style\*="color: #000000"\],\s*\.dark \.ProseMirror \[style\*="color: rgb\(0, 0, 0\)"\]\s*\{[^}]*color: #888888 !important;[^}]*text-shadow: #161313 0 1px 2px, #1f1b1b 0 0 2px;/s,
    );
    // The default theme keeps F-list's normal black.
    expect(css).toMatch(
      /^\.ProseMirror span\[style\*="color: #000000"\],\s*\.ProseMirror span\[style\*="color: rgb\(0, 0, 0\)"\]\s*\{[^}]*text-shadow: #777 0 1px 2px, #9e9e9e 0 0 2px;/ms,
    );
  });

  it('uses the website superscript and subscript line-box model', () => {
    expect(css).toMatch(
      /\.ProseMirror sub,\s*\.ProseMirror sup\s*\{[^}]*position: relative;[^}]*font-size: 75%;[^}]*line-height: 0;[^}]*vertical-align: baseline;/s,
    );
    expect(css).toMatch(/\.ProseMirror sup\s*\{[^}]*top: -0\.5em;/s);
    expect(css).toMatch(/\.ProseMirror sub\s*\{[^}]*bottom: -0\.25em;/s);
    expect(css).not.toMatch(/\.ProseMirror sup\s*\{[^}]*vertical-align: top;/s);
  });

  it('keeps white-font links white and applies the F-list shadow', () => {
    expect(css).toMatch(
      /span\[style\*="color: #ffffff" i\] a[^}]*\{[^}]*color: #ffffff !important;[^}]*text-shadow: #000 0 1px 2px;/s,
    );
  });

  it("uses F-list's light theme profile text, font and quotes", () => {
    expect(css).toMatch(/\.light \{[^}]*--profile-text: #222222;/s);
    expect(css).toMatch(/\.light \{[^}]*--profile-font-family: "Lucida Grande", "Lucida Sans", Arial, sans-serif;/s);
    expect(css).toMatch(
      /\.light \.f-list-profile-workspace\s*\{[^}]*font-family: var\(--profile-font-family\);[^}]*font-size: 1\.1em;/s,
    );
    expect(css).toMatch(/\.light \{[^}]*--quote-text: #333333;[^}]*--quote-border: #ccdddd;/s);
    expect(css).toMatch(/\.light \{[^}]*--hr-color: #ccdddd;/s);
  });

  it('removes every text shadow in the light profile, like F-list', () => {
    expect(css).toMatch(
      /\.light \.f-list-profile-canvas \*,\s*\.light \.f-list-profile-canvas \*::before,\s*\.light \.f-list-profile-canvas \*::after\s*\{[^}]*text-shadow: none !important;/s,
    );
  });

  it("uses the light theme's own colour classes for text and links around it", () => {
    const lightColours: Array<[string, string]> = [
      ['#ff4444', '#ff4444'],
      ['#ffa500', '#f2951a'],
      ['#ffff00', '#dbb21a'],
      ['#44ff44', '#1fde30'],
      ['#00ffff', '#00cccc'],
      ['#1e90ff', '#1e90ff'],
      ['#e2afff', '#dd00ff'],
      ['#ffcbdb', '#ff89bf'],
      ['#aa840c', '#967117'],
      ['#ffffff', '#aaaaaa'],
      ['#d3d3d3', '#777777'],
    ];
    for (const [editorColour, lightColour] of lightColours) {
      const rule = css.indexOf(`.light .ProseMirror span:is([style*="color: ${editorColour}" i]`);
      expect(rule, editorColour).toBeGreaterThan(-1);
      const body = css.slice(rule, css.indexOf('}', rule));
      expect(body).toContain(`.light .ProseMirror a:has(span:is([style*="color: ${editorColour}" i]`);
      expect(body).toContain(`color: ${lightColour} !important;`);
    }
  });

  it("matches F-list's light theme links: #222, its chain icon and a 0.8em hostname", () => {
    expect(css).toMatch(/\.light \.ProseMirror a,\s*\.light \.ProseMirror a:hover\s*\{[^}]*color: #222222;/s);
    expect(css).toMatch(
      /\.light \.ProseMirror a\[data-link-host\]\s*\{[^}]*padding: 2px 0 2px 22px;[^}]*background: url\('\/icons\/parsed-link\.png'\) 1px 7px no-repeat;/s,
    );
    expect(css).toMatch(/\.light \.ProseMirror a\[data-link-host\]::after\s*\{[^}]*font-size: 0\.8em;/s);
  });

  it('sizes blank lines in lines of profile text, so they follow the theme font', () => {
    expect(css).toMatch(
      /\.ProseMirror p\[style\*="text-align"\]\[data-f-list-break-after="true"\]\s*\{[^}]*margin-bottom: 1lh;/s,
    );
    expect(css).toMatch(/\.ProseMirror hr\s*\{[^}]*margin: 0\.5em 0;/s);
    expect(css).toMatch(
      /\.ProseMirror hr\[data-f-list-break-after="true"\]\s*\{[^}]*margin-bottom: calc\(0\.5em \+ 1lh\);/s,
    );
  });

  it('exposes a visibly bounded white swatch in the colour menu', () => {
    expect(css).toContain('.colour-option[data-colour-name="white"] .colour-option-chip');
  });

  it('matches the F-list profile link treatment', () => {
    expect(css).toMatch(/\.ProseMirror a\s*\{[^}]*color: #98d9ff;[^}]*text-decoration: underline;/s);
    expect(css).toContain('.ProseMirror a[data-link-host]::before');
    expect(css).toContain("mask: url('/icons/profile-link.svg')");
    expect(css).toContain('content: " [" attr(data-link-host) "]";');
    expect(css).toMatch(
      /a\[data-link-host\]:has\(span\[style\*="font-size: 0\.8em"\]\)::after\s*\{[^}]*font-size: 0\.8em;/s,
    );
    expect(css).toMatch(
      /a\[data-link-host\]:has\(span\[style\*="font-size: 1\.4em"\]\)::after\s*\{[^}]*font-size: 1\.4em;/s,
    );
  });
});
