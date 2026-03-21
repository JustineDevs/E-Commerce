// Shared domain types (catalog / storefront Product shape from Medusa mapping)

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
