"use client";

import { useEffect, useState } from "react";
import type { ReconciliationSummary } from "@/app/api/admin/reconciliation/route";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    matched: "bg-green-100 text-green-800",
    discrepancy: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconciliationSummary | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reconciliation?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payment Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">PSP settlement vs Medusa orders</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading reconciliation data...</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Medusa Total</p>
              <p className="text-2xl font-semibold mt-1">
                {(data.totalMedusaMinor / 100).toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">PSP Settlement</p>
              <p className="text-2xl font-semibold mt-1">
                {(data.totalPspMinor / 100).toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Discrepancy</p>
              <p className={`text-2xl font-semibold mt-1 ${data.totalDiscrepancyMinor !== 0 ? "text-red-600" : "text-green-600"}`}>
                {(data.totalDiscrepancyMinor / 100).toLocaleString("en-PH", { style: "currency", currency: "PHP" })}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Medusa Orders</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Medusa Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">PSP Settled</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Discrepancy</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.date}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{row.provider}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.medusaOrderCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{(row.medusaTotalMinor / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{(row.pspSettlementMinor / 100).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${row.discrepancyMinor !== 0 ? "text-red-600" : "text-gray-700"}`}>
                      {(row.discrepancyMinor / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
