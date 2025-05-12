'use client';

import dynamic from 'next/dynamic';

// Dynamically import Editor and disable SSR
const Editor = dynamic(() => import('./Editor'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

export default function EditorWrapper() {
  return <Editor />;
}
