/** Parse CJ variant keys into human labels + option groups (mirrored in src/lib/catalog/variant-label.ts). */

const COLOR_WORDS =
  /^(black|white|red|blue|green|yellow|pink|purple|orange|brown|grey|gray|silver|gold|beige|navy|khaki|rose|cyan|teal|ivory|coffee|wine|apricot|army green|dark blue|light blue|dark gray|light gray|dark grey|light grey)/i;

const SIZE_PATTERN = /^(\d+(\.\d+)?\s?(cm|mm|in|inch|inches|"))$|^((XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL))$/i;

const PACK_VALUE = /^\d+\s*pcs?$/i;

export function looksLikePackValue(value) {
  return PACK_VALUE.test(String(value).trim());
}

export function isPackSizeDimension(values) {
  return values.length > 0 && values.every(looksLikePackValue);
}

export function formatVariantKey(key) {
  return key
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
}

function looksLikeRawSku(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (
    /\d+\s?(cm|mm|in|inch|")/i.test(lower) ||
    /interface|android|apple|typec|black|white|red|blue|green|pink|brown|gray|grey|gold|silver|purple|orange|yellow|beige|navy|size|large|small|medium/i.test(
      lower,
    )
  ) {
    return false;
  }
  const compact = trimmed.replace(/[\s-]/g, "");
  if (compact.length < 10) return false;
  if (/^CJ[A-Z0-9]{6,}$/i.test(compact)) return true;
  return /^[A-Z0-9]+$/.test(compact) && /\d{4,}/.test(compact);
}

function extractTailFromName(nameEn, productNameEn) {
  if (!nameEn) return null;
  let tail = nameEn.trim();
  if (productNameEn) {
    const prefix = productNameEn.trim();
    if (tail.toLowerCase().startsWith(prefix.toLowerCase())) {
      tail = tail.slice(prefix.length).trim();
    } else {
      const idx = tail.toLowerCase().lastIndexOf(prefix.toLowerCase().slice(0, 24));
      if (idx >= 0) tail = tail.slice(idx + prefix.slice(0, 24).length).trim();
    }
  }
  tail = tail.replace(/^[-–—:,;\s]+/, "").trim();
  if (tail.length >= 2 && tail.length <= 72 && !looksLikeRawSku(tail)) return tail;
  const words = nameEn.split(/\s+/);
  const last = words.slice(-6).join(" ");
  if (last.length >= 3 && last.length <= 72 && !looksLikeRawSku(last)) return last;
  return null;
}

/** CJ label — prefer variantKey, never show raw SKU to shoppers */
export function variantLabel(variant, parentSku, productNameEn) {
  const key = (variant.variantKey || "").trim();
  if (key && key.length <= 120 && !looksLikeRawSku(key)) {
    return formatVariantKey(key);
  }

  const tail = extractTailFromName(variant.variantNameEn, productNameEn);
  if (tail) return tail.replace(/\s+/g, " ");

  const sku = variant.variantSku || "";
  const prefix = parentSku ? `${parentSku}-` : "";
  if (prefix && sku.startsWith(prefix)) {
    const suffix = sku.slice(prefix.length);
    if (suffix && !looksLikeRawSku(suffix)) return suffix;
  }

  const dash = sku.lastIndexOf("-");
  if (dash > 0 && dash < sku.length - 1) {
    const suffix = sku.slice(dash + 1);
    if (suffix && !looksLikeRawSku(suffix)) return suffix;
  }

  return "Default";
}

export function parseVariantKeyParts(key) {
  if (!key || looksLikeRawSku(key)) return [];
  return key
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean);
}

function inferDimensionName(values, index) {
  const colorish = values.filter(
    (v) => COLOR_WORDS.test(v.trim()) || /^(dark|light)\s/i.test(v.trim()),
  ).length;
  if (index === 0 && colorish >= Math.max(1, values.length * 0.4)) {
    return "Color";
  }
  const joined = values.join(" ").toLowerCase();
  if (joined.includes("interface") || joined.includes("type-c") || joined.includes("typec")) {
    return "Connector";
  }
  if (values.every((v) => SIZE_PATTERN.test(v.trim()))) {
    return index === values.length - 1 ? "Size" : "Length";
  }
  if (values.every((v) => /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+(\.\d+)?)$/i.test(v.trim()))) {
    return "Size";
  }
  if (values.every((v) => /\d+\s?cm/i.test(v))) return "Length";
  if (isPackSizeDimension(values)) return "Pack size";
  return index === 0 ? "Style" : `Option ${index + 1}`;
}

/** Build option dimensions from all variant keys for grouped UI */
export function buildVariantDimensions(variants, productNameEn) {
  const parsed = variants.map((v) => {
    const key = v.variantKey || v.label || "";
    let parts = parseVariantKeyParts(key);
    if (!parts.length && v.label?.includes(" · ")) {
      parts = v.label.split(" · ").map((s) => s.trim());
    }
    if (!parts.length && v.variantNameEn) {
      const tail = extractTailFromName(v.variantNameEn, productNameEn);
      if (tail?.includes(" · ")) parts = tail.split(" · ").map((s) => s.trim());
      else if (tail) parts = [tail];
    }
    return parts;
  });

  const maxLen = Math.max(0, ...parsed.map((p) => p.length));
  if (maxLen <= 1) return [];

  const dimensions = [];
  for (let i = 0; i < maxLen; i++) {
    const values = [...new Set(parsed.map((p) => p[i]).filter(Boolean))];
    if (!values.length) continue;
    dimensions.push({
      name: inferDimensionName(values, i),
      index: i,
      values,
    });
  }
  return dimensions;
}

export function variantOptionsFromKey(variantKey, dimensions) {
  const parts = parseVariantKeyParts(variantKey);
  const options = {};
  for (const dim of dimensions) {
    const value = parts[dim.index];
    if (value) options[dim.name] = value;
  }
  return options;
}

export function buildVariantRecord(v, data, images, price, compareAtPrice) {
  const parentSku = data.productSku || "";
  const productNameEn = data.productNameEn || "";
  const label = variantLabel(v, parentSku, productNameEn);
  const key = (v.variantKey || "").trim();
  const parts = parseVariantKeyParts(key);
  const dimensions = buildVariantDimensions(
    [{ variantKey: key, label, variantNameEn: v.variantNameEn }],
    productNameEn,
  );
  const optionValues = {};
  for (let i = 0; i < parts.length; i++) {
    const dimName = dimensions[i]?.name ?? (i === 0 ? "Style" : `Option ${i + 1}`);
    optionValues[dimName] = parts[i];
  }

  return {
    id: v.vid,
    label,
    cjVid: v.vid,
    cjSku: v.variantSku,
    price,
    compareAtPrice,
    image: images[0],
    images,
    inStock: true,
    variantKey: key || undefined,
    optionValues: Object.keys(optionValues).length ? optionValues : undefined,
  };
}

/** Recompute dimensions + optionValues for full variant list (after all variants collected) */
export function enrichVariantCatalog(variants, productNameEn) {
  const mock = variants.map((v) => ({
    variantKey: v.variantKey || v.label?.replace(/ · /g, "-"),
    label: v.label,
  }));
  const dimensions = buildVariantDimensions(mock, productNameEn);
  if (!dimensions.length) return variants;

  return variants.map((v) => {
    const key = v.variantKey || v.label?.replace(/ · /g, "-") || "";
    const parts = parseVariantKeyParts(key);
    const optionValues = {};
    for (const dim of dimensions) {
      const value = parts[dim.index];
      if (value) optionValues[dim.name] = value;
    }
    return {
      ...v,
      optionValues: Object.keys(optionValues).length ? optionValues : v.optionValues,
    };
  });
}

export function getCatalogDimensions(variants) {
  const names = new Set();
  for (const v of variants) {
    if (v.optionValues) Object.keys(v.optionValues).forEach((k) => names.add(k));
  }
  if (!names.size) return [];
  const order = ["Color", "Connector", "Style", "Pack size", "Size", "Length"];
  return [...names].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
