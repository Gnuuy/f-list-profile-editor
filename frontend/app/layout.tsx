import type { Metadata } from "next";
import "../editor-app/global.css";

export const metadata: Metadata = {
  title: "F-list Profile Editor",
  description: "A WYSIWYG editor for readable F-list profile BBCode.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
