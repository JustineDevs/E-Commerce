import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

const STOREFRONT_RUNTIME_ENV_KEYS = [
  "MEDUSA_SECRET_API_KEY",
  "MEDUSA_ADMIN_API_SECRET",
  "MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEDUSA_URL",
  "MEDUSA_REGION_ID",
  "NEXT_PUBLIC_MEDUSA_REGION_ID",
  "MEDUSA_PUBLISHABLE_API_KEY",
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "MEDUSA_SALES_CHANNEL_ID",
  "NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID",
  "NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID",
  "NEXT_PUBLIC_CHECKOUT_PAYMENT_PROVIDERS",
] as const;

type StorefrontRuntimeEnvKey = (typeof STOREFRONT_RUNTIME_ENV_KEYS)[number];

let runtimeEnvLoaded = false;

function hasWorkspaceMarker(dir: string): boolean {
  return fs.existsSync(path.join(dir, "pnpm-workspace.yaml"));
}

function findWorkspaceRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    if (hasWorkspaceMarker(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function parseEnvFile(filePath: string): Partial<Record<StorefrontRuntimeEnvKey, string>> {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const parsed = parse(fs.readFileSync(filePath, "utf8"));
  const out: Partial<Record<StorefrontRuntimeEnvKey, string>> = {};
  for (const key of STOREFRONT_RUNTIME_ENV_KEYS) {
    const value = parsed[key];
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function mergeRootEnv(
  rootDir: string,
): Partial<Record<StorefrontRuntimeEnvKey, string>> {
  return {
    ...parseEnvFile(path.join(rootDir, ".env")),
    ...parseEnvFile(path.join(rootDir, ".env.local")),
  };
}

export function ensureStorefrontRuntimeEnvLoaded(options?: {
  cwd?: string;
}): void {
  if (runtimeEnvLoaded) {
    return;
  }

  const rootDir = findWorkspaceRoot(options?.cwd ?? process.cwd());
  if (!rootDir) {
    runtimeEnvLoaded = true;
    return;
  }

  const envFromFiles = mergeRootEnv(rootDir);
  for (const key of STOREFRONT_RUNTIME_ENV_KEYS) {
    if (process.env[key] == null && envFromFiles[key] != null) {
      process.env[key] = envFromFiles[key];
    }
  }
  runtimeEnvLoaded = true;
}

export function resetStorefrontRuntimeEnvForTests(): void {
  runtimeEnvLoaded = false;
}
