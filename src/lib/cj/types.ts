export const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export interface CjApiResponse<T> {
  code: number;
  result: boolean;
  message: string;
  data: T;
  requestId?: string;
  success?: boolean;
}

export interface CjAccessTokenData {
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
}

export interface CjFreightOption {
  logisticName: string;
  logisticPrice: number;
  logisticAging?: string;
}

export interface CjCreateOrderProduct {
  vid: string;
  quantity: number;
  storeLineItemId?: string;
  sku?: string;
}

export interface CjCreateOrderPayload {
  orderNumber: string;
  shippingZip: string;
  shippingCountry: string;
  shippingCountryCode: string;
  shippingProvince: string;
  shippingCity: string;
  shippingPhone: string;
  shippingCustomerName: string;
  shippingAddress: string;
  shippingAddress2?: string;
  email: string;
  logisticName: string;
  fromCountryCode: string;
  platform?: string;
  storeName?: string;
  payType?: number;
  orderFlow?: number;
  products: CjCreateOrderProduct[];
  remark?: string;
}

export interface CjCreateOrderResult {
  orderId?: string;
  orderNumber?: string;
  shipmentOrderId?: string;
  cjPayUrl?: string;
  orderStatus?: string;
  actualPayment?: string;
}

export interface CreateStoreOrderItem {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  cjVid?: string;
  cjSku?: string;
}

export interface CreateStoreOrderRequest {
  orderId: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  items: CreateStoreOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface CreateStoreOrderResponse {
  ok: boolean;
  orderId: string;
  cjOrderId?: string;
  cjPayUrl?: string;
  cjStatus?: string;
  message?: string;
  fulfillmentMode: "cj-auto" | "local-only";
}
