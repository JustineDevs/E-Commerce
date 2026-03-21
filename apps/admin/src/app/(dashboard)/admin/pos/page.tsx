"use client";

import { useState, useCallback, useEffect } from "react";

type CartItem = {
  id: string;
  variantId: string;
  name: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  qty: number;
  imageUrl?: string;
};

type VariantLookup = {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  products: { name?: string } | null;
};

export default function POSPage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  const medusaPosBase = "/api/pos/medusa";

  async function lookupBarcodeOrSku(
    value: string,
  ): Promise<VariantLookup | null> {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isNumeric = /^\d+$/.test(trimmed);
    const body = isNumeric ? { barcode: trimmed } : { sku: trimmed };
    const res = await fetch(`${medusaPosBase}/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  }

  const addToCart = useCallback(
    function addToCart(item: Omit<CartItem, "id">) {
      const existing = cart.find((c) => c.variantId === item.variantId);
      if (existing) {
        setCart(
          cart.map((c) => (c === existing ? { ...c, qty: c.qty + 1 } : c)),
        );
      } else {
        setCart([...cart, { ...item, id: crypto.randomUUID() }]);
      }
    },
    [cart],
  );

  async function handleBarcodeSubmit() {
    const value = barcodeInput.trim();
    if (!value) return;
    setLookupError(null);
    const variant = await lookupBarcodeOrSku(value);
    if (variant) {
      const name = (variant.products as { name?: string })?.name ?? "Unknown";
      addToCart({
        variantId: variant.id,
        name,
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        price: Number(variant.price),
        qty: 1,
      });
      setBarcodeInput("");
    } else {
      setLookupError("Variant not found");
    }
  }

  async function handlePaymentLink() {
    if (cart.length === 0) return;
    setLinkLoading(true);
    setLookupError(null);
    const items = cart.map((c) => ({
      variantId: c.variantId,
      quantity: c.qty,
    }));
    const res = await fetch(`${medusaPosBase}/draft-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setLinkLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg =
        typeof err.error === "string"
          ? err.error
          : "Could not create Medusa draft order";
      setLookupError(msg);
      return;
    }
    const data = (await res.json()) as {
      draftOrderId?: string;
      displayId?: string | number;
    };
    const ref =
      data.displayId != null ? String(data.displayId) : data.draftOrderId ?? "";
    alert(
      ref
        ? `Medusa draft order created (ref: ${ref}). Complete payment in Medusa Admin.`
        : "Medusa draft order created. Complete payment in Medusa Admin.",
    );
  }

  async function handleCommitSale() {
    if (cart.length === 0) return;
    setCommitLoading(true);
    setLookupError(null);
    const res = await fetch(`${medusaPosBase}/commit-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((c) => ({
          variantId: c.variantId,
          quantity: c.qty,
        })),
      }),
    });
    setCommitLoading(false);
    if (res.ok) {
      const { orderNumber } = (await res.json()) as { orderNumber?: string };
      setCart([]);
      setLookupError(null);
      alert(
        orderNumber
          ? `Medusa order ${orderNumber} created.`
          : "Medusa order created.",
      );
    } else {
      const err = await res.json().catch(() => ({}));
      setLookupError(
        typeof err.error === "string"
          ? err.error
          : "Failed to complete Medusa sale",
      );
    }
  }

  function removeFromCart(id: string) {
    setCart(cart.filter((c) => c.id !== id));
  }

  function updateQty(id: string, delta: number) {
    setCart(
      cart
        .map((c) => {
          if (c.id !== id) return c;
          const newQty = Math.max(0, c.qty + delta);
          return newQty === 0 ? c : { ...c, qty: newQty };
        })
        .filter((c) => c.qty > 0),
    );
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const tax = subtotal * 0.085;
  const total = subtotal + tax;

  const [quickProducts, setQuickProducts] = useState<
    Array<{
      variantId: string;
      name: string;
      sku: string;
      size: string;
      color: string;
      price: number;
      imageUrl?: string;
    }>
  >([]);

  const [quickProductsError, setQuickProductsError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${medusaPosBase}/quick-products`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(
        (data: {
          products?: Array<{
            variantId: string;
            name: string;
            sku: string;
            size: string;
            color: string;
            price: number;
            imageUrl?: string;
          }>;
        }) => {
          setQuickProducts(data.products ?? []);
          setQuickProductsError(null);
        },
      )
      .catch((err) => {
        setQuickProductsError(
          `Quick products unavailable: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      });
  }, []);

  return (
    <main className="p-8 flex flex-col lg:flex-row gap-8 min-h-screen">
      <div className="flex-grow space-y-8">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold font-headline tracking-tight text-primary">
            Terminal 01
          </h1>
          <p className="text-on-surface-variant font-body mt-2">
            Ready for transactions. Scanning active.
          </p>
        </header>

        {lookupError && (
          <div className="bg-error/10 text-error px-4 py-2 rounded text-sm font-medium">
            {lookupError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
              barcode_scanner
            </span>
            <input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleBarcodeSubmit();
                }
              }}
              className="w-full bg-surface-container-highest border-none rounded py-4 pl-12 pr-4 focus:ring-1 focus:ring-secondary/40 font-body text-sm transition-all"
              placeholder="Scan Barcode or SKU..."
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-surface-container-low px-2 py-1 rounded text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">
              F1
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
              search
            </span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-surface-container-highest border-none rounded py-4 pl-12 pr-4 focus:ring-1 focus:ring-secondary/40 font-body text-sm transition-all"
              placeholder="Search product name..."
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-surface-container-low px-2 py-1 rounded text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">
              F2
            </div>
          </div>
        </div>

        <section className="mt-12">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-6">
            Quick Select / Recent Items
          </h3>
          {quickProductsError && (
            <p className="text-xs text-error mb-4">{quickProductsError}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {quickProducts.map((p) => (
              <button
                key={p.variantId}
                onClick={() =>
                  addToCart({
                    variantId: p.variantId,
                    name: p.name,
                    sku: p.sku,
                    size: p.size,
                    color: p.color,
                    price: p.price,
                    qty: 1,
                  })
                }
                className="bg-surface-container-lowest p-4 group cursor-pointer transition-all hover:bg-surface-container-low text-left"
              >
                <div className="aspect-square mb-4 overflow-hidden rounded bg-surface-container-high" />
                <p className="text-xs font-bold uppercase tracking-tighter font-headline">
                  {p.name}
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  PHP {p.price.toLocaleString("en-PH")}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="w-full lg:w-96 flex flex-col h-[calc(100vh-4rem)] sticky top-8">
        <div className="bg-surface-container-lowest/80 backdrop-blur-xl flex flex-col h-full shadow-[0px_20px_40px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
          <div className="p-6 bg-primary text-on-primary">
            <h2 className="text-lg font-bold font-headline tracking-tight">
              Active Sale
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-on-primary/60">
              Session: #{Date.now().toString(36).slice(-5).toUpperCase()} ·{" "}
              {new Date().toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Cart is empty. Scan or search to add items.
              </p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 bg-surface-container-low rounded overflow-hidden flex-shrink-0" />
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold font-headline uppercase">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-on-surface-variant hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          close
                        </span>
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="bg-surface-container-low px-2 py-1 rounded text-[10px] font-medium text-on-surface-variant uppercase">
                        Size: {item.size}
                      </span>
                      <span className="bg-surface-container-low px-2 py-1 rounded text-[10px] font-medium text-on-surface-variant uppercase">
                        Color: {item.color}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-surface-container-high rounded hover:bg-surface-dim transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">
                            remove
                          </span>
                        </button>
                        <span className="text-xs font-bold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-surface-container-high rounded hover:bg-surface-dim transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">
                            add
                          </span>
                        </button>
                      </div>
                      <span className="text-sm font-medium">
                        PHP {(item.price * item.qty).toLocaleString("en-PH")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-6 bg-surface-container-low space-y-2">
            <div className="flex justify-between text-xs text-on-surface-variant font-medium">
              <span>Subtotal</span>
              <span>PHP {subtotal.toLocaleString("en-PH")}</span>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant font-medium">
              <span>Tax (8.5%)</span>
              <span>PHP {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold font-headline mt-2">
              <span>Total</span>
              <span>PHP {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <button
              type="button"
              disabled={cart.length === 0 || linkLoading}
              onClick={() => void handlePaymentLink()}
              className="w-full py-4 px-6 bg-secondary text-on-secondary font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">link</span>
              {linkLoading ? "Opening checkout…" : "Generate Payment Link"}
            </button>
            <button
              disabled={cart.length === 0 || commitLoading}
              onClick={handleCommitSale}
              className="w-full py-4 px-6 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined text-lg">
                shopping_cart_checkout
              </span>
              {commitLoading ? "Creating..." : "Commit Sale"}
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-72 flex gap-4">
        <div className="bg-surface-container-highest px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Scanner Online
        </div>
        <div className="bg-surface-container-highest px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Printer Ready
        </div>
      </div>
    </main>
  );
}
