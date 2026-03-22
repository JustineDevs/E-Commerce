import { redirect } from "next/navigation";

/**
 * Root path redirects to admin dashboard.
 * Unauthenticated users will be redirected to sign-in by middleware when they hit /admin.
 */
export default function AdminRootPage() {
  redirect("/admin");
}
