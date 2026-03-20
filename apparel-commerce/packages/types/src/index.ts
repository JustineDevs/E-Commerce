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

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  brand: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
}
