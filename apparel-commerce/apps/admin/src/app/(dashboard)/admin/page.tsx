export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen p-8 lg:p-12">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-primary font-headline">
            Overview
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-sm">
            Real-time performance metrics for Architectural Silence.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2.5 bg-surface-container-highest text-primary font-medium text-xs rounded hover:bg-surface-container-high transition-colors">
            Export Report
          </button>
          <button className="px-6 py-2.5 bg-primary text-on-primary font-medium text-xs rounded shadow-lg shadow-primary/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            New Product
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] border-l-4 border-primary">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
              Revenue
            </span>
            <span className="text-emerald-600 text-[10px] font-bold">+12.4%</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-primary">PHP 142,850.00</h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">Vs. last 30 days</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
              Total Sales
            </span>
            <span className="text-emerald-600 text-[10px] font-bold">+8.1%</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-primary">1,240</h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">Completed checkouts</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
              Inventory
            </span>
            <span className="text-error text-[10px] font-bold">-2.3%</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-primary">84%</h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">Stock capacity utilized</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
              Active Orders
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold text-emerald-600">Live</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-primary">42</h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">Awaiting fulfillment</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-lg tracking-tight">Sales Velocity</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-[10px] font-bold bg-primary text-on-primary rounded-full uppercase">
                  Weekly
                </button>
                <button className="px-3 py-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors uppercase">
                  Monthly
                </button>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-4 relative">
              {[40, 65, 55, 85, 45, 70, 60].map((h, i) => (
                <div
                  key={i}
                  className="w-full bg-surface-container-high rounded-t-sm relative group cursor-pointer hover:bg-primary transition-colors"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-lg tracking-tight mb-8">Recent Activity</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">inventory_2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Inventory Restocked</p>
                  <p className="text-xs text-on-surface-variant">Linen Tapered Trousers · 50 units</p>
                </div>
                <span className="text-[10px] font-medium text-slate-400">2m ago</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">local_shipping</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Order #AS-9402 Shipped</p>
                  <p className="text-xs text-on-surface-variant">Destination: Manila, PH</p>
                </div>
                <span className="text-[10px] font-medium text-slate-400">14m ago</span>
              </div>
            </div>
          </div>
        </section>
        <aside className="space-y-8">
          <div className="bg-primary text-on-primary p-8 rounded shadow-xl shadow-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              <h3 className="font-bold text-sm tracking-widest uppercase">Critical Alerts</h3>
            </div>
            <div className="space-y-4">
              <div className="pb-4 border-b border-white/10">
                <p className="text-xs font-bold mb-1">Classic Cargo Shorts</p>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-on-primary-fixed-variant">Size L · Low stock</p>
                  <button className="text-[10px] font-bold underline">Reorder</button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
