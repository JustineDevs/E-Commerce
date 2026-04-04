import { NextResponse } from "next/server";
import { requireStaffApiSession } from "@/lib/requireStaffSession";

export type ReconciliationRow = {
  date: string;
  provider: string;
  medusaOrderCount: number;
  medusaTotalMinor: number;
  pspSettlementCount: number;
  pspSettlementMinor: number;
  discrepancyMinor: number;
  status: "matched" | "discrepancy" | "pending";
};

export type ReconciliationSummary = {
  period: string;
  rows: ReconciliationRow[];
  totalMedusaMinor: number;
  totalPspMinor: number;
  totalDiscrepancyMinor: number;
};

export async function GET(request: Request) {
  const staff = await requireStaffApiSession("dashboard:read");
  if (!staff.ok) return staff.response;

  const { searchParams } = new URL(request.url);
  const days = Math.min(Number(searchParams.get("days")) || 7, 90);
  const provider = searchParams.get("provider") || "all";

  const rows: ReconciliationRow[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const providers = provider === "all"
      ? ["stripe", "paypal", "paymongo", "maya"]
      : [provider];

    for (const p of providers) {
      rows.push({
        date: dateStr,
        provider: p,
        medusaOrderCount: 0,
        medusaTotalMinor: 0,
        pspSettlementCount: 0,
        pspSettlementMinor: 0,
        discrepancyMinor: 0,
        status: "pending",
      });
    }
  }

  const totalMedusa = rows.reduce((s, r) => s + r.medusaTotalMinor, 0);
  const totalPsp = rows.reduce((s, r) => s + r.pspSettlementMinor, 0);

  const summary: ReconciliationSummary = {
    period: `Last ${days} days`,
    rows,
    totalMedusaMinor: totalMedusa,
    totalPspMinor: totalPsp,
    totalDiscrepancyMinor: totalMedusa - totalPsp,
  };

  return NextResponse.json(summary);
}
