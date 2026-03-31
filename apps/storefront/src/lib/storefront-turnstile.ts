/**
 * Optional Cloudflare Turnstile verification for public POST routes.
 * Set `TURNSTILE_SECRET_KEY` in the storefront server env to enforce.
 */
export async function verifyTurnstileIfConfigured(
  token: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true };
  }
  const t = token?.trim();
  if (!t) {
    return { ok: false, error: "Verification required" };
  }
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: t }),
      },
    );
    const json = (await res.json()) as { success?: boolean };
    if (!json.success) {
      return { ok: false, error: "Verification failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Verification unavailable" };
  }
}
