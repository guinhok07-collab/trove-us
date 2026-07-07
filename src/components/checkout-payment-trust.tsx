import { Icon, type TrustIconName } from "@/components/icons";

const badges: Array<{ icon: TrustIconName; label: string }> = [
  { icon: "lock", label: "SSL secure" },
  { icon: "credit-card", label: "PayPal protected" },
  { icon: "package", label: "Free US shipping" },
  { icon: "return", label: "30-day returns" },
];

export function CheckoutPaymentTrust() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 rounded-lg border border-[#e7e5e4] bg-[#fafaf9] px-3 py-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef4f1]">
            <Icon name={badge.icon} size={14} className="text-[#5f8a7a]" />
          </span>
          <span className="text-[11px] font-medium leading-tight text-[#57534e]">
            {badge.label}
          </span>
        </div>
      ))}
    </div>
  );
}
