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
