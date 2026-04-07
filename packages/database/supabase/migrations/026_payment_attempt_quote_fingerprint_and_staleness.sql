ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS quote_fingerprint text,
  ADD COLUMN IF NOT EXISTS stale_reason text,
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invalidated_by text;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_quote_fingerprint
  ON public.payment_attempts (quote_fingerprint);
