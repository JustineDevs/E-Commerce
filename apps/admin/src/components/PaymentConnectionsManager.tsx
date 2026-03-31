"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/database";
import type {
  PaymentConnectionSafe,
  PaymentProvider,
} from "@/lib/payment-connections";

type FormState = {
  provider: PaymentProvider;
  label: string;
  regionId: string;
  mode: "sandbox" | "production";
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalWebhookId: string;
  paymongoSecretKey: string;
  paymongoWebhookSecret: string;
  mayaSecretKey: string;
  mayaWebhookSecret: string;
  aftershipApiKey: string;
  aftershipWebhookSecret: string;
  aftershipCourierSlug: string;
};

const INITIAL_FORM: FormState = {
  provider: "stripe",
  label: "",
  regionId: "",
  mode: "sandbox",
  stripeSecretKey: "",
  stripeWebhookSecret: "",
  paypalClientId: "",
  paypalClientSecret: "",
  paypalWebhookId: "",
  paymongoSecretKey: "",
  paymongoWebhookSecret: "",
  mayaSecretKey: "",
  mayaWebhookSecret: "",
  aftershipApiKey: "",
  aftershipWebhookSecret: "",
  aftershipCourierSlug: "",
};

function providerLabel(id: PaymentProvider): string {
  if (id === "stripe") return "Stripe";
  if (id === "paypal") return "PayPal";
  if (id === "paymongo") return "PayMongo";
  if (id === "maya") return "Maya";
  if (id === "aftership") return "Aftership (tracking)";
  return "Cash on delivery";
}

