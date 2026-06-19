import { copy } from "@/data/brand";
import { Icon } from "@/components/icons";

export function TrustStrip() {
  return (
    <div className="border-b border-[#e7e5e4]/60 bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2.5 px-4 py-3.5 sm:px-6">
        {copy.trustStrip.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-2 text-xs font-medium text-[#78716c]"
          >
            <Icon name={item.icon} size={15} className="text-[#5f8a7a]" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
