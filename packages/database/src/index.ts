/**
 * @apparel-commerce/database
 *
 * Re-exports platform data from @apparel-commerce/platform-data.
 * Supabase = identity, RBAC, compliance, audit only. Medusa owns commerce.
 * See ADR-0002 and internal/docs/SOP-DATABASE-OWNERSHIP.md
 */
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
  resolveStaffPermissionsForUserId,
  type StaffPermissionKey,
  type StaffSessionLike,
} from "@apparel-commerce/platform-data";
