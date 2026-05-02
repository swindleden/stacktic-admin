/**
 * /login — Backstage sign-in page.
 *
 * Single-button screen: "Continue with Google". The form action is a
 * server action that calls `signIn("google")`, which kicks off the
 * Auth.js OAuth flow. After the round-trip, the domain whitelist in
 * `auth.ts` either lets the user in (redirected to `callbackUrl` or
 * `/`) or bounces back here with `?error=AccessDenied`.
 *
 * Renders standalone (no Sidebar) — `app/layout.tsx` checks the
 * session and skips the chrome wrapper when there's no session, so
 * the login page gets the full viewport.
 */
import { signIn } from "@/auth";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="min-h-screen bg-paper grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image
            src="/brand/mark.svg"
            alt="Stacktic"
            width={48}
            height={48}
            priority
            className="rounded-md"
          />
          <h1 className="font-serif text-[28px] tracking-[-0.015em] text-ink mt-2">
            Backstage
          </h1>
          <p className="text-[13px] text-muted text-center">
            Operator console for the Stacktic team. Sign in with your Stacktic
            Google account.
          </p>
        </div>

        {error ? <ErrorBanner error={error} /> : null}

        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo:
                callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/",
            });
          }}
        >
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-3 rounded-md border border-line-strong bg-paper-4 px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper-3 dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <GoogleGlyph />
            <span>Continue with Google</span>
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">
          Stacktic employees only · access logged
        </p>
      </div>
    </div>
  );
}

/**
 * Error banner. Auth.js sends a few canonical error codes back to the
 * sign-in page. We map the ones operators are likely to actually
 * encounter and fall back to a generic message for the rest.
 */
function ErrorBanner({ error }: { error: string }) {
  const message =
    error === "AccessDenied"
      ? "That Google account isn't authorized for Backstage. Sign in with a Stacktic email address."
      : error === "Configuration"
        ? "Server-side auth configuration is missing or invalid. Check the deploy environment for AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_SECRET."
        : "Sign-in didn't complete. Try again, or check the server logs if the problem persists.";

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-warning-border bg-warning-soft px-4 py-3 text-[13px] text-warning-text"
    >
      {message}
    </div>
  );
}

/**
 * Google "G" glyph. Inline SVG so we don't carry an icon dependency.
 * Multi-color brand mark (the four-color G) — kept on white-ish paper-4
 * surface so the colors register correctly in both themes.
 */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
