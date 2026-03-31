/**
 * @apparel-commerce/platform-data
 *
 * Supabase-backed platform data: identity, RBAC, compliance.
 * Per ADR-0002: Medusa owns commerce; Supabase owns identity, compliance, archive.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");

  if (process.env.NODE_ENV === "production") {
    if (!serviceKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required in production (anon key bypass is disabled)",
      );
    }
    return createClient(url, serviceKey);
  }

  if (!serviceKey && !anonKey) {
    throw new Error("Missing Supabase credentials (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)");
  }
  if (!serviceKey) {
    console.warn("[platform-data] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (dev only)");
  }
  return createClient(url, serviceKey ?? anonKey!);
}

/**
 * Returns null when Supabase env is missing or invalid (instead of throwing).
 * Use in API routes to return 503 instead of 500.
 */
export function tryCreateSupabaseClient(): SupabaseClient | null {
  try {
    return createSupabaseClient();
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[platform-data] tryCreateSupabaseClient:", e);
    }
    return null;
  }
}

export { isMissingTableOrSchemaError } from "./supabase-errors";

/** Anon client for public reads (e.g. storefront home CMS). Requires SUPABASE_ANON_KEY. */
export function createSupabaseAnonClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url?.trim() || !anonKey?.trim()) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }
  return createClient(url.trim(), anonKey.trim());
}

export {
  upsertOAuthUser,
  isStaffRole,
  checkStaffRole,
  type StaffCheckSession,
} from "./admin-users";
export {
  STAFF_PERMISSION_KEYS,
  isStaffRbacStrictEnv,
  staffHasPermission,
  staffPermissionListForSession,
  staffSessionAllows,
  resolveStaffPermissionsForUserId,
  type StaffPermissionKey,
  type StaffSessionLike,
} from "./permissions";
export {
  exportDataSubjectByEmail,
  anonymizeStaleOrderAddresses,
  type DataSubjectExport,
} from "./compliance";

