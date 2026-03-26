import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function tryCmsRedirect(request: NextRequest): Promise<NextResponse | null> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return null;
  const rest = `${url.replace(/\/$/, "")}/rest/v1/cms_redirects?from_path=eq.${encodeURIComponent(pathname)}&active=eq.true&select=to_path,status_code&limit=1`;
  try {
    const res = await fetch(rest, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { to_path: string; status_code: number }[];
    if (!rows?.length) return null;
    const { to_path, status_code } = rows[0];
    const target = to_path.startsWith("http")
      ? to_path
      : new URL(to_path.startsWith("/") ? to_path : `/${to_path}`, request.url).toString();
    return NextResponse.redirect(target, status_code >= 300 && status_code < 400 ? status_code : 301);
  } catch {
    return null;
  }
}
