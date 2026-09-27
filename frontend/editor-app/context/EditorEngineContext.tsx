import React, { createContext, useContext, useMemo, useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

import { importBBCode as parseBBCode } from '../models/BBCodeImporter';
import type { BBCodeImportAssets, BBCodeImportResult } from '../models/BBCodeImporter';
import { normalizeEiconName } from '../models/Eicon';
import { selectedCollapsible, updateTargetNodeAttributes } from '../models/CollapsibleFormatting';
import { characterIcon } from '../models/FListProfile';
import {
  insertFListHorizontalRule,
  type HorizontalRuleSpacing,
} from '../models/HorizontalRuleSpacing';
import type { TextAlignment } from '../models/InlineTextAlign';
import {
  applyFListLink,
  getFListLinkDraft,
  removeFListLink,
  type FListLinkDraft,
  type FListLinkResult,
} from '../models/Link';
import { clearTextColour } from '../models/TextColour';
import { toggleFListTextSize, type FListTextSize } from '../models/TextSize';
import { toggleFListTextScript } from '../models/TextScript';
import {
  applyUnicodeTextStyle,
  setUnicodeTypingStyle,
  type UnicodeTextStyle,
} from '../models/UnicodeText';

type EditorEngine = {
  editor: Editor | null;
  getEditor: () => Editor | null;
  setEditorInstance: (editor: Editor | null) => void;

  // Commands (stable references)
  bold: () => void;
  italic: () => void;
  underline: () => void;
  strike: () => void;
  subscript: () => void;
  superscript: () => void;
  toggleTextSize: (size: FListTextSize) => void;
  unicodeTextStyle: UnicodeTextStyle;
  setUnicodeTextStyle: (style: UnicodeTextStyle) => void;
  setTextAlign: (where: TextAlignment) => void;
  addImageFromFilePicker: () => void;
  toggleEditable: () => void;
  addQuote: () => void;
  insertCollapse: () => void;
  toggleCollapse: () => void;
  insertHR: (spacing?: HorizontalRuleSpacing) => void;
  setColour: (css: string) => void;
  clearColour: () => void;
  insertEicon: (name: string) => boolean;
  insertCharacterIcon: (character: string) => boolean;
  getLinkDraft: () => FListLinkDraft | null;
  applyLink: (draft: FListLinkDraft, href: string, label: string) => FListLinkResult;
  removeLink: (draft: FListLinkDraft) => boolean;
  /** Parses BBCode into a document this editor can load, without loading it. */
  parseImport: (source: string, assets?: BBCodeImportAssets) => BBCodeImportResult;
};

const Ctx = createContext<EditorEngine | null>(null);

export function EditorEngineProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [unicodeTextStyle, setUnicodeTextStyleState] = useState<UnicodeTextStyle>('normal');
  const unicodeTextStyleRef = useRef<UnicodeTextStyle>('normal');

  const getEditor = useCallback(() => editorRef.current, []);

  const setEditorInstance = useCallback((nextEditor: Editor | null) => {
    const liveEditor = nextEditor && !nextEditor.isDestroyed ? nextEditor : null;
    editorRef.current = liveEditor;
    setEditor(liveEditor);
    if (liveEditor) setUnicodeTypingStyle(liveEditor, unicodeTextStyleRef.current);
  }, []);

  // Helper: run a chain safely
  const withEditor = useCallback((fn: (ed: Editor) => void) => {
    const ed = editorRef.current;
    if (ed) fn(ed);
  }, []);

  const addQuote = useCallback(
    () => withEditor(ed => {
      const { empty } = ed.state.selection;
      if (!empty) {
        ed.chain().focus().quoteSelection().run();
      } else {
        ed.chain().focus().setBlockquote().run();
      }
    }),
    [withEditor]
  );


  const insertCollapse = useCallback(
    () => withEditor(ed => ed.chain().focus().insertCollapse('Details').run()),
    [withEditor]
  );
  const toggleCollapse = useCallback(
    () => withEditor(ed => ed.chain().focus().toggleCollapsed().run()),
    [withEditor]
  );

  const setColour = useCallback(
  (css: string) => withEditor(ed => {
    if (selectedCollapsible(ed.state)) {
      ed.chain().focus().command(({ tr }) => updateTargetNodeAttributes(tr, 'collapsible', { color: css })).run();
      return;
    }
    ed.chain().focus().setColor(css).run();
  }),
  [withEditor]
  );

  
  const clearColour = useCallback(
  () => withEditor(ed => {
    if (selectedCollapsible(ed.state)) {
      ed.chain().focus().command(({ tr }) => updateTargetNodeAttributes(tr, 'collapsible', { color: null })).run();
      return;
    }
    clearTextColour(ed);
  }),
  [withEditor]
  );

  const insertEicon = useCallback((name: string) => {
    const normalized = normalizeEiconName(name);
    const ed = editorRef.current;
    if (!normalized || !ed) return false;
    return ed.chain().focus().insertContent({
      type: 'eicon',
      attrs: { name: normalized },
    }).run();
  }, []);

  const insertCharacterIcon = useCallback((character: string) => {
    const icon = characterIcon(character);
    const ed = editorRef.current;
    if (!icon || !ed) return false;

    return ed.chain().focus().insertContent({
      type: 'image',
      attrs: {
        src: icon.avatarUrl,
        alt: icon.character,
        title: `Character icon: ${icon.character}`,
        align: 'left',
        placeholderKind: 'icon',
        width: 50,
        height: 50,
        bbcodeTag: 'icon',
        bbcodeValue: icon.character,
        bbcodeLabel: null,
      },
    }).run();
  }, []);

  const getLinkDraft = useCallback(() => {
    const ed = editorRef.current;
    return ed ? getFListLinkDraft(ed) : null;
  }, []);

  const applyLink = useCallback((draft: FListLinkDraft, href: string, label: string) => {
    const ed = editorRef.current;
    return ed
      ? applyFListLink(ed, draft, href, label)
      : { ok: false, error: 'The editor is not ready yet.' };
  }, []);

  const removeLink = useCallback((draft: FListLinkDraft) => {
    const ed = editorRef.current;
    return ed ? removeFListLink(ed, draft) : false;
  }, []);

  // Build command functions ONCE; they read from the ref at click time
  const bold = useCallback(() => withEditor(ed => ed.chain().focus().toggleBold().run()), [withEditor]);
  const italic = useCallback(() => withEditor(ed => ed.chain().focus().toggleItalic().run()), [withEditor]);
  const underline = useCallback(() => withEditor(ed => ed.chain().focus().toggleUnderline().run()), [withEditor]);
  const strike = useCallback(() => withEditor(ed => ed.chain().focus().toggleStrike().run()), [withEditor]);
  const subscript = useCallback(() => withEditor(ed => { toggleFListTextScript(ed, 'subscript'); }), [withEditor]);
  const superscript = useCallback(() => withEditor(ed => { toggleFListTextScript(ed, 'superscript'); }), [withEditor]);
  const toggleTextSize = useCallback(
    (size: FListTextSize) => withEditor(ed => { toggleFListTextSize(ed, size); }),
    [withEditor]
  );
  const setUnicodeTextStyle = useCallback((style: UnicodeTextStyle) => {
    unicodeTextStyleRef.current = style;
    setUnicodeTextStyleState(style);
    withEditor(ed => { applyUnicodeTextStyle(ed, style); });
  }, [withEditor]);
  const insertHR = useCallback(
    (spacing: HorizontalRuleSpacing = 'spaced') => withEditor(ed => {
      insertFListHorizontalRule(ed, spacing);
    }),
    [withEditor]
  );
  
  const setTextAlign = useCallback((where: TextAlignment) =>
    withEditor(ed => {
      if (selectedCollapsible(ed.state)) {
        ed.chain().focus().command(({ tr }) => updateTargetNodeAttributes(tr, 'collapsible', { textAlign: where })).run();
        return;
      }
      ed.chain().focus().setSelectionTextAlign(where).run();
    }), [withEditor]);

  const addImageFromFilePicker = useCallback(() =>
    withEditor(ed => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          ed.chain().focus().insertContent({
            type: 'image',
            attrs: {
              src: reader.result as string,
              alt: file.name,
              title: 'Uploaded image — replace with an F-list inline before exporting',
              align: 'left',
              placeholderKind: 'inline',
              bbcodeTag: null,
              bbcodeValue: null,
              bbcodeLabel: null,
            },
          }).run();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }), [withEditor]);

  const toggleEditable = useCallback(() =>
    withEditor(ed => {
      ed.setEditable(!ed.isEditable);
      ed.view.dispatch(ed.view.state.tr);
    }), [withEditor]);

  const parseImport = useCallback((source: string, assets?: BBCodeImportAssets) => {
    const ed = editorRef.current;
    if (!ed) throw new Error('The editor is not ready yet.');

    const result = parseBBCode(source, assets);
    try {
      ed.schema.nodeFromJSON(result.document).check();
    } catch {
      throw new Error('The imported BBCode could not be loaded.');
    }
    // Imports open as a new draft, which starts with plain typing.
    unicodeTextStyleRef.current = 'normal';
    setUnicodeTextStyleState('normal');
    return result;
  }, []);

  // Stable value: never changes identity (perfect for performance)
  const value = useMemo<EditorEngine>(() => ({
    editor,
    getEditor,
    setEditorInstance,
    bold, italic, underline, strike, subscript, superscript, toggleTextSize,
    unicodeTextStyle, setUnicodeTextStyle,
    setTextAlign,
    addImageFromFilePicker,
    toggleEditable,
    addQuote,
    insertCollapse, toggleCollapse,
    insertHR,
    setColour, clearColour,
    insertEicon,
    insertCharacterIcon,
    getLinkDraft, applyLink, removeLink,
    parseImport,
  }), [
    editor,
    getEditor, setEditorInstance,
    bold, italic, underline, strike, subscript, superscript, toggleTextSize,
    unicodeTextStyle, setUnicodeTextStyle,
    setTextAlign, addImageFromFilePicker, toggleEditable, addQuote, insertCollapse, toggleCollapse,
    insertHR, setColour, clearColour, insertEicon, insertCharacterIcon,
    getLinkDraft, applyLink, removeLink, parseImport,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditorEngine() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEditorEngine must be used inside <EditorEngineProvider>');
  return ctx;
}
