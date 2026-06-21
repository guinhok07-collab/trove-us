"use client";

import { useEffect } from "react";
import { StoreCategory } from "@/types/product";
import { trackEvent } from "@/lib/analytics";
import { trackMetaViewContent } from "@/lib/meta-pixel";

export function TrackProductView({
  store,
  productId,
  slug,
  name,
  price,
}: {
  store: StoreCategory;
  productId: string;
  slug: string;
  name: string;
  price: number;
}) {
  useEffect(() => {
    trackEvent(store, "view_product", productId);
    trackMetaViewContent({ id: productId, slug, name, price });
  }, [store, productId, slug, name, price]);

  return null;
}

export function TrackStoreView({ store }: { store: StoreCategory }) {
  useEffect(() => {
    trackEvent(store, "view_store");
  }, [store]);

  return null;
}
