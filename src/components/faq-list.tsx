import { IconBox } from "@/components/icons";

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqListProps {
  items: readonly FaqItem[];
}

export function FaqList({ items }: FaqListProps) {
  return (
    <div className="divide-y divide-[#e7e5e4] overflow-hidden rounded-xl border border-[#e7e5e4] bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-4 py-3.5 sm:px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#1c1917] marker:content-none [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <span className="shrink-0 text-lg font-normal text-[#a8a29e] transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2.5 text-sm leading-relaxed text-[#57534e]">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

interface WhyShopGridProps {
  items: readonly {
    icon: "badge-check" | "truck" | "support" | "return" | "lock" | "credit-card" | "package" | "map-pin";
    title: string;
    text: string;
  }[];
}

export function WhyShopGrid({ items }: WhyShopGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="card p-4">
          <IconBox name={item.icon} size="md" />
          <p className="mt-3 text-sm font-semibold text-[#1c1917]">{item.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#78716c]">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
