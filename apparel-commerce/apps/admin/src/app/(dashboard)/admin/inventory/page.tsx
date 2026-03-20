export default function InventoryPage() {
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
            <tr className="border-b border-surface-container-high/50">
              <td className="py-4 px-6 font-medium text-primary">Classic Cargo Shorts</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">CS-S-BLK</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">S</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">Black</td>
              <td className="py-4 px-6 text-right font-medium">50</td>
            </tr>
            <tr className="border-b border-surface-container-high/50">
              <td className="py-4 px-6 font-medium text-primary">Classic Cargo Shorts</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">CS-M-BLK</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">M</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">Black</td>
              <td className="py-4 px-6 text-right font-medium">50</td>
            </tr>
            <tr>
              <td className="py-4 px-6 font-medium text-primary">Slim Fit Chino Shorts</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">SF-S-NAV</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">S</td>
              <td className="py-4 px-6 text-on-surface-variant text-sm">Navy</td>
              <td className="py-4 px-6 text-right font-medium">50</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
