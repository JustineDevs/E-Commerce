"use client";

import { formatCheckoutMoney } from "@/app/(public)/checkout/checkout-utils";

type Money = { label: string; value: number; tone?: "default" | "discount" };

/**
 * Server-authoritative totals rail (PRD: AuthoritativeTotalPanel).
 */
export function AuthoritativeTotalPanel({
  displayCurrency,
  subtotal,
  shippingTotal,
  taxTotal,
  discountTotal,
  total,
}: {
  displayCurrency: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  /** Final grand total from Medusa preview (single source of truth). */
  total: number;
}) {
  const rows: Money[] = [
    { label: "Subtotal", value: subtotal },
    { label: "Shipping", value: shippingTotal },
  ];
  if (taxTotal > 0) {
    rows.push({ label: "Tax", value: taxTotal });
  }
  if (discountTotal > 0) {
    rows.push({ label: "Discount", value: -discountTotal, tone: "discount" });
  }

  return (
    <>
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex justify-between text-sm ${
            row.tone === "discount" ? "text-green-800" : ""
          }`}
        >
          <span className="text-on-surface-variant">{row.label}</span>
          <span>
            {row.tone === "discount" ? "−" : null}
            {formatCheckoutMoney(Math.abs(row.value), displayCurrency)}
          </span>
        </div>
      ))}
      <div className="flex justify-between font-headline font-bold text-lg pt-2">
        <span>Total</span>
        <span>{formatCheckoutMoney(total, displayCurrency)}</span>
      </div>
    </>
  );
}
