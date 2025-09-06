import EditorToolbar from "../../views/components/EditorToolbar";
import { EditorInstance } from "../../views/components/EditorInstance";
import { useEffect, useState } from "react";

export default function EditorView()
{
    return (
        <>
            <EditorToolbar />
            <div className="editor">
                <EditorInstance />
            </div>
        </>
    )
}