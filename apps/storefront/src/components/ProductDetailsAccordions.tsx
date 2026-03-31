import Link from "next/link";
import type { Product } from "@apparel-commerce/types";

type Props = {
  product: Product;
  sizeRun: string[];
};

/**
 * PDP collapsible sections (size, description, specs, material, shipping).
 * Rendered once per breakpoint slot via parent wrappers (e.g. xl:hidden / hidden xl:block).
 */
export function ProductDetailsAccordions({ product, sizeRun }: Props) {
  return (
    <div className="space-y-0">
      <details
        className="group py-5 border-b border-outline-variant/20"
        open
      >
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">
            Size guide
          </span>
          <span className="material-symbols-outlined transition-transform group-open:rotate-180">
            expand_more
          </span>
        </summary>
        <div className="space-y-3 pt-4 font-body text-sm leading-relaxed text-on-surface-variant">
          <p>
            <strong>In-stock sizes:</strong>{" "}
            {sizeRun.length ? sizeRun.join(" · ") : "See variants above."}
          </p>
          <p>
            We publish detailed measurements when new runs arrive. If your size
            falls between two options, size up for a looser fit or down for a
            closer fit. Eligible size exchanges may be
            requested within <strong>7 days</strong> of delivery for unworn
            items-see{" "}
            <Link href="/returns" className="text-primary underline">
              Returns &amp; exchanges
            </Link>
            .
          </p>
        </div>
      </details>
      {product.description ? (
        <details className="group border-b border-outline-variant/20 py-5" open>
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider">
              Description
            </span>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="pt-4 font-body text-sm leading-relaxed text-on-surface-variant">
            {product.description}
          </div>
        </details>
      ) : null}
      {product.weightKg != null || product.dimensionsLabel?.trim() ? (
        <details className="group border-b border-outline-variant/20 py-5" open>
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider">
              Specifications
            </span>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="space-y-2 pt-4 font-body text-sm leading-relaxed text-on-surface-variant">
            {product.weightKg != null ? (
              <p>
                <strong>Weight:</strong> {product.weightKg} kg
              </p>
            ) : null}
            {product.dimensionsLabel?.trim() ? (
              <p>
                <strong>Dimensions:</strong>{" "}
                {product.dimensionsLabel.trim()}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
      <details className="group border-b border-outline-variant/20 py-5">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">
            Material &amp; Care
          </span>
          <span className="material-symbols-outlined transition-transform group-open:rotate-180">
            expand_more
          </span>
        </summary>
        <div className="space-y-3 pt-4 font-body text-sm leading-relaxed text-on-surface-variant">
          {product.material?.trim() ? (
            <p>
              <strong>Fabric composition:</strong> {product.material.trim()}
            </p>
          ) : (
            <p>Fabric notes appear in the description when provided.</p>
          )}
          <p>
            Unless the sewn-in label states otherwise, machine cold wash with
            like colors and dry flat in shade to preserve shape and print.
          </p>
        </div>
      </details>
      <details className="group py-5">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">
            Shipping &amp; Returns
          </span>
          <span className="material-symbols-outlined transition-transform group-open:rotate-180">
            expand_more
          </span>
        </summary>
        <div className="space-y-3 pt-4 font-body text-sm leading-relaxed text-on-surface-variant">
          <p>
            We ship nationwide via trusted couriers (including J&amp;T). Pickup
            from Cavite can be arranged for qualifying orders-details on your
            confirmation.
          </p>
          <p>
            <Link href="/shipping" className="text-primary underline">
              Shipping
            </Link>
            {" · "}
            <Link href="/returns" className="text-primary underline">
              Returns &amp; exchanges
            </Link>
            {" · "}
            <Link href="/warranty" className="text-primary underline">
              Warranty
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}
