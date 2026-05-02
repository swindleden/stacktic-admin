"use server";

/**
 * Server actions for auth flows used by client components.
 *
 * Sidebar's UserMenu is a client component (needs `usePathname` and
 * local state for the drop-up). Auth.js's `signOut()` runs on the
 * server, so we expose it via a server action that the client form
 * can post to.
 */
import { signOut } from "@/auth";

export async function signOutAction() {
  // `redirectTo` sends the browser to the login page after the
  // session cookie is cleared. Without it Auth.js bounces to "/"
  // by default, which would just re-redirect to /login through the
  // middleware — same destination, one extra hop.
  await signOut({ redirectTo: "/login" });
}
