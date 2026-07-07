export type TrafficEventType =
  | "page_view"
  | "view_product"
  | "add_to_cart"
  | "view_cart"
  | "initiate_checkout"
  | "payment_started"
  | "purchase";

export interface TrafficEventInput {
  type: TrafficEventType;
  path?: string;
  productSlug?: string;
  store?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

export interface TrafficDayRow {
  date: string;
  label: string;
  pageView: number;
  viewProduct: number;
  addToCart: number;
  viewCart: number;
  initiateCheckout: number;
  paymentStarted: number;
  purchase: number;
}

export interface TrafficReport {
  ok: boolean;
  configured: boolean;
  days: TrafficDayRow[];
  totals: Omit<TrafficDayRow, "date" | "label">;
  topProducts: { slug: string; views: number }[];
  topSources: { source: string; views: number }[];
  health: {
    metaPixel: boolean;
    paypalLive: boolean;
    cjConfigured: boolean;
    cjPayType: number;
    cjManualPay: boolean;
    redis: boolean;
    telegram: boolean;
  };
}
