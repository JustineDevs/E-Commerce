const CRYPTO_OR_STORE_PATTERN =
  /decrypt|cipher|auth tag|gcm|envelope|invalid.*ciphertext|bad decrypt|unsupported.*payload|malformed.*json|PAYMENT_CONNECTIONS_ENCRYPTION|wrappedDek|kms|GenerateDataKey|DecryptCommand/i;

/**
 * Maps thrown errors from crypto / envelope handling to a safe client and audit string.
 * Other errors pass through with a length cap (PSP HTTP messages are operator-safe).
 */
export function safePaymentConnectionClientError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (CRYPTO_OR_STORE_PATTERN.test(raw)) {
    return "Could not process stored credentials. Re-save the connection or verify platform encryption settings.";
  }
  if (raw.length > 500) {
    return `${raw.slice(0, 400)}…`;
  }
  return raw;
}
