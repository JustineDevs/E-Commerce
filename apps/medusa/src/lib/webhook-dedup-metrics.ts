/**
 * One JSON line per duplicate webhook delivery (audit: measure webhook duplicate rate).
 */
export function logWebhookDedupDuplicate(
  provider: "stripe" | "paypal" | "paymongo" | "maya" | "aftership",
  dedupId: string,
): void {
  const safeId =
    dedupId.length > 120 ? `${dedupId.slice(0, 40)}…${dedupId.slice(-40)}` : dedupId;
  console.info(
    JSON.stringify({
      event: "webhook_dedup_duplicate",
      provider,
      dedup_id: safeId,
      ts: new Date().toISOString(),
    }),
  );
}
