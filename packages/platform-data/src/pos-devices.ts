import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

export type DeviceType = "terminal" | "printer" | "kds" | "scanner";

export type PosDevice = {
  id: string;
  name: string;
  type: DeviceType;
  ip_address: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  last_seen_at: string | null;
  created_at: string;
};

export function mergeDeviceConfig(
  prev: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...prev };
  for (const key of Object.keys(incoming)) {
    const v = incoming[key];
    if (key === "printerTcp" && v && typeof v === "object" && !Array.isArray(v)) {
      const prevTcp = (prev.printerTcp as Record<string, unknown>) ?? {};
      out.printerTcp = { ...prevTcp, ...(v as Record<string, unknown>) };
    } else {
      out[key] = v;
    }
  }
  return out;
}

function rowToDevice(row: Record<string, unknown>): PosDevice {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    type: (row.type as DeviceType) ?? "terminal",
    ip_address: row.ip_address != null ? String(row.ip_address) : null,
    is_active: Boolean(row.is_active ?? true),
    config: (row.config as Record<string, unknown>) ?? {},
    last_seen_at: row.last_seen_at != null ? String(row.last_seen_at) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function getDeviceByName(
  supabase: SupabaseClient,
  name: string,
): Promise<PosDevice | null> {
  const { data, error } = await supabase
    .from("pos_devices")
    .select("*")
    .eq("name", name.trim())
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return rowToDevice(data as Record<string, unknown>);
}

export async function updateDevice(
  supabase: SupabaseClient,
  id: string,
  patch: {
    ip_address?: string | null;
    config?: Record<string, unknown>;
    is_active?: boolean;
  },
): Promise<PosDevice> {
  const updateRow: Record<string, unknown> = {};
  if (patch.ip_address !== undefined) updateRow.ip_address = patch.ip_address;
  if (patch.is_active !== undefined) updateRow.is_active = patch.is_active;
  if (patch.config !== undefined) {
    const { data: row, error: fetchErr } = await supabase
      .from("pos_devices")
      .select("config")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;
    const prev = (row?.config as Record<string, unknown>) ?? {};
    updateRow.config = mergeDeviceConfig(prev, patch.config);
  }
  if (Object.keys(updateRow).length === 0) {
    const { data, error } = await supabase
      .from("pos_devices")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return rowToDevice(data as Record<string, unknown>);
  }
  const { data, error } = await supabase
    .from("pos_devices")
    .update(updateRow)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToDevice(data as Record<string, unknown>);
}

export async function listDevices(
  supabase: SupabaseClient,
): Promise<PosDevice[]> {
  const { data, error } = await supabase
    .from("pos_devices")
    .select("*")
    .order("name");
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => rowToDevice(r as Record<string, unknown>));
}

export async function upsertDevice(
  supabase: SupabaseClient,
  input: {
    name: string;
    type?: DeviceType;
    ip_address?: string;
    config?: Record<string, unknown>;
  },
): Promise<PosDevice> {
  const { data, error } = await supabase
    .from("pos_devices")
    .upsert(
      {
        name: input.name,
        type: input.type ?? "terminal",
        ip_address: input.ip_address ?? null,
        config: input.config ?? {},
        last_seen_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "name" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToDevice(data as Record<string, unknown>);
}

export async function deactivateDevice(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("pos_devices")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export async function heartbeatDevice(
  supabase: SupabaseClient,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("pos_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("name", name);
  if (error) throw error;
}
