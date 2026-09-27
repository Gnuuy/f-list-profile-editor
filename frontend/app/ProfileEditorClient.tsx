"use client";

import dynamic from "next/dynamic";

const ProfileEditor = dynamic(() => import("../editor-app/App"), {
  ssr: false,
});

export default function ProfileEditorClient() {
  return <ProfileEditor />;
}
