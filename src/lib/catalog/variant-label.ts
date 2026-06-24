import type { ProductVariant } from "@/types/product";

const COLOR_WORDS =
  /^(black|white|red|blue|green|yellow|pink|purple|orange|brown|grey|gray|silver|gold|beige|navy|khaki|rose|cyan|teal|ivory|coffee|wine|apricot|army green|dark blue|light blue|dark gray|light gray|dark grey|light grey)/i;

const SIZE_PATTERN = /^(\d+(\.\d+)?\s?(cm|mm|in|inch|inches|"))$|^((XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL))$/i;

const PACK_VALUE = /^\d+\s*pcs?$/i;

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

function looksLikeRawSku(value: string) {
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

export function parseVariantKeyParts(key: string) {
  if (!key || looksLikeRawSku(key)) return [];
  return key
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean);
}

function inferDimensionName(values: string[], index: number) {
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

function resolveDisplayName(internalName: string, values: string[], index: number): string {
  if (isPackSizeDimension(values)) return "Pack size";
  if (/^Option \d+$/i.test(internalName)) {
    const inferred = inferDimensionName(values, index);
    if (!/^Option \d+$/i.test(inferred)) return inferred;
  }
  return internalName;
}

function sortDimensionValues(values: string[], displayName: string): string[] {
  if (displayName === "Pack size") {
    return [...values].sort((a, b) => {
      const na = Number(a.match(/(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/(\d+)/)?.[1] ?? 0);
      return na - nb || a.localeCompare(b);
    });
  }
  return values;
}

export function getVariantDimensions(variants: ProductVariant[]): VariantDimension[] {
  const withOptions = variants.find(
    (v) => v.optionValues && Object.keys(v.optionValues).length > 0,
  );
  if (withOptions?.optionValues) {
    const order = ["Color", "Connector", "Style", "Pack size", "Size", "Length"];
    const names = Object.keys(withOptions.optionValues).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return names.map((name, index) => {
      const values = [
        ...new Set(
          variants.map((v) => v.optionValues?.[name]).filter((v): v is string => Boolean(v)),
        ),
      ];
      const displayName = resolveDisplayName(name, values, index);
      return {
        name,
        displayName,
        index,
        values: sortDimensionValues(values, displayName),
      };
    });
  }

  const parsed = variants.map((v) => {
    const key = v.variantKey || v.label.replace(/ · /g, "-");
    return parseVariantKeyParts(key);
  });

  const maxLen = Math.max(0, ...parsed.map((p) => p.length));
  if (maxLen <= 1) return [];

  const dimensions: VariantDimension[] = [];
  for (let i = 0; i < maxLen; i++) {
    const values = [...new Set(parsed.map((p) => p[i]).filter(Boolean))];
    if (!values.length) continue;
    const displayName = inferDimensionName(values, i);
    dimensions.push({
      name: displayName,
      displayName,
      index: i,
      values: sortDimensionValues(values, displayName),
    });
  }
  return dimensions;
}

export function getOptionValue(variant: ProductVariant, dimName: string, dimIndex: number) {
  if (variant.optionValues?.[dimName]) return variant.optionValues[dimName];
  const parts = parseVariantKeyParts(variant.variantKey || variant.label.replace(/ · /g, "-"));
  return parts[dimIndex] ?? "";
}

export function findVariantByOptions(
  variants: ProductVariant[],
  dimensions: VariantDimension[],
  selected: Record<string, string>,
): ProductVariant | undefined {
  return variants.find((v) =>
    dimensions.every((d) => getOptionValue(v, d.name, d.index) === selected[d.name]),
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
        return getOptionValue(v, d.name, d.index) === sel;
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
      return getOptionValue(v, d.name, d.index) === sel;
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
