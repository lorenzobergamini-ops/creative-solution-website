import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteSettings } from "@/lib/site-settings";
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
  title: {
    default: "Creative Solution — Stampa 3D e contenuti maker",
    template: "%s — Creative Solution",
  },
  description:
    "Creative Solution — stampa 3D su richiesta, pezzi personalizzati, prototipi e progettazione. Richiedi un preventivo personalizzato.",
};

export const viewport: Viewport = {
  themeColor: "#131313",
};

/**
 * Optional runtime accent override.
 * The default accent (#C8F031 electric lime) is defined as --accent in
 * globals.css. Precedence: NEXT_PUBLIC_ACCENT_COLOR (env) > site_settings
 * accent_color (admin panel) > default in globals.css. Documented
 * alternative: #F97316.
 */
const accentOverride = process.env.NEXT_PUBLIC_ACCENT_COLOR;

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const settings = await getSiteSettings();
  const accent = accentOverride ?? settings.accentColor;
  return (
    <html
      lang="it"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      style={
        accent ? ({ "--accent": accent } as CSSProperties) : undefined
      }
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}