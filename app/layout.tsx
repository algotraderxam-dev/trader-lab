import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantPilot — Strategy validation workspace",
  description:
    "A quiet workspace for validating trading rules, backtesting strategies, stress-testing prop-firm constraints, and exporting automation blueprints. Educational tool — not financial advice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
