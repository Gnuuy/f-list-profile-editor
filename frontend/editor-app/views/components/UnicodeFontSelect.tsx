import type { ChangeEvent } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import {
  UNICODE_TEXT_STYLE_OPTIONS,
  selectedUnicodeTextStyle,
  type UnicodeTextStyle,
} from '../../models/UnicodeText';

type UnicodeFontSelectProps = {
  disabled?: boolean;
};

export default function UnicodeFontSelect({ disabled = false }: UnicodeFontSelectProps) {
  const { editor, unicodeTextStyle, setUnicodeTextStyle } = useEditorEngine();
  const selectedStyle = editor && !editor.isDestroyed
    ? selectedUnicodeTextStyle(editor)
    : unicodeTextStyle;
  const value = selectedStyle ?? 'mixed';

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setUnicodeTextStyle(event.target.value as UnicodeTextStyle);
  };

  return (
    <label className="unicode-font-control" title="Apply a Unicode text style to the selection and following typing">
      <select
        className="unicode-font-select"
        aria-label="Unicode font"
        value={value}
        disabled={disabled}
        onChange={onChange}
      >
        {selectedStyle === null ? <option value="mixed" disabled>Mixed styles</option> : null}
        {UNICODE_TEXT_STYLE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.preview} · {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
