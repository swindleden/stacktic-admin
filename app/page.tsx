import { redirect } from "next/navigation";

/**
 * Root → /dashboard. Dashboard is the post-login landing surface for the
 * operator console; it composes Company + Template stats with links into
 * each list view.
 */
export default function Root() {
  redirect("/dashboard");
}
