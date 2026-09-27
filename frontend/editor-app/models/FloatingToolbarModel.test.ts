import { describe, expect, it } from 'vitest';

import { shouldFloatEditorToolbar } from './FloatingToolbarModel';

describe('floating editor toolbar', () => {
  it('floats only after the original toolbar has left the viewport', () => {
    expect(shouldFloatEditorToolbar(1, 900)).toBe(false);
    expect(shouldFloatEditorToolbar(0, 900)).toBe(true);
    expect(shouldFloatEditorToolbar(-40, 900)).toBe(true);
  });

  it('stops floating after the editor workspace has left the viewport', () => {
    expect(shouldFloatEditorToolbar(-40, 30)).toBe(true);
    expect(shouldFloatEditorToolbar(-40, 29)).toBe(false);
    expect(shouldFloatEditorToolbar(-40, -1)).toBe(false);
  });

  it('fails safely for invalid layout measurements', () => {
    expect(shouldFloatEditorToolbar(Number.NaN, 900)).toBe(false);
    expect(shouldFloatEditorToolbar(-40, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
