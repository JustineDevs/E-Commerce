import { test, type APIRequestContext } from "@playwright/test";

export function apiBaseUrl(): string {
  return process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000";
}

/** Skip current test if API /health is not OK (e.g. local dev without `pnpm dev`). */
export async function skipUnlessApiHealthy(request: APIRequestContext): Promise<void> {
  const base = apiBaseUrl();
  const res = await request.get(`${base}/health`).catch(() => null);
  if (!res?.ok()) {
    test.skip(true, `API not reachable at ${base} — start API for this test`);
  }
}

/** Skip if catalog lacks this slug (API up but DB not seeded). */
export async function skipUnlessProductExists(
  request: APIRequestContext,
  slug: string
): Promise<void> {
  await skipUnlessApiHealthy(request);
  const base = apiBaseUrl();
  const res = await request.get(`${base}/products/${slug}`).catch(() => null);
  if (!res?.ok()) {
    test.skip(
      true,
      `GET /products/${slug} not OK (${res?.status() ?? "no response"}) — seed DB or fix API_URL`
    );
  }
}
