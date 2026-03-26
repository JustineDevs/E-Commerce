import { getPaymentProviderDisplayName } from "@/lib/payment-provider-display-name";

type Props = {
  id: string;
};

/**
 * Friendly payment name; raw store id stays under Internal reference for support.
 */
export function PaymentProviderLabel({ id }: Props) {
  const label = getPaymentProviderDisplayName(id);

  return (
    <div className="space-y-1">
      <p className="font-body text-sm font-medium text-on-surface">{label}</p>
      <details className="text-[11px] text-on-surface-variant">
        <summary className="cursor-pointer select-none hover:text-on-surface">
          Internal reference
        </summary>
        <p className="mt-1 font-mono text-xs text-on-surface-variant/90 break-all pl-1 border-l border-outline-variant/30">
          {id}
        </p>
      </details>
    </div>
  );
}
