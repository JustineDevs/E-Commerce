/**
 * @apparel-commerce/database
 *
 * Re-exports platform data from @apparel-commerce/platform-data.
 * Supabase = identity, RBAC, compliance, audit only. Medusa owns commerce.
 * See `data-boundaries.ts`, ADR-0002, and docs/data-ownership.md.
 */
export {
  LEGACY_TABLE_BINDINGS,
  MEDUSA_COMMERCE_DOMAINS,
  MEDUSA_EXCLUSIVE_TABLE_NAMES,
  isMedusaExclusiveTableName,
  type AppSurface,
  type LegacyTableBinding,
  type LegacyTableKind,
} from "./data-boundaries";
export {
  createSupabaseClient,
  tryCreateSupabaseClient,
  upsertOAuthUser,
  isStaffRole,
  checkStaffRole,
  type StaffCheckSession,
  exportDataSubjectByEmail,
  anonymizeStaleOrderAddresses,
  type DataSubjectExport,
  STAFF_PERMISSION_KEYS,
  isStaffRbacStrictEnv,
  staffHasPermission,
  staffPermissionListForSession,
  staffSessionAllows,
  resolveStaffPermissionsForUserId,
  type StaffPermissionKey,
  type StaffSessionLike,
} from "@apparel-commerce/platform-data";
