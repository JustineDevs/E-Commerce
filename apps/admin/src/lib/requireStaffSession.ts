import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { checkStaffRole } from "@apparel-commerce/database";

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
