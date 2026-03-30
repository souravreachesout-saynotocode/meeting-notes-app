import type { Metadata } from "next";
import "./globals.css";
import { SidebarWrapper } from "@/components/sidebar-wrapper";

export const metadata: Metadata = {
  title: "MeetScribe",
  description: "Personal meeting notes with AI transcription and summarization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <SidebarWrapper>{children}</SidebarWrapper>
      </body>
    </html>
  );
}
