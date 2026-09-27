import { useEffect, useMemo, useState } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { useProfileDrafts } from '../../context/ProfileDraftsContext';
import { createEditorExtensions } from '../../models/EditorExtensions';
import type { ProfileDraft } from '../../models/ProfileDrafts';

type EditorInstanceProps = {
  /** Read once on mount; render with key={draft.id} to switch drafts. */
  draft: ProfileDraft;
};

export function EditorInstance({ draft }: EditorInstanceProps) {
  const { setEditorInstance } = useEditorEngine();
  const { saveDraftDocument } = useProfileDrafts();
  const [openedDraft] = useState(draft);
  const {
    openColourAtRect,
    openEiconAtRect,
    openCharacterIconAtRect,
    openLinkAtRect,
  } = useEditorUI();
  const extensions = useMemo(() => createEditorExtensions({
    openColourMenu: openColourAtRect,
    openEiconMenu: openEiconAtRect,
    openCharacterIconMenu: openCharacterIconAtRect,
    openLinkMenu: openLinkAtRect,
  }), [openCharacterIconAtRect, openColourAtRect, openEiconAtRect, openLinkAtRect]);
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
        attributes: {
          spellcheck: 'true',
          'aria-label': 'Profile editor'
        }
    },
    extensions,
    content: openedDraft.document,
  });

  useEffect(() => {
    setEditorInstance(editor);

    return () => setEditorInstance(null);
  }, [editor, setEditorInstance]);

  useEffect(() => {
    if (!editor) return;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    // Only write real edits, so opening a draft doesn't change its "edited" time.
    let dirty = false;

    const saveNow = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      if (!dirty) return;
      dirty = false;
      void saveDraftDocument(openedDraft, editor.getJSON());
    };
    const scheduleSave = () => {
      dirty = true;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNow, 250);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };

    editor.on('update', scheduleSave);
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      editor.off('update', scheduleSave);
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      saveNow();
    };
  }, [editor, openedDraft, saveDraftDocument]);

  return <EditorContent editor={editor} />;
}
