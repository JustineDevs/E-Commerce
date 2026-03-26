"use client";

import { useState, useCallback } from "react";

type IntakeItem = {
  name: string;
  quantity: number;
  variant: string;
};

const EMPTY_ITEM: IntakeItem = { name: "", quantity: 1, variant: "" };

export function ChatIntakeForm() {
  const [source, setSource] = useState("manual");
  const [rawText, setRawText] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback(
    (index: number, field: keyof IntakeItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const validItems = items
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: Math.max(1, item.quantity),
        variant: item.variant.trim() || undefined,
      }));

    const res = await fetch("/api/integrations/chat-orders/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        raw_text: rawText,
        phone: phone || undefined,
        items: validItems,
      }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      intakeId?: string;
    };
    if (!res.ok) {
      setErr(data.error ?? `Failed (${res.status})`);
      return;
    }
    setMsg(
      data.intakeId
        ? `Saved. Reference: ${data.intakeId}.`
        : "Saved.",
    );
    setRawText("");
    setItems([]);
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-4"
    >
      <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
        New intake
      </h3>
      {err ? (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="text-sm text-emerald-700" role="status">
          {msg}
        </p>
      ) : null}
      <div>
        <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">
          Source
        </label>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full rounded border border-outline-variant/30 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">
          Message
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="w-full rounded border border-outline-variant/30 px-3 py-2 text-sm min-h-[96px]"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">
          Phone
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded border border-outline-variant/30 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase text-on-surface-variant">
            Line items
          </label>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            + Add item
          </button>
        </div>
        {items.length === 0 && (
          <p className="text-xs text-on-surface-variant">
            No items added. Click &quot;+ Add item&quot; to include products.
          </p>
        )}
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded border border-outline-variant/20 p-3"
          >
            <div className="flex-1 space-y-2">
              <input
                placeholder="Product name"
                value={item.name}
                onChange={(e) => updateItem(idx, "name", e.target.value)}
                className="w-full rounded border border-outline-variant/30 px-2 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, "quantity", parseInt(e.target.value, 10) || 1)
                  }
                  className="w-20 rounded border border-outline-variant/30 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Variant (size, color)"
                  value={item.variant}
                  onChange={(e) => updateItem(idx, "variant", e.target.value)}
                  className="flex-1 rounded border border-outline-variant/30 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="shrink-0 text-xs font-bold text-on-surface-variant hover:text-error mt-1"
            >
              X
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
      >
        {loading ? "Saving..." : "Submit intake"}
      </button>
    </form>
  );
}
