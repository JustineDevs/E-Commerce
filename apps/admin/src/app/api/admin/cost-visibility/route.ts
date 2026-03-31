import { NextResponse } from "next/server";

export type CostLineItem = {
  service: string;
  category: "hosting" | "database" | "cache" | "psp_fees" | "email" | "tracking" | "cdn" | "other";
  monthlyCostUsd: number;
  note: string;
};

export type CostVisibilitySummary = {
  month: string;
  totalMonthlyCostUsd: number;
  items: CostLineItem[];
  breakdown: Record<string, number>;
};

export async function GET() {
  const items: CostLineItem[] = [
    { service: "Vercel (Storefront)", category: "hosting", monthlyCostUsd: 0, note: "Free tier / Pro plan" },
    { service: "Vercel (Admin)", category: "hosting", monthlyCostUsd: 0, note: "Free tier / Pro plan" },
    { service: "Render (Medusa)", category: "hosting", monthlyCostUsd: 0, note: "Starter plan" },
    { service: "Render (API)", category: "hosting", monthlyCostUsd: 0, note: "Starter plan" },
    { service: "Supabase (Database)", category: "database", monthlyCostUsd: 0, note: "Free tier / Pro plan" },
    { service: "Supabase (Auth)", category: "database", monthlyCostUsd: 0, note: "Included" },
    { service: "Redis Cloud", category: "cache", monthlyCostUsd: 0, note: "If used" },
    { service: "Stripe Fees (~2.9%+30c)", category: "psp_fees", monthlyCostUsd: 0, note: "Variable based on volume" },
    { service: "PayPal Fees (~3.49%+49c)", category: "psp_fees", monthlyCostUsd: 0, note: "Variable based on volume" },
    { service: "PayMongo Fees (~3.5%)", category: "psp_fees", monthlyCostUsd: 0, note: "Variable based on volume" },
    { service: "Maya Fees (~2.5%)", category: "psp_fees", monthlyCostUsd: 0, note: "Variable based on volume" },
    { service: "Resend (Email)", category: "email", monthlyCostUsd: 0, note: "Free tier / usage based" },
    { service: "AfterShip (Tracking)", category: "tracking", monthlyCostUsd: 0, note: "Plan-dependent" },
    { service: "Vercel Edge Network", category: "cdn", monthlyCostUsd: 0, note: "Included with Vercel" },
  ];

  const breakdown: Record<string, number> = {};
  for (const item of items) {
    breakdown[item.category] = (breakdown[item.category] ?? 0) + item.monthlyCostUsd;
  }

  const summary: CostVisibilitySummary = {
    month: new Date().toISOString().slice(0, 7),
    totalMonthlyCostUsd: items.reduce((sum, i) => sum + i.monthlyCostUsd, 0),
    items,
    breakdown,
  };

  return NextResponse.json(summary);
}
