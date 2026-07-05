import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Esoteric Oracle — Unified Chart Reading",
  description: "Synthesized readings across Vedic Astrology, Chinese Metaphysics, Numerology, and Human Design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
