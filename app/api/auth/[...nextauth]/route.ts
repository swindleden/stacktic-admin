/**
 * Auth.js v5 catch-all handler.
 *
 * Mounts the OAuth flow at /api/auth/* — sign-in, callback, sign-out,
 * session, CSRF. The actual NextAuth config lives in `/auth.ts` at
 * the project root; this file just re-exports the HTTP handlers from
 * the `handlers` object the v5 NextAuth() factory returns.
 *
 * Required redirect URI in the Google Cloud Console:
 *   http://localhost:3100/api/auth/callback/google         (dev)
 *   https://<deployed-host>/api/auth/callback/google       (prod)
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
