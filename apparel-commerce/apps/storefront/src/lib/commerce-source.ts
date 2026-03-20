export type CommerceSource = "legacy" | "medusa";

export function getCommerceSource(): CommerceSource {
  const raw = (
    process.env.NEXT_PUBLIC_COMMERCE_SOURCE ?? process.env.COMMERCE_SOURCE ?? "legacy"
  ).toLowerCase();
  return raw === "medusa" ? "medusa" : "legacy";
}
