import { describe, expect, it } from 'vitest';

import {
  COLLAPSIBLE_MIN_WIDTH_EM,
  getCollapsibleIndentFromDrag,
  getCollapsibleIndentPadding,
  getCollapsibleIndentStep,
  getCollapsibleMinimumWidth,
  getMaxCollapsibleIndent,
} from './CollapsibleIndent';

describe('collapsible indentation', () => {
  it('uses three em from the editor font size for each step', () => {
    expect(getCollapsibleIndentStep(16)).toBe(48);
    expect(getCollapsibleIndentFromDrag(1_000, 16, 0, 143)).toBe(3);
  });

  it('keeps a responsive minimum dropdown width while using the rest of the workspace', () => {
    const workspaceWidth = 1_000;
    const fontSize = 16;
    const minimumWidth = getCollapsibleMinimumWidth(fontSize);
    const maximum = getMaxCollapsibleIndent(workspaceWidth, fontSize);
    const remainingWidth = workspaceWidth - maximum * getCollapsibleIndentStep(fontSize);

    expect(COLLAPSIBLE_MIN_WIDTH_EM).toBe(16);
    expect(minimumWidth).toBe(256);
    expect(maximum).toBe(15);
    expect(remainingWidth).toBeGreaterThanOrEqual(minimumWidth);
    expect(remainingWidth).toBeLessThan(minimumWidth + getCollapsibleIndentStep(fontSize));
    expect(getCollapsibleIndentFromDrag(workspaceWidth, fontSize, 0, 10_000)).toBe(maximum);
    expect(getCollapsibleIndentPadding(maximum)).toBe(
      'max(0px, min(calc(15 * 3em), calc(100% - 16em)))',
    );
  });

  it('keeps indentation within the actual workspace for narrow or invalid sizes', () => {
    expect(getMaxCollapsibleIndent(255, 16)).toBe(0);
    expect(getMaxCollapsibleIndent(256, 16)).toBe(0);
    expect(getMaxCollapsibleIndent(304, 16)).toBe(1);
    expect(getCollapsibleIndentFromDrag(0, 16, 4, 100)).toBe(0);
    expect(getCollapsibleIndentFromDrag(1_000, 16, 3, -10_000)).toBe(0);
    expect(getCollapsibleMinimumWidth(Number.NaN)).toBe(0);
    expect(getCollapsibleIndentPadding(-4)).toContain('calc(0 * 3em)');
  });
});
