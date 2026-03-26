/**
 * Commerce system of record: Medusa holds products, variants, orders, payments, inventory.
 * Supabase holds identity, RBAC, CMS, workflow overlays, and audit rows — not SKU/price truth.
 */
export const COMMERCE_SYSTEM_OF_RECORD = "medusa" as const;
