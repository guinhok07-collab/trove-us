import {
  calculateFreight,
  createCjOrder,
  getCjClientConfig,
  pickLogisticOption,
} from "./client";
import type { CreateStoreOrderRequest, CreateStoreOrderResponse } from "./types";

function missingVidItems(items: CreateStoreOrderRequest["items"]) {
  return items.filter((item) => !item.cjVid?.trim());
}

export async function fulfillOrderWithCj(
  order: CreateStoreOrderRequest,
): Promise<CreateStoreOrderResponse> {
  const config = getCjClientConfig();
  if (!config) {
    return {
      ok: true,
      orderId: order.orderId,
      fulfillmentMode: "local-only",
      message: "CJ API not configured — order saved locally only.",
    };
  }

  const missing = missingVidItems(order.items);
  if (missing.length > 0) {
    throw new Error(
      `Missing CJ variant ID (cjVid) for: ${missing.map((i) => i.name).join(", ")}`,
    );
  }

  const freightProducts = order.items.map((item) => ({
    vid: item.cjVid!.trim(),
    quantity: item.quantity,
  }));

  const freightOptions = await calculateFreight(config, {
    endCountryCode: "US",
    zip: order.zip,
    products: freightProducts,
  });

  const logistic = pickLogisticOption(freightOptions, config.logisticName);
  if (!logistic) {
    throw new Error("No CJ shipping option available for this order.");
  }

  const cjResult = await createCjOrder(config, {
    orderNumber: order.orderId,
    shippingZip: order.zip,
    shippingCountry: "United States",
    shippingCountryCode: "US",
    shippingProvince: order.state,
    shippingCity: order.city,
    shippingPhone: order.phone,
    shippingCustomerName: order.fullName,
    shippingAddress: order.address,
    shippingAddress2: order.address2,
    email: order.email,
    logisticName: logistic.logisticName,
    fromCountryCode: config.fromCountryCode,
    storeName: config.storeName,
    payType: config.payType,
    remark: `Trove order ${order.orderId}`,
    products: order.items.map((item, index) => ({
      vid: item.cjVid!.trim(),
      sku: item.cjSku?.trim(),
      quantity: item.quantity,
      storeLineItemId: `${order.orderId}-${index + 1}`,
    })),
  });

  return {
    ok: true,
    orderId: order.orderId,
    cjOrderId: cjResult.orderId,
    cjPayUrl: cjResult.cjPayUrl,
    cjStatus: cjResult.orderStatus,
    fulfillmentMode: "cj-auto",
    message:
      config.payType === 2
        ? "Order sent to CJ with balance payment."
        : config.payType === 3
          ? "Order created in CJ — pay in CJ dashboard to ship."
          : "Order created in CJ — complete payment via CJ.",
  };
}
