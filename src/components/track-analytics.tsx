"use client";

import { useEffect } from "react";
import { StoreCategory } from "@/types/product";
import { trackEvent } from "@/lib/analytics";

export function TrackProductView({
  store,
  productId,
}: {
  store: StoreCategory;
  productId: string;
}) {
  useEffect(() => {
    trackEvent(store, "view_product", productId);
  }, [store, productId]);

  return null;
}

export function TrackStoreView({ store }: { store: StoreCategory }) {
  useEffect(() => {
    trackEvent(store, "view_store");
  }, [store]);

  return null;
}
