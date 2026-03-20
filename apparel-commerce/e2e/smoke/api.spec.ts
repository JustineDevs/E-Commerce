import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiBaseUrl, skipUnlessApiHealthy } from "../helpers/api";

async function skipIfApiUnavailable(request: APIRequestContext): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_API === "1") {
    test.skip(true, "PLAYWRIGHT_SKIP_API=1");
    return;
  }
  await skipUnlessApiHealthy(request);
}

test.describe("API smoke", () => {
  test("GET /health returns ok", async ({ request }) => {
    await skipIfApiUnavailable(request);
    const base = apiBaseUrl();
    const res = await request.get(`${base}/health`);
    expect(res.ok(), `health failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok" });
    expect(body).toHaveProperty("db");
  });

  test("GET /products returns array", async ({ request }) => {
    await skipIfApiUnavailable(request);
    const base = apiBaseUrl();
    const res = await request.get(`${base}/products?limit=5`);
    expect(res.ok(), `products failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("products");
    expect(Array.isArray(body.products)).toBeTruthy();
  });
});
