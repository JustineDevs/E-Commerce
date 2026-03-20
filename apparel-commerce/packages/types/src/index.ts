// Shared domain types

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderChannel = "web" | "pos";

export type UserRole = "admin" | "staff" | "customer";
