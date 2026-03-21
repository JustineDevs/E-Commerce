import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export async function requireStaffSession(): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "NO_SESSION" },
        { status: 401 },
      ),
    };
  }
  const role = session.user.role;
  if (role !== "admin" && role !== "staff") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden", code: "NOT_STAFF" },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
