"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductReviewForm({
  productSlug,
  medusaProductId,
}: {
  productSlug: string;
  medusaProductId: string;
}) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          medusaProductId,
          authorName: authorName.trim(),
          rating,
          body: body.trim(),
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Unable to submit");
        setSaving(false);
        return;
      }
      setDone(true);
      setAuthorName("");
      setBody("");
      setRating(5);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-on-surface-variant" role="status">
        Thank you. Your review was posted.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 border-t border-outline-variant/20 pt-8">
      <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-primary">
        Write a review
      </h3>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Your name
        </label>
        <input
          required
          maxLength={120}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Rating
        </label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} of 5
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Review
        </label>
        <textarea
          required
          minLength={4}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {saving ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
