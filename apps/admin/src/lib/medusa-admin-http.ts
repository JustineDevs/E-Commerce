import { getMedusaStoreBaseUrl } from "@apparel-commerce/sdk";
import { getMedusaSecretKey } from "@/lib/medusa-pos";

/**
 * Same encoding as @medusajs/js-sdk Client: Basic base64(`${apiKey}:`).
 * Medusa's admin authenticate middleware only accepts secret keys via Basic, not Bearer
 * (Bearer is for JWT user sessions).
 */
function secretApiKeyBasicAuthorization(secret: string): string {
  const payload = `${secret}:`;
  const b64 = Buffer.from(payload, "utf8").toString("base64");
  return `Basic ${b64}`;
}

/**
 * Authenticated Admin API call to the Medusa backend (server-side only).
 */
export async function medusaAdminFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = getMedusaStoreBaseUrl().replace(/\/$/, "");
  const secret = getMedusaSecretKey();
  if (!secret) {
    throw new Error("MEDUSA_SECRET_API_KEY (or MEDUSA_ADMIN_API_SECRET) is not set");
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
