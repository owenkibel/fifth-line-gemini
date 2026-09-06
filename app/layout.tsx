// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fifth Line — Gemini Limerick & Media Engine",
  description:
    "Anapestic limerick generator with real-time prosody checks, After Hours tavern humor, and AI video prompt staging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col justify-between`}
      >
        <div className="flex-1">{children}</div>

        <footer className="py-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
          <p className="flex items-center justify-center gap-1">
            <span>Fifth Line - Gemini Edition - Fifth Line Press, 2026 - Developed by Owen Kibel in conversation with Gemini 3.8 Flash Extended Thinking - Source is MIT-licensed - </span>
            <a
              href="https://github.com/owenkibel/fifth-line-gemini"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            >
              GitHub Source
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}