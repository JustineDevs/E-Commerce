/**
 * Deterministic apparel-commerce mock data for guide demos.
 * Keep labels consistent across demo HTML copy (no live APIs).
 * Sync storytelling with apps/admin/src/lib/guide-demos-catalog.ts when possible.
 */
(function (global) {
  "use strict";

  global.GuideDemoMock = {
    brand: "Maharlika Studio",
    region: "PH · PHP",
    currency: "PHP",
    storefrontUrl: "https://shop.maharlika.example",

    kpis30d: { orders: 128, revenue: 842_500, aov: 6580, lowStockSkus: 3 },

    products: [
      { sku: "MH-LN-TEE-BLK-S", name: "Linen tee — Black / S", price: 1890, stock: 24 },
      { sku: "MH-DNM-JKT-32", name: "Denim jacket — 32", price: 4590, stock: 6 },
      { sku: "MH-CRS-BAG-01", name: "Canvas crossbody", price: 2290, stock: 0 },
    ],

    orders: [
      { id: "MH-10482", customer: "Ana Reyes", total: 4580, status: "Paid", channel: "Web" },
      { id: "MH-10481", customer: "Jordan Cruz", total: 9200, status: "Fulfilling", channel: "POS" },
      { id: "MH-10480", customer: "Sam Park", total: 1890, status: "Refunded", channel: "Web" },
    ],

    customers: [
      { name: "Ana Reyes", email: "ana@example.com", tier: "Gold", ltv: 42_800, lastOrder: "2d ago" },
      { name: "Jordan Cruz", email: "jordan@example.com", tier: "Silver", ltv: 18_200, lastOrder: "Today" },
      { name: "Sam Park", email: "sam@example.com", tier: "Member", ltv: 6_400, lastOrder: "1w ago" },
    ],

    employees: [
      { name: "Rico Mendoza", role: "Store lead", status: "Active", lastActive: "12m ago" },
      { name: "Mia Santos", role: "Cashier", status: "Active", lastActive: "2h ago" },
      { name: "Leo Villarin", role: "Support", status: "Invited", lastActive: "—" },
    ],

    loyalty: {
      program: "Maharlika Circle",
      activeMembers: 1840,
      pointsIssued30d: 128_400,
      topReward: "₱500 voucher (2,500 pts)",
    },

    campaigns: [
      { name: "Weekend linen drop", channel: "Email", status: "Scheduled", sendAt: "Sat 10:00" },
      { name: "Abandoned cart — 48h", channel: "SMS", status: "Live", sendAt: "Rolling" },
    ],

    devices: [
      { name: "POS-01 · BGC", type: "Register", version: "2.4.1", health: "Online" },
      { name: "POS-02 · QC", type: "Register", version: "2.4.1", health: "Online" },
      { name: "Label · Stockroom", type: "Printer", version: "1.1.0", health: "Warning" },
    ],

    channels: [
      { name: "Web checkout", events24h: 412, errors: 0 },
      { name: "POS lane", events24h: 186, errors: 1 },
      { name: "Chat intake", events24h: 23, errors: 0 },
    ],

    chatOrders: [
      { thread: "IG · @styleph", intent: "Size swap", state: "Needs reply", age: "18m" },
      { thread: "Web chat", intent: "Bulk corporate", state: "Quoted", age: "3h" },
    ],

    payments: {
      stripe: "Live · cards",
      paypal: "Live",
      paymongo: "Test",
      regions: "PH default · PHP",
    },

    offlineQueue: [
      { id: "L-901", lane: "POS-02", items: 3, amount: "₱2,180", state: "Ready to sync" },
      { id: "L-900", lane: "POS-01", items: 1, amount: "₱890", state: "Synced" },
    ],

    reviews: [
      { product: "Linen tee — Black", rating: 5, excerpt: "Fabric feels premium…", mod: "Pending" },
      { product: "Canvas crossbody", rating: 2, excerpt: "Strap frayed after…", mod: "Flagged" },
    ],

    cmsPages: [
      { title: "Spring lookbook", status: "Published", updated: "Yesterday" },
      { title: "Care guide: linen", status: "Draft", updated: "Today" },
    ],
  };
})(typeof window !== "undefined" ? window : this);
