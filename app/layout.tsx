import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { tokens } from "@/tokens/tokens";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { auth } from "@/auth";
import "@/styles/globals.css";

// Backstage type system — Geist sans + Geist Mono for chrome, Instrument
// Serif for page titles. Loaded via next/font so they ship self-hosted.
// CSS variable names match the references in styles/globals.css.
const geistSans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stacktic Backstage",
    template: "%s — Stacktic Backstage",
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

// theme-color matches the page bg in each theme — paper in light, Midnight in dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: tokens.color.paper },
    { media: "(prefers-color-scheme: dark)",  color: tokens.dark.paper },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolve the session at the layout level. Two render shapes:
  //   • Authenticated → Sidebar + main grid (the standard chrome).
  //   • Unauthenticated → just the children, full-viewport (lets
  //     /login render standalone without the Sidebar bleeding in).
  // Middleware redirects unauthenticated users to /login before
  // anything else, so in practice the unauthenticated branch only
  // renders for /login itself.
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          {session?.user ? (
            <div className="font-sans text-ink bg-paper grid grid-cols-[220px_1fr] h-screen tracking-[-0.005em]">
              <Sidebar
                user={{
                  name: session.user.name ?? null,
                  email: session.user.email ?? null,
                  image: session.user.image ?? null,
                }}
              />
              <main className="overflow-auto">{children}</main>
            </div>
          ) : (
            <div className="font-sans text-ink bg-paper tracking-[-0.005em]">
              {children}
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
