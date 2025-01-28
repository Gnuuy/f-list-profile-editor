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
        <EditorControlBar />
        <Editor />
      </div>
    }>
    </PageLayout>
  );
}
