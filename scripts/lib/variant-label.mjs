/** Parse CJ variant keys into human labels + option groups (mirrored in src/lib/catalog/variant-label.ts). */

const COLOR_WORDS =
  /^(black|white|red|blue|green|yellow|pink|purple|orange|brown|grey|gray|silver|gold|beige|navy|khaki|rose|cyan|teal|ivory|coffee|wine|apricot|army green|dark blue|light blue|dark gray|light gray|dark grey|light grey|ivory white|white gray|black set)/i;

const SIZE_PATTERN =
  /^(\d+(\.\d+)?\s?(cm|mm|in|inch|inches|"))$|^((XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL))$/i;

const PACK_VALUE = /^\d+\s*pcs?$/i;

const POWER_VALUE = /^(US|EU|UK|AU|JP|\d+\s*V(\s*US)?)$/i;

const SMALL_WORDS = new Set(["a", "an", "the", "of", "and", "or", "for", "to", "with"]);

/** CJ junk → shopper English */
export const VALUE_ALIASES = {
  ordinary: "Standard",
  "to enhance": "Enhanced",
  "without shell": "No case",
  "with shell": "With case",
  usb: "USB",
  "basic payment": "Standard",
  "as picture": "As shown",
  "as shown": "As shown",
  default: "Standard",
};

export function looksLikePackValue(value) {
  return PACK_VALUE.test(String(value).trim());
}

export function isPackSizeDimension(values) {
  return values.length > 0 && values.every(looksLikePackValue);
}

/** Title-case + alias cleanup for shopper-facing option text. */
export function normalizeOptionValue(raw) {
  let s = String(raw ?? "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
  if (!s) return s;

  const alias = VALUE_ALIASES[s.toLowerCase()];
  if (alias) return alias;

  if (/^(US|EU|UK|AU|JP)$/i.test(s)) return s.toUpperCase();
  if (/^usb$/i.test(s)) return "USB";
  if (/^type-?c$/i.test(s)) return "USB-C";
  if (/^hdmi$/i.test(s)) return "HDMI";
  {
    const power = s.match(/^(\d+)\s*v(?:\s*(us|eu|uk|au|jp))?$/i);
    if (power) {
      return power[2]
        ? `${power[1]}V ${power[2].toUpperCase()}`
        : `${power[1]}V`;
    }
  }

  return s
    .split(" ")
    .map((tok, i) => {
      if (/^\d/.test(tok) || /\d+(kg|cm|mm|v)$/i.test(tok)) return tok;
      if (/^(xxl|xl|xs|xxs|s|m|l)$/i.test(tok)) return tok.toUpperCase();
      const lower = tok.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
    })
    .join(" ");
}

export function formatVariantKey(key) {
  return key
    .split("-")
    .map((s) => normalizeOptionValue(s.trim()))
    .filter(Boolean)
    .join(" · ");
}

function looksLikeRawSku(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (
    /\d+\s?(cm|mm|in|inch|")/i.test(lower) ||
    /interface|android|apple|typec|black|white|red|blue|green|pink|brown|gray|grey|gold|silver|purple|orange|yellow|beige|navy|size|large|small|medium|scratch|sisal|bear|villa|shell|usb/i.test(
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
  if (tail.length >= 2 && tail.length <= 72 && !looksLikeRawSku(tail)) {
    return normalizeOptionValue(tail);
  }
  const words = nameEn.split(/\s+/);
  const last = words.slice(-6).join(" ");
  if (last.length >= 3 && last.length <= 72 && !looksLikeRawSku(last)) {
    return normalizeOptionValue(last);
  }
  return null;
}

/** CJ label — prefer variantKey, never show raw SKU to shoppers */
export function variantLabel(variant, parentSku, productNameEn) {
  const key = (variant.variantKey || "").trim();
  if (key && key.length <= 120 && !looksLikeRawSku(key)) {
    return formatVariantKey(key);
  }

  const tail = extractTailFromName(variant.variantNameEn, productNameEn);
  if (tail) return tail;

  const sku = variant.variantSku || "";
  const prefix = parentSku ? `${parentSku}-` : "";
  if (prefix && sku.startsWith(prefix)) {
    const suffix = sku.slice(prefix.length);
    if (suffix && !looksLikeRawSku(suffix)) return normalizeOptionValue(suffix);
  }

  const dash = sku.lastIndexOf("-");
  if (dash > 0 && dash < sku.length - 1) {
    const suffix = sku.slice(dash + 1);
    if (suffix && !looksLikeRawSku(suffix)) return normalizeOptionValue(suffix);
  }

  return "Standard";
}

export function parseVariantKeyParts(key) {
  if (!key || looksLikeRawSku(key)) return [];
  return key
    .split("-")
    .map((s) => normalizeOptionValue(s.trim()))
    .filter(Boolean);
}

export function inferDimensionName(values, index) {
  const vals = values.map((v) => normalizeOptionValue(v));
  const colorish = vals.filter(
    (v) => COLOR_WORDS.test(v) || /^(dark|light)\s/i.test(v),
  ).length;
  if (colorish >= Math.max(1, vals.length * 0.45)) return "Color";

  const joined = vals.join(" ").toLowerCase();
  if (joined.includes("interface") || joined.includes("type-c") || joined.includes("typec")) {
    return "Connector";
  }
  if (vals.every((v) => POWER_VALUE.test(v))) return "Power";
  if (vals.every((v) => /^(no case|with case)$/i.test(v) || /\b(case|shell)\b/i.test(v))) {
    return "Case";
  }
  if (vals.every((v) => /^(standard|enhanced|ordinary|pro|basic)$/i.test(v))) {
    return "Model";
  }
  if (vals.every((v) => SIZE_PATTERN.test(v.trim()))) {
    return index === vals.length - 1 ? "Size" : "Length";
  }
  if (vals.every((v) => /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+(\.\d+)?)$/i.test(v.trim()))) {
    return "Size";
  }
  if (vals.every((v) => /\d+\s?cm/i.test(v))) return "Length";
  if (isPackSizeDimension(vals)) return "Pack size";

  if (index === 0) return colorish > 0 ? "Color" : "Style";
  // Never expose "Option 2" to shoppers — prefer Style / Model
  return colorish > 0 ? "Color" : "Model";
}

/** Build option dimensions from all variant keys for grouped UI */
export function buildVariantDimensions(variants, productNameEn) {
  const parsed = variants.map((v) => {
    const key = v.variantKey || v.label || "";
    let parts = parseVariantKeyParts(key);
    if (!parts.length && v.label?.includes(" · ")) {
      parts = v.label.split(" · ").map((s) => normalizeOptionValue(s.trim()));
    }
    if (!parts.length && v.variantNameEn) {
      const tail = extractTailFromName(v.variantNameEn, productNameEn);
      if (tail?.includes(" · ")) parts = tail.split(" · ").map((s) => normalizeOptionValue(s.trim()));
      else if (tail) parts = [tail];
    }
    return parts;
  });

  const maxLen = Math.max(0, ...parsed.map((p) => p.length));
  if (maxLen <= 1) return [];

  const raw = [];
  for (let i = 0; i < maxLen; i++) {
    const values = [...new Set(parsed.map((p) => p[i]).filter(Boolean))];
    if (!values.length) continue;
    raw.push({
      partIndex: i,
      name: inferDimensionName(values, raw.length),
      index: raw.length,
      values,
    });
  }

  // Drop constant dimensions (e.g. "Scratch Resistant" on every SKU)
  const kept = raw.filter((d) => d.values.length > 1);
  // Need 2+ varying dims for grouped UI; single varying dim → flat list
  if (kept.length < 2) return [];
  return kept.map((d, idx) => ({ ...d, index: idx }));
}

export function variantOptionsFromKey(variantKey, dimensions) {
  const parts = parseVariantKeyParts(variantKey);
  const options = {};
  for (const dim of dimensions) {
    const partIndex = dim.partIndex ?? dim.index;
    const value = parts[partIndex];
    if (value) options[dim.name] = value;
  }
  return options;
}

export function buildVariantRecord(v, data, images, price, compareAtPrice) {
  const parentSku = data.productSku || "";
  const productNameEn = data.productNameEn || "";
  const label = variantLabel(v, parentSku, productNameEn);
  const key = (v.variantKey || "").trim();
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
  };
}

/**
 * Recompute shopper labels + optionValues for a full variant list.
 * Drops singleton dims, never writes "Option N", title-cases values.
 */
export function enrichVariantCatalog(variants, productNameEn) {
  if (!variants?.length) return variants;

  const parsed = variants.map((v) => {
    const key = v.variantKey || v.label?.replace(/ · /g, "-") || "";
    let parts = parseVariantKeyParts(key);
    if (!parts.length && v.optionValues) {
      parts = Object.values(v.optionValues).map((x) => normalizeOptionValue(x));
    }
    if (!parts.length && v.label?.includes(" · ")) {
      parts = v.label.split(" · ").map((s) => normalizeOptionValue(s.trim()));
    }
    return parts;
  });

  const maxLen = Math.max(0, ...parsed.map((p) => p.length));
  const rawDims = [];
  for (let i = 0; i < maxLen; i++) {
    const values = [...new Set(parsed.map((p) => p[i]).filter(Boolean))];
    if (!values.length) continue;
    rawDims.push({
      partIndex: i,
      name: inferDimensionName(values, rawDims.length),
      values,
    });
  }

  const kept = rawDims.filter((d) => d.values.length > 1);
  // Deduplicate dimension names if infer collides
  const usedNames = new Set();
  for (const d of kept) {
    let name = d.name;
    if (usedNames.has(name)) {
      name = name === "Style" ? "Model" : `${name} 2`;
    }
    usedNames.add(name);
    d.name = name;
  }

  return variants.map((v, vi) => {
    const parts = parsed[vi] || [];
    const keptParts = kept.length
      ? kept.map((d) => parts[d.partIndex]).filter(Boolean)
      : parts.filter(Boolean);

    const label =
      keptParts.length > 0
        ? keptParts.join(" · ")
        : normalizeOptionValue(v.label || "Default");

    const optionValues = {};
    if (kept.length >= 2) {
      for (const d of kept) {
        const value = parts[d.partIndex];
        if (value) optionValues[d.name] = value;
      }
    }

    const variantKey =
      keptParts.length > 0 ? keptParts.join("-") : v.variantKey;

    return {
      ...v,
      label,
      variantKey: variantKey || undefined,
      optionValues: Object.keys(optionValues).length ? optionValues : undefined,
    };
  });
}

export function getCatalogDimensions(variants) {
  const names = new Set();
  for (const v of variants) {
    if (v.optionValues) Object.keys(v.optionValues).forEach((k) => names.add(k));
  }
  if (!names.size) return [];
  const order = ["Color", "Connector", "Style", "Model", "Case", "Power", "Pack size", "Size", "Length"];
  return [...names].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
