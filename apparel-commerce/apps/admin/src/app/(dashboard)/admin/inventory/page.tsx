import { getApiUrl } from "@apparel-commerce/sdk";

export const dynamic = "force-dynamic";

type InventoryRow = {
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  available: number;
};

async function fetchInventory(): Promise<InventoryRow[]> {
  const base = process.env.API_URL ?? getApiUrl();
  const res = await fetch(`${base}/inventory`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.inventory ?? [];
}

export default async function InventoryPage() {
  const inventory = await fetchInventory();

  return (
    <main className="min-h-screen p-8 lg:p-12">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-primary font-headline">
            Inventory
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-sm">
            Manage stock levels and movements.
          </p>
        </div>
        <button className="px-6 py-2.5 bg-primary text-on-primary font-medium text-xs rounded flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add</span>
          Add Stock
        </button>
      </header>
      <div className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-container-high">
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Product
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                SKU
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Size
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Color
              </th>
              <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Stock
              </th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-on-surface-variant">
                  No inventory data.
                </td>
              </tr>
            ) : (
              inventory.map((row) => (
                <tr key={row.variantId} className="border-b border-surface-container-high/50">
                  <td className="py-4 px-6 font-medium text-primary">{row.productName}</td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">{row.sku}</td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">{row.size}</td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">{row.color}</td>
                  <td className="py-4 px-6 text-right font-medium">{row.available}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