export {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type Employee,
  type EmployeeRole,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "./employees";

export {
  hashPin,
  verifyPinHash,
  setEmployeePin,
  verifyEmployeePin,
  requirePinApproval,
} from "./employee-pins";

export {
  openShift,
  closeShift,
  getActiveShift,
  listShifts,
  type PosShift,
} from "./pos-shifts";

export {
  recordVoid,
  listVoids,
  type PosVoid,
  type VoidAction,
  type RecordVoidInput,
} from "./pos-voids";

export {
  listDevices,
  getDeviceByName,
  updateDevice,
  upsertDevice,
  deactivateDevice,
  heartbeatDevice,
  type PosDevice,
  type DeviceType,
} from "./pos-devices";

export {
  getOrCreateLoyaltyAccount,
  lookupByQr,
  lookupByPhone,
  addPoints,
  redeemPoints,
  listLoyaltyAccounts,
  type LoyaltyAccount,
  type LoyaltyTier,
} from "./loyalty";

export {
  listRewards,
  createReward,
  updateReward,
  type LoyaltyReward,
  type RewardType,
} from "./loyalty-rewards";

export {
  listSegments,
  createSegment,
  addSegmentMembers,
  getSegmentMembers,
  deleteSegment,
  type Segment,
  type SegmentRuleType,
} from "./customer-segments";

export {
  listCampaigns,
  createCampaign,
  updateCampaign,
  executeCampaign,
  recordCampaignMessage,
  type Campaign,
  type CampaignType,
} from "./campaigns";

export {
  buildReceiptHtml,
  saveReceipt,
  markReceiptSent,
  getReceiptByOrder,
  type DigitalReceipt,
} from "./digital-receipts";

export {
  enqueueOfflineSale,
  listPendingQueue,
  markSynced,
  markFailed,
  retryFailed,
  type OfflineQueueItem,
} from "./offline-queue";

export {
  getPosOfflineCommit,
  insertPosOfflineCommit,
  insertPosOfflineCommitOrRecover,
  type PosOfflineCommitRow,
} from "./pos-offline-idempotency";

export {
  computeClv,
  computeRetention,
  computeSalesTrends,
  type ClvResult,
  type RetentionMetric,
  type SalesTrend,
} from "./analytics";

export {
  mergeStorefrontHomePayload,
  getStorefrontHomeContent,
  upsertStorefrontHomeContent,
  loadStorefrontHomeContentForPublic,
  DEFAULT_STOREFRONT_HOME_PAYLOAD,
  type StorefrontHomePayload,
  type StorefrontHomeTile,
} from "./storefront-home-cms";

export {
  EMPTY_STOREFRONT_PUBLIC_METADATA,
  mergeStorefrontPublicMetadataPayload,
  getStorefrontPublicMetadata,
  upsertStorefrontPublicMetadata,
  resolveStorefrontPublicMetadataWithEnv,
  loadStorefrontPublicMetadataForPublic,
  loadStorefrontPublicMetadataResolvedForPublic,
  type StorefrontPublicMetadataPayload,
} from "./storefront-public-metadata";

export { isCmsPubliclyVisible } from "./cms-public-visibility";

export type {
  CmsPageType,
  CmsPublishStatus,
  CmsNavLink,
  CmsNavFeatured,
  CmsFooterColumn,
  CmsSocialLink,
  CmsNavigationPayload,
  CmsBlock,
  CmsPageRow,
  CmsPageBlockPresetRow,
  CmsBlogPostRow,
} from "./cms-types";

export {
  listCmsPages,
  getCmsPageById,
  getCmsPageBySlugLocalePublic,
  listCmsPagesForSitemapPublic,
  getCmsPageBySlugAdmin,
  upsertCmsPage,
  deleteCmsPage,
  listCmsPageVersions,
  getCmsPageBySlugPreview,
  getCmsPageAncestorTrail,
  getCmsPageBreadcrumbTrail,
  type UpsertCmsPageInput,
} from "./cms-pages";

export {
  getCmsNavigationPayload,
  getCmsNavigationPayloadAdmin,
  upsertCmsNavigationPayload,
  normalizeNavigationPayloadInput,
  getCmsNavigationDraftPayload,
  mergeNavigationDraftOverLive,
  upsertCmsNavigationDraftPayload,
  publishCmsNavigationDraft,
  parseNavLink,
  type CmsNavigationDraftPayload,
} from "./cms-navigation";

export {
  listCmsPageBlockPresets,
  insertCmsPageBlockPreset,
  deleteCmsPageBlockPreset,
} from "./cms-page-block-presets";

export {
  CMS_ANNOUNCEMENT_DEFAULT_ID,
  getCmsAnnouncement,
  listCmsAnnouncementsAdmin,
  listCmsAnnouncementsForLocalePublic,
  resolveAnnouncementStack,
  upsertCmsAnnouncement,
  deleteCmsAnnouncement,
  getCmsAnnouncementAnalyticsMap,
  incrementCmsAnnouncementMetric,
  type CmsAnnouncementRow,
  type CmsAnnouncementAnalyticsRow,
  type UpsertCmsAnnouncementInput,
} from "./cms-announcement";

export {
  listCmsCategoryContent,
  upsertCmsCategoryContent,
  getCmsCategoryContentPublic,
  type CmsCategoryContentRow,
} from "./cms-category";

export {
  listCmsMedia,
  insertCmsMedia,
  getCmsMediaById,
  updateCmsMedia,
  softDeleteCmsMedia,
  findCmsMediaReferences,
  type CmsMediaRow,
  type ListCmsMediaOptions,
  type CmsMediaReferenceHit,
} from "./cms-media";

export {
  listCmsBlogPosts,
  getCmsBlogPostById,
  getCmsBlogPostBySlugAdmin,
  upsertCmsBlogPost,
  deleteCmsBlogPost,
  getCmsBlogPostBySlugPublic,
  listCmsBlogPostsPublic,
  listCmsBlogPostsForSitemapPublic,
  getCmsBlogPostBySlugPreview,
  type UpsertCmsBlogInput,
} from "./cms-blog";

export {
  listCmsFormSubmissions,
  insertCmsFormSubmission,
  updateCmsFormSubmission,
  getCmsFormSettings,
  upsertCmsFormSettings,
  CMS_FORM_KEYS,
  type CmsFormKey,
  type CmsFormSubmissionRow,
  type CmsFormSettingsRow,
  type ListCmsFormSubmissionsOptions,
} from "./cms-forms";

export {
  listCmsRedirects,
  upsertCmsRedirect,
  deleteCmsRedirect,
  getCmsRedirectForPath,
  type CmsRedirectRow,
} from "./cms-redirects";

export {
  listCmsAbExperiments,
  upsertCmsAbExperiment,
  incrementCmsAbExperimentImpressions,
  type CmsAbExperimentRow,
} from "./cms-experiments";

export {
  loadCmsPagePublic,
  loadCmsPagePreviewPublic,
  loadCmsNavigationPublic,
  loadCmsAnnouncementsPublic,
  loadCmsAnnouncementPublic,
  loadCmsCategoryContentPublic,
  loadCmsBlogListPublic,
  loadCmsBlogPostPublic,
  loadCmsAbExperimentsActivePublic,
  loadCmsSitemapEntries,
} from "./cms-storefront";
