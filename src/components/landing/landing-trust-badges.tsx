import { Icon, type TrustIconName } from "@/components/icons";

interface LandingTrustBadgesProps {
  badges: Array<{ icon: TrustIconName; label: string }>;
  className?: string;
}

export function LandingTrustBadges({ badges, className = "" }: LandingTrustBadgesProps) {
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          className="flex items-center gap-2 text-xs font-medium text-[#78716c] sm:text-sm"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef4f1]">
            <Icon name={badge.icon} size={13} className="text-[#5f8a7a]" />
          </span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
