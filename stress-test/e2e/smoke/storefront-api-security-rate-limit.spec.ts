import { test, expect } from "@playwright/test";

const base =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe.configure({ mode: "serial" });

test.describe("attach-customer IP burst returns 429", () => {
  test("POST /api/cart/attach-customer returns 429 after IP window", async ({
    request,
  }) => {
    let lastStatus = 401;
    for (let i = 0; i < 26; i++) {
      const res = await request.post(`${base}/api/cart/attach-customer`, {
        data: {},
        failOnStatusCode: false,
      });
      lastStatus = res.status();
      if (i < 25) {
        expect([401, 429]).toContain(res.status());
      }
    }
    expect(lastStatus).toBe(429);
  });
});
