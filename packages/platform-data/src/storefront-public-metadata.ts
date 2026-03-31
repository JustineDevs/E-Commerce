import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

/** Contact and social links shown on the storefront (footer, contact page). */
export type StorefrontPublicMetadataPayload = {
  instagramUrl: string;
  supportEmail: string;
  supportPhone: string;
};

export const EMPTY_STOREFRONT_PUBLIC_METADATA: StorefrontPublicMetadataPayload = {
  instagramUrl: "",
  supportEmail: "",
  supportPhone: "",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function pickStr(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  return typeof v === "string" ? v : "";
}

export function mergeStorefrontPublicMetadataPayload(
  partial: unknown,
): StorefrontPublicMetadataPayload {
  const d = EMPTY_STOREFRONT_PUBLIC_METADATA;
  if (!isRecord(partial)) return { ...d };
  return {
    instagramUrl: pickStr(partial, "instagramUrl").trim(),
    supportEmail: pickStr(partial, "supportEmail").trim(),
    supportPhone: pickStr(partial, "supportPhone").trim(),
  };
}

const ROW_ID = "default";

export async function getStorefrontPublicMetadata(
  supabase: SupabaseClient,
): Promise<StorefrontPublicMetadataPayload> {
  const { data, error } = await supabase
    .from("storefront_public_metadata")
    .select("payload")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    if (!isMissingTableOrSchemaError(error)) {
      console.error("[storefront-public-metadata] get", error.message);
    }
    return mergeStorefrontPublicMetadataPayload(null);
  }

  const payload = (data as { payload?: unknown } | null)?.payload;
  return mergeStorefrontPublicMetadataPayload(payload ?? {});
}

export async function upsertStorefrontPublicMetadata(
  supabase: SupabaseClient,
  payload: StorefrontPublicMetadataPayload,
): Promise<void> {
  const merged = mergeStorefrontPublicMetadataPayload(payload);
  const { error } = await supabase.from("storefront_public_metadata").upsert(
    {
      id: ROW_ID,
      payload: merged as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Non-empty CMS field wins; otherwise uses NEXT_PUBLIC_* env (deploy-time fallback).
 */
export function resolveStorefrontPublicMetadataWithEnv(
  cms: StorefrontPublicMetadataPayload,
): StorefrontPublicMetadataPayload {
  const env = (key: string) => process.env[key]?.trim() ?? "";
  return {
    instagramUrl: cms.instagramUrl || env("NEXT_PUBLIC_INSTAGRAM_URL"),
    supportEmail: cms.supportEmail || env("NEXT_PUBLIC_SUPPORT_EMAIL"),
    supportPhone: cms.supportPhone || env("NEXT_PUBLIC_SUPPORT_PHONE"),
  };
}

export async function loadStorefrontPublicMetadataForPublic(): Promise<StorefrontPublicMetadataPayload> {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return mergeStorefrontPublicMetadataPayload(null);
  }
  try {
    const sb = createClient(url, anonKey);
    return await getStorefrontPublicMetadata(sb);
  } catch (e) {
    console.warn("[storefront-public-metadata] loadStorefrontPublicMetadataForPublic", e);
    return mergeStorefrontPublicMetadataPayload(null);
  }
}

export async function loadStorefrontPublicMetadataResolvedForPublic(): Promise<StorefrontPublicMetadataPayload> {
  const cms = await loadStorefrontPublicMetadataForPublic();
  return resolveStorefrontPublicMetadataWithEnv(cms);
}
