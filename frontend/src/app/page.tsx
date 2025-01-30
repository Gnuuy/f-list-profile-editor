'use client'

import Editor from "./components/Editor";
import EditorControlBar from "./components/EditorControlBar";
import PageLayout from "./views/PageLayout";

export default function Home() {
  return (
    <PageLayout sideBarChildren={
      <div>
        adwada
      </div>
    } mainBarChildren=
    {
      <div>
        <div className="mainView-Editor">
            <EditorControlBar />
          <div className='editor-Container'>
            <Editor />
          </div>
        </div>
      </div>
    }>
    </PageLayout>
  );
}
