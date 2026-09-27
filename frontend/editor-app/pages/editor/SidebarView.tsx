import { useState } from "react";
import { Link } from "wouter";
import SidebarButton from "../../views/components/SidebarButton";
import { useEditorEngine } from "../../context/EditorEngineContext";
import { useEditorUI } from "../../context/EditorUIContext";
import { useProfileDrafts } from "../../context/ProfileDraftsContext";
import { exportProfile } from "../../utilities/ExportProfile";
import { DraftDetailsDialog } from "../../views/components/DraftDetailsDialog";
import { ImportDialog } from "../../views/components/ImportDialog";
import { toast } from "../../utilities/Toast";

export default function EditorSidebarView() {
  const { getEditor } = useEditorEngine();
  const { importOpen, openImport } = useEditorUI();
  const { activeDraft, createDraft } = useProfileDrafts();
  const [creating, setCreating] = useState(false);

  const handleExport = async () => {
    await exportProfile(getEditor);
  };

  return (
    <div className="editor-sidebar-actions">
      {activeDraft && (
        <div className="current-draft">
          <span className="current-draft-label">Editing</span>
          <strong className="current-draft-name">{activeDraft.name}</strong>
          <span className="current-draft-character">{activeDraft.character?.name ?? "No character"}</span>
          <Link href="/profiles" className="current-draft-link">All drafts</Link>
        </div>
      )}
      <SidebarButton title="Import" onClick={openImport} />
      <SidebarButton title="Export" onClick={handleExport} />
      <SidebarButton title="New draft" onClick={() => setCreating(true)} />
      {importOpen && <ImportDialog />}
      {creating && (
        <DraftDetailsDialog
          title="New draft"
          submitLabel="Create draft"
          onCancel={() => setCreating(false)}
          onSubmit={async details => {
            // The current draft stays as it is in All drafts.
            await createDraft(details);
            setCreating(false);
            toast("New draft created.");
          }}
        />
      )}
    </div>
  );
}
