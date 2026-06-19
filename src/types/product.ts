export type StoreCategory = "pet" | "home" | "wellness" | "tech";

export interface Store {
  id: StoreCategory;
  name: string;
  tagline: string;
  color: string;
  bgGradient: string;
  description: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice?: number;
  store: StoreCategory;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  sold: number;
  inStock: boolean;
  shippingDays: string;
  warehouse: "US";
  tags: string[];
  features: string[];
  /** CJ product ID (reference only) */
  supplierSku?: string;
  /** CJ variant ID — required for automatic fulfillment */
  cjVid?: string;
  /** CJ variant SKU — optional fallback */
  cjSku?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type AnalyticsEventType =
  | "view_store"
  | "view_product"
  | "add_to_cart";

export interface AnalyticsEvent {
  store: StoreCategory;
  type: AnalyticsEventType;
  productId?: string;
  timestamp: number;
}
