import SidebarButton from "../../views/components/SidebarButton";
import { useEditorEngine } from "../../context/EditorEngineContext";
import { useEditorUI } from "../../context/EditorUIContext";
import { exportProfile } from "../../utilities/ExportProfile";
import { ImportDialog } from "../../views/components/ImportDialog";

export default function EditorSidebarView() {
  const { getEditor } = useEditorEngine();
  const { importOpen, openImport } = useEditorUI();

  const handleExport = async () => {
    await exportProfile(getEditor);
  };

  return (
    <div className="editor-sidebar-actions">
      <SidebarButton title="Import" onClick={openImport} />
      <SidebarButton title="Export" onClick={handleExport} />
      {importOpen && <ImportDialog />}
    </div>
  );
}
