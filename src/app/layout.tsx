import type { Metadata } from "next";
// 1. Import from the 'geist' package instead of 'next/font'
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// 2. The rest of the file uses the new imports, but the logic remains the same
const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Naukri Automator",
  description: "One-click job application bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}