import { staffHasPermission, staffPermissionListForSession } from "@apparel-commerce/database";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export async function requirePagePermission(permissionKey: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  const perms = staffPermissionListForSession(session);
  if (!staffHasPermission(perms, permissionKey)) {
    // `/admin` must not call `requirePagePermission("dashboard:read")` or this becomes an infinite redirect.
    redirect("/admin?denied=" + encodeURIComponent(permissionKey));
  }
}
