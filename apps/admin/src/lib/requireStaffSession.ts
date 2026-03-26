import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import {
  checkStaffRole,
  staffHasPermission,
  staffPermissionListForSession,
} from "@apparel-commerce/database";
import { authOptions } from "./auth";

export async function requireStaffSession(): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const result = checkStaffRole(session);
  if (result.ok) return { ok: true };
  if (result.status === 401) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: result.code },
        { status: 401 },
      ),
    };
  }
  return {
    ok: false,
    response: NextResponse.json(
      { error: "Forbidden", code: result.code },
      { status: 403 },
    ),
  };
}

/**
 * Staff session plus a specific RBAC key (e.g. inventory:read for inventory APIs).
 */
export async function requireStaffSessionWithPermission(
  permission: string,
): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const roleCheck = checkStaffRole(session);
  if (!roleCheck.ok) {
    if (roleCheck.status === 401) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Unauthorized", code: roleCheck.code },
          { status: 401 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden", code: roleCheck.code },
        { status: 403 },
      ),
    };
  }
  const perms = staffPermissionListForSession(session);
  if (!staffHasPermission(perms, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden", code: "MISSING_PERMISSION" },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
