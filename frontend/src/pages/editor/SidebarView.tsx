import SidebarButton from "../../views/components/SidebarButton";
import { useEditorEngine } from "../../context/EditorEngineContext";
import { exportProfile } from "../../utilities/ExportProfile";

export default function EditorSidebarView() {
  const { getEditor } = useEditorEngine();

  const handleExport = async () => {
    await exportProfile(getEditor);
  };

  return (
        <div>
            <SidebarButton title="Export" onClick={handleExport} />
        </div>
  );
}
