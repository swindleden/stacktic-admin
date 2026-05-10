/**
 * Auth gate for site-admin (Backstage).
 *
 * Redirects unauthenticated requests to `/login`. Public routes
 * (the login page itself, Auth.js's own /api/auth/* endpoints, and
 * Next's static asset routes) are excluded via the `matcher` config
 * below — middleware doesn't run for them, so an unauthenticated user
 * can still hit /login without redirect-looping.
 *
 * Authentication shape: `auth()` from `@/auth` returns the session
 * (or null). Wrapping the middleware function with `auth()` lets us
 * read `req.auth` directly instead of decoding the JWT manually.
 *
 * Why all routes by default rather than an opt-in allowlist:
 *   Backstage is operator-only — every page reveals customer data or
 *   admin actions. Defaulting to "auth required" makes a forgotten
 *   exception fail closed (404/redirect), not fail open (data leak).
 *   Anything intentionally public (login, OAuth callbacks, static
 *   assets) is in the matcher exclusion below.
 */
import { auth } from "@/auth";

export default auth((req) => {
  // Auth.js's `auth()` middleware wrapper attaches the resolved
  // session to `req.auth`. If absent, the request is unauthenticated.
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    // Preserve where the user was trying to go so we can bounce them
    // back after sign-in. Skip when they were already heading to /login
    // (avoids ?callbackUrl=/login on first visit).
    if (req.nextUrl.pathname !== "/login") {
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    }
    return Response.redirect(loginUrl);
  }
});

export const config = {
  /**
   * Run middleware on every route EXCEPT:
   *   - /login            (the sign-in page itself)
   *   - /api/auth/*       (Auth.js handlers — must be reachable when
   *                        unauthenticated to complete the OAuth flow)
   *   - /api/health       (ALB target-group health probe; must return
   *                        200 inline or ECS cycles the task forever)
   *   - /_next/static/*   (Next's compiled JS/CSS bundles)
   *   - /_next/image/*    (image optimizer)
   *   - /favicon*         (browser-requested icons; pre-auth)
   *   - /brand/*          (logo files; pre-auth so /login can render)
   *   - /apple-touch-icon (iOS home-screen icon)
   *
   * Negative lookahead syntax: `^/(?!segment-to-skip).*` means
   * "match any path that does NOT start with the listed segments."
   */
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon|brand|apple-touch-icon).*)",
  ],
};
