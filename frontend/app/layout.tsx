import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radiology AI Scribe",
  description: "Voice-driven structured radiology reporting (scribe only — no diagnosis).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/60 py-5">
          <p className="mx-auto text-center w-full max-w-3xl px-6 text-xs text-muted-foreground">
            Local prototype · synthetic data only · the radiologist reviews and edits every
            report.
          </p>
        </footer>
      </body>
    </html>
  );
}
