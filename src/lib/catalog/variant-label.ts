import type { ProductVariant } from "@/types/product";

const COLOR_WORDS =
  /^(black|white|red|blue|green|yellow|pink|purple|orange|brown|grey|gray|silver|gold|beige|navy|khaki|rose|cyan|teal|ivory|coffee|wine|apricot|army green|dark blue|light blue|dark gray|light gray|dark grey|light grey|ivory white|white gray|black set)/i;

const SIZE_PATTERN =
  /^(\d+(\.\d+)?\s?(cm|mm|in|inch|inches|"))$|^((XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL))$/i;

const PACK_VALUE = /^\d+\s*pcs?$/i;
const POWER_VALUE = /^(US|EU|UK|AU|JP|\d+\s*V(\s*US)?)$/i;
const SMALL_WORDS = new Set(["a", "an", "the", "of", "and", "or", "for", "to", "with"]);

const VALUE_ALIASES: Record<string, string> = {
  ordinary: "Standard",
  "ordinary paragraph": "Standard",
  "combination paragraph": "Bundle",
  "to enhance": "Enhanced",
  "without shell": "No case",
  "with shell": "With case",
  usb: "USB",
  "basic payment": "Standard",
  "as picture": "As shown",
  "as shown": "As shown",
  default: "Standard",
  single: "1 Pack",
};

export interface VariantDimension {
  name: string;
  /** Shopper-facing label (e.g. "Pack size" instead of "Option 2") */
  displayName: string;
  index: number;
  values: string[];
}

export function looksLikePackValue(value: string): boolean {
  return PACK_VALUE.test(value.trim());
}

export function isPackSizeDimension(values: string[]): boolean {
  return values.length > 0 && values.every(looksLikePackValue);
}

export function normalizeOptionValue(raw: string): string {
  let s = String(raw ?? "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/\s+/g, " ");
  if (!s) return s;

  const alias = VALUE_ALIASES[s.toLowerCase()];
  if (alias) return alias;

  if (/^(US|EU|UK|AU|JP)$/i.test(s)) return s.toUpperCase();
  if (/^[a-z]$/i.test(s)) return `Style ${s.toUpperCase()}`;
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

function looksLikeRawSku(value: string) {
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

export function parseVariantKeyParts(key: string) {
  if (!key || looksLikeRawSku(key)) return [];
  return key
    .split("-")
    .map((s) => normalizeOptionValue(s.trim()))
    .filter(Boolean);
}

function inferDimensionName(values: string[], index: number) {
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
  return colorish > 0 ? "Color" : "Model";
}

function resolveDisplayName(internalName: string, values: string[], index: number): string {
  if (isPackSizeDimension(values)) return "Pack size";
  if (/^Option \d+$/i.test(internalName)) {
    return inferDimensionName(values, index);
  }
  return internalName;
}

function sortDimensionValues(values: string[], displayName: string): string[] {
  const normalized = values.map(normalizeOptionValue);
  if (displayName === "Pack size") {
    return [...normalized].sort((a, b) => {
      const na = Number(a.match(/(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/(\d+)/)?.[1] ?? 0);
      return na - nb || a.localeCompare(b);
    });
  }
  return [...new Set(normalized)];
}

export function getVariantDimensions(variants: ProductVariant[]): VariantDimension[] {
  const withOptions = variants.find(
    (v) => v.optionValues && Object.keys(v.optionValues).length > 0,
  );
  if (withOptions?.optionValues) {
    const order = [
      "Color",
      "Connector",
      "Style",
      "Model",
      "Case",
      "Power",
      "Pack size",
      "Size",
      "Length",
    ];
    const names = Object.keys(withOptions.optionValues).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const dims = names
      .map((name, index) => {
        const values = [
          ...new Set(
            variants
              .map((v) => v.optionValues?.[name])
              .filter((v): v is string => Boolean(v))
              .map(normalizeOptionValue),
          ),
        ];
        const displayName = resolveDisplayName(name, values, index);
        return {
          name,
          displayName,
          index,
          values: sortDimensionValues(values, displayName),
        };
      })
      // Drop constant dims (one value on every SKU) and never show lone "Option N"
      .filter((d) => d.values.length > 1);

    // Need 2+ varying dimensions for grouped UI; otherwise flat variant list
    if (dims.length < 2) return [];
    return dims.map((d, index) => ({ ...d, index }));
  }

  const parsed = variants.map((v) => {
    const key = v.variantKey || v.label.replace(/ · /g, "-");
    return parseVariantKeyParts(key);
  });

  const maxLen = Math.max(0, ...parsed.map((p) => p.length));
  if (maxLen <= 1) return [];

  const raw: VariantDimension[] = [];
  for (let i = 0; i < maxLen; i++) {
    const values = [...new Set(parsed.map((p) => p[i]).filter(Boolean))];
    if (!values.length) continue;
    if (values.length <= 1) continue;
    const displayName = inferDimensionName(values, raw.length);
    raw.push({
      name: displayName,
      displayName,
      index: raw.length,
      values: sortDimensionValues(values, displayName),
    });
  }
  if (raw.length < 2) return [];
  return raw;
}

export function getOptionValue(variant: ProductVariant, dimName: string, dimIndex: number) {
  const raw = variant.optionValues?.[dimName];
  if (raw) return normalizeOptionValue(raw);
  const parts = parseVariantKeyParts(variant.variantKey || variant.label.replace(/ · /g, "-"));
  return parts[dimIndex] ?? "";
}

export function findVariantByOptions(
  variants: ProductVariant[],
  dimensions: VariantDimension[],
  selected: Record<string, string>,
): ProductVariant | undefined {
  return variants.find((v) =>
    dimensions.every(
      (d) => getOptionValue(v, d.name, d.index) === normalizeOptionValue(selected[d.name] || ""),
    ),
  );
}

export function getAvailableValues(
  variants: ProductVariant[],
  dimensions: VariantDimension[],
  dim: VariantDimension,
  selected: Record<string, string>,
): string[] {
  return dim.values.filter((value) =>
    variants.some((v) => {
      if (getOptionValue(v, dim.name, dim.index) !== value) return false;
      return dimensions.every((d) => {
        if (d.name === dim.name) return true;
        const sel = selected[d.name];
        if (!sel) return true;
        return getOptionValue(v, d.name, d.index) === normalizeOptionValue(sel);
      });
    }),
  );
}

export function representativeVariantForOption(
  variants: ProductVariant[],
  dimensions: VariantDimension[],
  dim: VariantDimension,
  value: string,
  selected: Record<string, string>,
): ProductVariant | undefined {
  return variants.find((v) => {
    if (getOptionValue(v, dim.name, dim.index) !== value) return false;
    return dimensions.every((d) => {
      if (d.name === dim.name) return true;
      const sel = selected[d.name];
      if (!sel) return true;
      return getOptionValue(v, d.name, d.index) === normalizeOptionValue(sel);
    });
  });
}

export function optionPricesVary(
  variants: ProductVariant[],
  dimensions: VariantDimension[],
  dim: VariantDimension,
  selected: Record<string, string>,
  availableValues: string[],
): boolean {
  const prices = availableValues
    .map(
      (value) =>
        representativeVariantForOption(variants, dimensions, dim, value, selected)?.price,
    )
    .filter((p): p is number => p != null);
  return new Set(prices).size > 1;
}
