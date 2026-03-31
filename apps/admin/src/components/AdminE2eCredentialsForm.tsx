"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Input, Label } from "@apparel-commerce/ui";

type Props = {
  callbackUrl: string;
  /** First entry in ADMIN_ALLOWED_EMAILS (server-passed). */
  defaultEmail?: string;
};

/**
 * Local dev E2E only (see isAdminE2eCredentialsConfigured). Password must match NEXTAUTH_SECRET.
 */
export function AdminE2eCredentialsForm({ callbackUrl, defaultEmail }: Props) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("e2e-credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: true,
      });
      if (res?.error) {
        setError("Sign in failed. Check E2E user exists in Supabase with staff or admin role.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-outline-variant/30 p-4"
      data-testid="e2e-credentials-form"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        E2E staff sign-in (credentials)
      </p>
      <p className="text-xs text-on-surface-variant">
        Use the first email in ADMIN_ALLOWED_EMAILS and NEXTAUTH_SECRET as the password.
      </p>
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="e2e-admin-email">Email</Label>
        <Input
          id="e2e-admin-email"
          data-testid="e2e-admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="e2e-admin-password">Password</Label>
        <Input
          id="e2e-admin-password"
          data-testid="e2e-admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={busy} data-testid="e2e-admin-submit" className="w-full">
        {busy ? "Signing in…" : "Sign in (E2E)"}
      </Button>
    </form>
  );
}
