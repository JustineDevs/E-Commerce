import { getMedusaStoreBaseUrl } from "@apparel-commerce/sdk";
import { getMedusaSecretKey } from "@/lib/medusa-pos";

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
  headers.set("Authorization", `Bearer ${secret}`);
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
