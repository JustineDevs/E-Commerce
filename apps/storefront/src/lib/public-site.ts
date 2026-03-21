export function getInstagramHref(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("@")) return `https://instagram.com/${raw.slice(1)}`;
  return `https://instagram.com/${raw.replace(/^\/+/, "")}`;
}

export function getSupportEmail(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return raw && raw.includes("@") ? raw : undefined;
}

export function getSupportPhoneDisplay(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
  return raw || undefined;
}
