import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { tokens } from "@/tokens/tokens";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "@/styles/globals.css";

// Font loading mirrors site-app: IBM Plex Sans + IBM Plex Mono, self-hosted at
// build time via next/font. Variables --font-plex-sans / --font-plex-mono are
// picked up by tokens.css to drive --stk-sans / --stk-mono.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stacktic Admin",
    template: "%s — Stacktic Admin",
  },
  description: "Operator console for the Stacktic team.",
  // Keep operator-console pages out of search engines, always.
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// theme-color per Brand Guidelines § 08. Navy on light, ink on dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: tokens.color.navy },
    { media: "(prefers-color-scheme: dark)", color: tokens.color.ink },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden bg-bg text-slate">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
