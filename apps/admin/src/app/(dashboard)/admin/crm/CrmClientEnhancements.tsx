"use client";

import { useState, useEffect, useCallback } from "react";

type Segment = {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  member_count: number;
  last_refreshed_at: string | null;
};

type ClvResult = {
  customer_email: string;
  total_spent: number;
  order_count: number;
  avg_order_value: number;
};

export function CrmClientEnhancements() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [clvEmail, setClvEmail] = useState("");
  const [clvResult, setClvResult] = useState<ClvResult | null>(null);
  const [clvLoading, setClvLoading] = useState(false);
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [segForm, setSegForm] = useState({ name: "", rule_type: "manual", description: "" });

  const fetchSegments = useCallback(async () => {
    const res = await fetch("/api/admin/segments");
    if (res.ok) {
      const { data } = await res.json();
      setSegments(data ?? []);
    }
  }, []);

  useEffect(() => { void fetchSegments(); }, [fetchSegments]);

  async function handleClvLookup() {
    if (!clvEmail.trim()) return;
    setClvLoading(true);
    const res = await fetch(`/api/admin/analytics/clv?email=${encodeURIComponent(clvEmail)}`);
    if (res.ok) {
      const { data } = await res.json();
      setClvResult(data);
    } else {
      setClvResult(null);
    }
    setClvLoading(false);
  }

  async function handleCreateSegment(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(segForm),
    });
    setShowSegmentForm(false);
    setSegForm({ name: "", rule_type: "manual", description: "" });
    void fetchSegments();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Customer Segments
            </h3>
            <button
              onClick={() => setShowSegmentForm(true)}
              className="text-xs text-primary hover:underline font-bold"
            >
              + New Segment
            </button>
          </div>
          {segments.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No segments configured.</p>
          ) : (
            <div className="space-y-2">
              {segments.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-surface-container-low rounded px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">{s.rule_type}</p>
                  </div>
                  <span className="text-xs font-bold">{s.member_count} members</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
            Customer Lifetime Value Lookup
          </h3>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="Customer email"
              value={clvEmail}
              onChange={(e) => setClvEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClvLookup()}
              className="flex-1 border border-outline-variant/20 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={handleClvLookup}
              disabled={clvLoading}
              className="bg-primary text-on-primary px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
            >
              {clvLoading ? "..." : "Lookup"}
            </button>
          </div>
          {clvResult && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded p-3">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Total Spent</p>
                <p className="text-lg font-bold">PHP {(clvResult.total_spent / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-surface-container-low rounded p-3">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Orders</p>
                <p className="text-lg font-bold">{clvResult.order_count}</p>
              </div>
              <div className="bg-surface-container-low rounded p-3 col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Avg Order Value</p>
                <p className="text-lg font-bold">PHP {(clvResult.avg_order_value / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSegmentForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSegment} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 space-y-5">
            <h2 className="text-lg font-bold font-headline">Create Segment</h2>
            <input required placeholder="Segment name" value={segForm.name} onChange={(e) => setSegForm({ ...segForm, name: e.target.value })} className="w-full border border-outline-variant/20 rounded px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary/40" />
            <select value={segForm.rule_type} onChange={(e) => setSegForm({ ...segForm, rule_type: e.target.value })} className="w-full border border-outline-variant/20 rounded px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary/40">
              <option value="manual">Manual</option>
              <option value="spend_above">Spend Above Threshold</option>
              <option value="spend_below">Spend Below Threshold</option>
              <option value="order_count_above">Order Count Above</option>
              <option value="inactive_days">Inactive Days</option>
              <option value="tier">Loyalty Tier</option>
            </select>
            <textarea placeholder="Description" value={segForm.description} onChange={(e) => setSegForm({ ...segForm, description: e.target.value })} className="w-full border border-outline-variant/20 rounded px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary/40" rows={3} />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowSegmentForm(false)} className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cancel</button>
              <button type="submit" className="bg-primary text-on-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:opacity-90">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
