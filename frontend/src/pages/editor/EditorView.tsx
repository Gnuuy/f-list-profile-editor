import EditorToolbar from "../../views/components/EditorToolbar";
import { EditorInstance } from "../../views/components/EditorInstance";

export default function EditorView()
{
    return (
        <section className="f-list-profile-workspace" aria-label="F-list profile canvas">
            <EditorToolbar />
            <div className="editor f-list-profile-canvas">
                <EditorInstance />
            </div>
        </section>
    )
}
