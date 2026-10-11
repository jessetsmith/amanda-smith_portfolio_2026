import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amanda Smith | Portfolio",
  description:
    "Portfolio 2026 — staggered editorial grid for exhibitions, research, and writing",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
