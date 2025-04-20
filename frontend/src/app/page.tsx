'use client'

export const dynamic = 'force-dynamic';

import Button from "./components/Button";
import EditorWrapper from "./components/EditorWrapper";
import EditorToolBar from "./components/EditorToolBar";
import { EditorProvider, useEditorContext } from "./context/EditorContext";
import { useBBCode } from "./context/ParserContext";
import PageLayout from "./views/PageLayout";

export default function Home() {
  return (
    <EditorProvider>
      <EditorPage />
    </EditorProvider>
  );
}

function EditorPage() {
  const { editor } = useEditorContext();
  const { parseJSONToBBCode } = useBBCode();

  // const setBBcode = () => {
  //   if (!editor) return;
  // 
  //   const json = editor.getJSON();
  //   const bbcode = parseJSONToBBCode(json);
  // 
  //   navigator.clipboard.writeText(bbcode)
  //     .then(() => console.log("✅ BBCode copied to clipboard"))
  //     .catch((err) => console.error("❌ Failed to copy:", err));
  // };

  return (
    <PageLayout
      sideBarChildren={
        <div>
          <Button title="Export" />
        </div>
      }
      mainBarChildren={
        <div>
          <div className="mainView-Editor">
            <EditorToolBar />
            <div className="editor-Container">
              <EditorWrapper />
            </div>
          </div>
        </div>
      }
    />
  );
}