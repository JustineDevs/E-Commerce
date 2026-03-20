export default function OrdersPage() {
  return (
    <main className="min-h-screen p-8 lg:p-12">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-primary font-headline">
            Orders
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-sm">
            Order fulfillment hub.
          </p>
        </div>
      </header>
      <div className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-container-high">
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Order
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Customer
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Status
              </th>
              <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="py-16 text-center text-on-surface-variant">
                No orders yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
