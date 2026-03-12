import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "QA Copilot — AI-Powered Testing Assistant",
  description:
    "Generate test cases, enhance bug reports, and analyze regression impact with AI. The intelligent QA assistant for modern engineering teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0 }}>
        <div
          style={{
            display: "flex",
            height: "100dvh",
            background: "var(--bg-primary)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Sidebar />
          <main
            style={{
              flex: 1,
              width: "100%",
              minWidth: 0,
              background: "var(--bg-primary)",
              position: "relative",
              overflowY: "auto",
              height: "100dvh",
              paddingTop: "60px"
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
