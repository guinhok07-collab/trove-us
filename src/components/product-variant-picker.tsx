"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductVariant } from "@/types/product";
import {
  findVariantByOptions,
  getAvailableValues,
  getOptionValue,
  getVariantDimensions,
  representativeVariantForOption,
  type VariantDimension,
} from "@/lib/catalog/variant-label";

interface ProductVariantPickerProps {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
}

function buildInitialSelection(
  variants: ProductVariant[],
  dimensions: VariantDimension[],
  selectedId: string,
) {
  const current = variants.find((v) => v.id === selectedId) ?? variants[0];
  const selected: Record<string, string> = {};
  for (const dim of dimensions) {
    selected[dim.name] = getOptionValue(current, dim.name, dim.index);
  }
  return selected;
}

export function ProductVariantPicker({
  variants,
  selectedId,
  onSelect,
}: ProductVariantPickerProps) {
  if (variants.length <= 1) return null;

  const dimensions = useMemo(() => getVariantDimensions(variants), [variants]);
  const useGrouped = dimensions.length > 1;

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    useGrouped ? buildInitialSelection(variants, dimensions, selectedId) : {},
  );

  useEffect(() => {
    if (!useGrouped) return;
    setSelectedOptions(buildInitialSelection(variants, dimensions, selectedId));
  }, [selectedId, variants, dimensions, useGrouped]);

  useEffect(() => {
    if (!useGrouped) return;
    const match = findVariantByOptions(variants, dimensions, selectedOptions);
    if (match && match.id !== selectedId) onSelect(match.id);
  }, [selectedOptions, useGrouped, variants, dimensions, selectedId, onSelect]);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  const pickOption = (dim: VariantDimension, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [dim.name]: value }));
  };

  if (useGrouped) {
    return (
      <div className="mt-6 space-y-4 border-b border-[#f5f5f4] pb-6">
        <p className="text-sm font-semibold text-[#1c1917]">
          Selected:{" "}
          <span className="font-normal text-[#57534e]">{selected.label}</span>
        </p>

        {dimensions.map((dim) => {
          const available = getAvailableValues(variants, dimensions, dim, selectedOptions);
          const current = selectedOptions[dim.name];
          const isColor = dim.name === "Color";

          return (
            <div key={dim.name}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#78716c]">
                {dim.name}
                {current ? (
                  <span className="ml-2 normal-case tracking-normal text-[#57534e]">
                    — {current}
                  </span>
                ) : null}
              </p>

              {isColor ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {available.map((value) => {
                    const rep = representativeVariantForOption(
                      variants,
                      dimensions,
                      dim,
                      value,
                      selectedOptions,
                    );
                    const active = current === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        title={value}
                        onClick={() => pickOption(dim, value)}
                        className={`relative h-11 w-11 overflow-hidden rounded-lg border-2 bg-[#fafaf9] transition ${
                          active
                            ? "border-[#5f8a7a] ring-2 ring-[#5f8a7a]/25"
                            : "border-[#e7e5e4] hover:border-[#5f8a7a]/40"
                        }`}
                      >
                        {rep?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rep.image}
                            alt={value}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center px-1 text-[10px] font-medium text-[#57534e]">
                            {value.slice(0, 3)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {available.map((value) => {
                    const active = current === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => pickOption(dim, value)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                          active
                            ? "border-[#5f8a7a] bg-[#eef4f1] font-semibold text-[#4d7366]"
                            : "border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#5f8a7a]/40"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const compactGrid = variants.length > 8;

  return (
    <div className="mt-6 border-b border-[#f5f5f4] pb-6">
      <p className="text-sm font-semibold text-[#1c1917]">
        Options
        <span className="ml-2 font-normal text-[#57534e]">{selected.label}</span>
      </p>

      <div
        className={`mt-3 ${
          compactGrid
            ? "grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10"
            : "flex flex-wrap gap-2"
        }`}
      >
        {variants.map((variant) => {
          const active = variant.id === selectedId;
          if (compactGrid) {
            return (
              <button
                key={variant.id}
                type="button"
                title={variant.label}
                onClick={() => onSelect(variant.id)}
                disabled={!variant.inStock}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-[#fafaf9] transition ${
                  active
                    ? "border-[#5f8a7a] ring-2 ring-[#5f8a7a]/25"
                    : "border-[#e7e5e4] hover:border-[#5f8a7a]/40"
                } ${!variant.inStock ? "cursor-not-allowed opacity-45" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={variant.image}
                  alt={variant.label}
                  className="h-full w-full object-contain p-1"
                />
              </button>
            );
          }

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              disabled={!variant.inStock}
              title={variant.label}
              className={`inline-flex max-w-[220px] items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${
                active
                  ? "border-[#5f8a7a] bg-[#eef4f1] text-[#4d7366]"
                  : "border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#5f8a7a]/40"
              } ${!variant.inStock ? "cursor-not-allowed opacity-45" : ""}`}
            >
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[#f5f5f4] ring-1 ring-[#e7e5e4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={variant.image}
                  alt=""
                  className="h-full w-full object-contain p-0.5"
                />
              </span>
              <span className="truncate text-left">{variant.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
