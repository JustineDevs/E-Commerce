/**
 * @apparel-commerce/database
 *
 * Re-exports platform data from @apparel-commerce/platform-data.
 * Supabase = identity, RBAC, compliance, audit only. Medusa owns commerce.
 * See ADR-0002 and internal/docs/SOP-DATABASE-OWNERSHIP.md
 */
export {
  createSupabaseClient,
  upsertOAuthUser,
  isStaffRole,
  checkStaffRole,
  type StaffCheckSession,
  exportDataSubjectByEmail,
  anonymizeStaleOrderAddresses,
  type DataSubjectExport,
} from "@apparel-commerce/platform-data";
