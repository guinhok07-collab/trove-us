import { copy } from "@/data/brand";
import { Icon } from "@/components/icons";

export function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`border-b border-[#e7e5e4]/60 bg-white/60 ${className}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 gap-y-1 overflow-x-auto px-4 py-2 sm:gap-x-8 sm:py-3.5 sm:px-6">
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
