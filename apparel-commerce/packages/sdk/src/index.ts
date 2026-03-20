// Internal API client and service adapters

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:4000";

export function getApiUrl(): string {
  return API_URL;
}

/**
 * Server-side only. Sends INTERNAL_API_KEY to the Express API when set.
 * Never import this output into client bundles for authenticated routes.
 */
export function getInternalApiHeaders(): HeadersInit {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    return {};
  }
  return { Authorization: `Bearer ${key}` };
}
