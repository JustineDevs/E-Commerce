// Internal API client and service adapters

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:4000";

export function getApiUrl(): string {
  return API_URL;
}
