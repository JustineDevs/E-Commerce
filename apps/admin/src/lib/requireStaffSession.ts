import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { checkStaffRole, staffSessionAllows } from "@apparel-commerce/database";
import { authOptions } from "./auth";

/**
 * Standard guard for `/api/admin/**` route handlers that need RBAC:
 * valid staff session + permission key (admin role resolves to `*` via {@link staffSessionAllows}).
 * Returns the session for audit fields (`session.user.email`).
 */
export async function requireStaffApiSession(
  permission: string,
): Promise<
  | { ok: true; session: Session }
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
  if (!staffSessionAllows(session, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden", code: "MISSING_PERMISSION" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session: session as Session };
}

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
 * Prefer {@link requireStaffApiSession} when the handler needs `session` for audit or actor fields.
 */
export async function requireStaffSessionWithPermission(
  permission: string,
): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const r = await requireStaffApiSession(permission);
  if (!r.ok) return r;
  return { ok: true };
}
