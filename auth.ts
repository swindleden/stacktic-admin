/**
 * Auth.js v5 — site-admin (Backstage) authentication.
 *
 * Single provider: Google OAuth. The Backstage app is operator-only —
 * no public sign-up, no email/password fallback, no account linking.
 *
 * Authorization: domain whitelist on the email returned by Google.
 * `AUTH_ALLOWED_DOMAINS` is a comma-separated list (defaults to
 * "stacktic.app"). A user signs in iff the email's domain is on that
 * list. Phase 1 has a single allowed domain and a single user
 * (Denny); the comma-separated shape is forward-compatible for adding
 * cofounders or contractors later without touching code.
 *
 * Session: JWT-only (no DB session table). Backstage doesn't carry
 * user state between sessions, so a stateless JWT is enough and keeps
 * the auth surface free of the Postgres dependency.
 *
 * Cookies: secure flag + sameSite "lax" so OAuth redirects work in
 * the deployed environment. AUTH_TRUST_HOST=true is required when
 * deployed behind a proxy (Vercel sets this automatically; explicit
 * for self-host clarity).
 *
 * Environment variables required in production:
 *   AUTH_SECRET              — 32+ char random string, JWT signing key
 *   AUTH_GOOGLE_ID           — Google OAuth client ID
 *   AUTH_GOOGLE_SECRET       — Google OAuth client secret
 *   AUTH_TRUST_HOST          — "true" when behind a proxy / on Vercel
 *   AUTH_ALLOWED_DOMAINS     — comma-separated list, defaults to
 *                              "stacktic.app" (so a vanilla deploy
 *                              with the secrets set is correctly
 *                              locked down even without this var)
 *
 * Local dev: same vars in `.env.local`. Google OAuth client must
 * include `http://localhost:3100/api/auth/callback/google` in its
 * Authorized redirect URIs (port 3100 = site-admin's dev port).
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAINS = (process.env.AUTH_ALLOWED_DOMAINS ?? "stacktic.app")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s.length > 0);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * Domain gate. Runs on every sign-in attempt. Returning false
     * sends the user back to /login with `?error=AccessDenied` —
     * the login page surfaces a friendly message in that case.
     */
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || !email.includes("@")) return false;
      const domain = email.split("@")[1];
      if (!domain) return false;
      return ALLOWED_DOMAINS.includes(domain);
    },
    /**
     * Pass through name + email + image so the sidebar can render
     * the user's identity without a separate fetch.
     */
    async jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email ?? token.email;
        token.name = profile.name ?? token.name;
        token.picture = profile.picture ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.image = (token.picture as string) ?? session.user.image;
      }
      return session;
    },
  },
});
