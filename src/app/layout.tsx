import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} font-mono bg-neutral-950 text-neutral-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}