export function PaymentConnectionsManager() {
  const { data: session } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "settings:write");
  const [items, setItems] = useState<PaymentConnectionSafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const secrets = useMemo(() => {
    if (form.provider === "stripe") {
      return {
        secretKey: form.stripeSecretKey.trim(),
        webhookSecret: form.stripeWebhookSecret.trim() || undefined,
      };
    }
    if (form.provider === "paypal") {
      return {
        clientId: form.paypalClientId.trim(),
        clientSecret: form.paypalClientSecret.trim(),
        webhookId: form.paypalWebhookId.trim() || undefined,
        environment: form.mode === "production" ? "live" : "sandbox",
      };
    }
    if (form.provider === "paymongo") {
      return {
        secretKey: form.paymongoSecretKey.trim(),
        webhookSecret: form.paymongoWebhookSecret.trim() || undefined,
      };
    }
    if (form.provider === "maya") {
      return {
        secretKey: form.mayaSecretKey.trim(),
        webhookSecret: form.mayaWebhookSecret.trim() || undefined,
      };
    }
    if (form.provider === "aftership") {
      return {
        apiKey: form.aftershipApiKey.trim(),
        webhookSecret: form.aftershipWebhookSecret.trim() || undefined,
        courierSlug: form.aftershipCourierSlug.trim() || undefined,
      };
    }
    return {};
  }, [form]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/admin/payment-connections");
      const j = (await r.json()) as { items?: PaymentConnectionSafe[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Unable to load payment connections.");
      setItems(j.items ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unable to load payment connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createConnection() {
    if (!canWrite) return;
    setError(null);
    setMessage(null);
    setBusyId("create");
    try {
      const r = await fetch("/api/admin/payment-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          label: form.label.trim(),
          regionId: form.regionId.trim() || null,
          mode: form.mode,
          secrets,
        }),
      });
      const j = (await r.json()) as {
        item?: PaymentConnectionSafe;
        webhookUrl?: string;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Could not create connection.");
      setForm((prev) => ({ ...prev, label: "", regionId: "" }));
      await load();
      setMessage(
        j.webhookUrl
          ? `Connection added. Configure this webhook URL at your provider: ${j.webhookUrl}`
          : "Connection added.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function verify(id: string) {
    if (!canWrite) return;
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/payment-connections/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableAfterVerify: true }),
      });
      const j = (await r.json()) as { message?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not verify connection.");
      await load();
      setMessage(j.message ?? "Connection verified.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function disable(id: string) {
    if (!canWrite) return;
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/payment-connections/${id}/disable`, { method: "POST" });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not disable connection.");
      await load();
      setMessage("Connection disabled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function runTest(id: string) {
    if (!canWrite) return;
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/payment-connections/${id}/test-payment`, {
        method: "POST",
      });
      const j = (await r.json()) as { message?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not run test payment.");
      await load();
      setMessage(j.message ?? "Test check passed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run test payment.");
    } finally {
      setBusyId(null);
    }
  }

  async function rotate(id: string) {
    if (!canWrite) return;
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/payment-connections/${id}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not rotate encryption.");
      await load();
      setMessage("Credentials re-encrypted. Keys rotated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rotate encryption.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10">
      <h3 className="text-lg font-bold text-primary font-headline mb-2">
        Merchant payments and courier BYOK
      </h3>
      <p className="text-on-surface-variant text-sm mb-4 max-w-3xl leading-relaxed">
        Connect each payment provider and optional Aftership tracking here. Secrets are encrypted in the database.
        Production Medusa must use{" "}
        <code className="rounded bg-surface-container-low px-1">PAYMENT_CREDENTIALS_SOURCE=platform</code> or{" "}
        <code className="rounded bg-surface-container-low px-1">supabase</code> so credentials load from these rows at
        boot (restart Medusa after changes). Remove duplicate plaintext PSP keys from server env when BYOK is on so
        Supabase stays the only durable source. Use verify before enabling production checkout.
      </p>

      <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-on-surface-variant">
            Provider
            <select
              className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
              value={form.provider}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  provider: e.target.value as PaymentProvider,
                }))
              }
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="paymongo">PayMongo</option>
              <option value="maya">Maya</option>
              <option value="aftership">Aftership (tracking)</option>
              <option value="cod">Cash on delivery</option>
            </select>
          </label>
          <label className="text-xs text-on-surface-variant">
            Region id (optional)
            <input
              className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
              value={form.regionId}
              onChange={(e) => setForm((prev) => ({ ...prev, regionId: e.target.value }))}
              placeholder="reg_..."
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Label
            <input
              className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder={`${providerLabel(form.provider)} account`}
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Mode
            <select
              className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
              value={form.mode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, mode: e.target.value as "sandbox" | "production" }))
              }
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </label>
        </div>

        {form.provider === "stripe" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              Stripe secret key
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.stripeSecretKey}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, stripeSecretKey: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Stripe webhook secret
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.stripeWebhookSecret}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, stripeWebhookSecret: e.target.value }))
                }
              />
            </label>
          </div>
        )}
        {form.provider === "paypal" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs text-on-surface-variant">
              PayPal client id
              <input
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.paypalClientId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paypalClientId: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              PayPal client secret
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.paypalClientSecret}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paypalClientSecret: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              PayPal webhook id
              <input
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.paypalWebhookId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paypalWebhookId: e.target.value }))
                }
              />
            </label>
          </div>
        )}
        {form.provider === "paymongo" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              PayMongo secret key
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.paymongoSecretKey}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paymongoSecretKey: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              PayMongo webhook secret
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.paymongoWebhookSecret}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paymongoWebhookSecret: e.target.value }))
                }
              />
            </label>
          </div>
        )}
        {form.provider === "maya" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              Maya secret key
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.mayaSecretKey}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mayaSecretKey: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Maya webhook secret
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.mayaWebhookSecret}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mayaWebhookSecret: e.target.value }))
                }
              />
            </label>
          </div>
        )}
        {form.provider === "aftership" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-on-surface-variant sm:col-span-2">
              Aftership API key
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.aftershipApiKey}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, aftershipApiKey: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Webhook signing secret
              <input
                type="password"
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm"
                value={form.aftershipWebhookSecret}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    aftershipWebhookSecret: e.target.value,
                  }))
                }
              />
            </label>
            <label className="text-xs text-on-surface-variant sm:col-span-3">
              Default courier slug (e.g. jtexpress-ph)
              <input
                className="mt-1 w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-sm font-mono"
                value={form.aftershipCourierSlug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    aftershipCourierSlug: e.target.value,
                  }))
                }
                placeholder="jtexpress-ph"
              />
            </label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!canWrite || busyId === "create"}
            onClick={() => void createConnection()}
          >
            {busyId === "create" ? "Saving..." : "Connect provider"}
          </button>
          {!canWrite && (
            <span className="text-xs text-on-surface-variant">
              You can view this section. Ask an admin for settings write access.
            </span>
          )}
          {message && <span className="text-xs text-emerald-700">{message}</span>}
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
      </div>

      <div className="mt-6 rounded border border-outline-variant/20 bg-surface-container-lowest">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Crypto</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Webhook</th>
              <th className="px-4 py-3">Secret</th>
              <th className="px-4 py-3">Last check</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-on-surface-variant" colSpan={9}>
                  Loading payment connections...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td className="px-4 py-10 text-center text-red-700" colSpan={9}>
                  {loadError}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-on-surface-variant" colSpan={9}>
                  No payment connections yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-outline-variant/10">
                  <td className="px-4 py-3">{providerLabel(item.provider)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{item.regionId ?? "All regions"}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs max-w-[8rem]">{item.cryptoScheme}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs max-w-[10rem] truncate" title={item.kekKeyId ?? ""}>
                    {item.kekKeyId ? `${item.kekKeyId.slice(0, 24)}…` : "—"}
                  </td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{item.webhookStatus}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{item.secretHint}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {item.lastTestResult ?? item.lastVerifiedAt ?? "Not checked yet"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void verify(item.id)}
                        disabled={!canWrite || busyId === item.id}
                        className="rounded border border-outline-variant/30 bg-white px-2.5 py-1 text-xs disabled:opacity-50"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => void runTest(item.id)}
                        disabled={!canWrite || busyId === item.id}
                        className="rounded border border-outline-variant/30 bg-white px-2.5 py-1 text-xs disabled:opacity-50"
                      >
                        Run test
                      </button>
                      <button
                        type="button"
                        onClick={() => void rotate(item.id)}
                        disabled={!canWrite || busyId === item.id}
                        className="rounded border border-outline-variant/30 bg-white px-2.5 py-1 text-xs disabled:opacity-50"
                        title="Re-encrypt with current KMS or local key settings"
                      >
                        Rotate keys
                      </button>
                      <button
                        type="button"
                        onClick={() => void disable(item.id)}
                        disabled={!canWrite || busyId === item.id}
                        className="rounded border border-outline-variant/30 bg-white px-2.5 py-1 text-xs disabled:opacity-50"
                      >
                        Disable
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
