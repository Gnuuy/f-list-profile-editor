'use client'

import Editor from "./components/Editor";
import EditorToolBar from "./components/EditorToolBar";
import { EditorProvider } from "./context/EditorContext";
import PageLayout from "./views/PageLayout";

export default function Home() {
  return (
    <EditorProvider>
      <PageLayout
        sideBarChildren={<div>adwada</div>}
        mainBarChildren={
          <div>
            <div className="mainView-Editor">
              <EditorToolBar />
              <div className="editor-Container">
                <Editor />
              </div>
            </div>
          </div>
        }
      />
    </EditorProvider>
  );
}