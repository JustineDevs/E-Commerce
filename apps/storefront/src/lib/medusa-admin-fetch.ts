import { getMedusaStoreBaseUrl } from "@apparel-commerce/sdk";

/**
 * Medusa Admin API (server-only). Same Basic auth as admin app.
 */
function secretApiKeyBasicAuthorization(secret: string): string {
  const payload = `${secret}:`;
  const b64 = Buffer.from(payload, "utf8").toString("base64");
  return `Basic ${b64}`;
}

function getMedusaSecretKey(): string | undefined {
  return (
    process.env.MEDUSA_SECRET_API_KEY?.trim() ||
    process.env.MEDUSA_ADMIN_API_SECRET?.trim() ||
    undefined
  );
}

export async function medusaAdminFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = getMedusaStoreBaseUrl().replace(/\/$/, "");
  const secret = getMedusaSecretKey();
  if (!secret) {
    throw new Error("MEDUSA_SECRET_API_KEY is not set");
  }
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(init?.headers);
  headers.set("Authorization", secretApiKeyBasicAuthorization(secret));
  if (
    init?.body &&
    init.method !== "GET" &&
    init.method !== "HEAD" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}
