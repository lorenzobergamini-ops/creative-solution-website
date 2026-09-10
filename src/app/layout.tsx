import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * Fonts — self-hosted at build time by next/font (no external <link>).
 * Inter for body text, Space Grotesk for headings.
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Creative Solution",
  description:
    "Creative Solution — stampa 3D e contenuti maker. Sito in costruzione.",
};

/**
 * Optional runtime accent override.
 * The default accent (#C8F031 electric lime) is defined as --accent in
 * globals.css. Setting NEXT_PUBLIC_ACCENT_COLOR (see .env.example) overrides
 * the CSS variable without touching the code. Documented alternative: #F97316.
 */
const accentOverride = process.env.NEXT_PUBLIC_ACCENT_COLOR;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      style={
        accentOverride
          ? ({ "--accent": accentOverride } as CSSProperties)
          : undefined
      }
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}