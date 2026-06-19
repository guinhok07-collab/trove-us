import type { ReactNode } from "react";
import { StoreCategory } from "@/types/product";

export type TrustIconName =
  | "badge-check"
  | "truck"
  | "return"
  | "support"
  | "lock"
  | "credit-card"
  | "package"
  | "map-pin";

export type IconName = TrustIconName | StoreCategory;

const iconPaths: Record<IconName, ReactNode> = {
  "badge-check": (
    <>
      <path d="M12 2l2.4 1.2 2.6-.2 1.4 2.2 2.2 1.4-.2 2.6L22 12l-1.2 2.4.2 2.6-2.2 1.4-1.4 2.2-2.6-.2L12 22l-2.4-1.2-2.6.2-1.4-2.2-2.2-1.4.2-2.6L2 12l1.2-2.4-.2-2.6 2.2-1.4 1.4-2.2 2.6.2L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h4l3 3v2h-7v-5z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </>
  ),
  return: (
    <>
      <path d="M3 7v6h6" />
      <path d="M21 17a8 8 0 00-14-5.3L3 13" />
    </>
  ),
  support: (
    <>
      <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8 8 0 01-7.6 4.7 8 8 0 01-7.6-4.7 8.4 8.4 0 01-.9-3.8V7l8-3 8 3z" />
      <path d="M8 14.5a4 4 0 008 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 118 0v3" />
    </>
  ),
  "credit-card": (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  package: (
    <>
      <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" />
      <path d="M12 12l8-4.5M12 12v10M12 12L4 7.5" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s6-5.1 6-10a6 6 0 10-12 0c0 4.9 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </>
  ),
  pet: (
    <>
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="5" cy="13" r="1.75" />
      <circle cx="19" cy="13" r="1.75" />
      <path d="M12 11c-2.8 0-5 2-5 4.5 0 2.2 1.6 3.5 5 3.5s5-1.3 5-3.5c0-2.5-2.2-4.5-5-4.5z" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
    </>
  ),
  wellness: (
    <>
      <path d="M12 20.5c-4.5-3.2-7-6.2-7-9.5a4 4 0 017-2.4 4 4 0 017 2.4c0 3.3-2.5 6.3-7 9.5z" />
    </>
  ),
  tech: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({
  name,
  className = "text-[#5f8a7a]",
  size = 20,
  strokeWidth = 1.75,
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {iconPaths[name]}
    </svg>
  );
}

interface IconBoxProps {
  name: IconName;
  size?: "sm" | "md" | "lg";
  variant?: "soft" | "white" | "muted";
  className?: string;
}

const boxSizes = {
  sm: { box: "h-9 w-9", icon: 16 },
  md: { box: "h-11 w-11", icon: 20 },
  lg: { box: "h-14 w-14", icon: 24 },
};

const boxVariants = {
  soft: "bg-[#eef4f1] text-[#4d7366]",
  white: "bg-white/80 text-[#4d7366] shadow-sm",
  muted: "bg-[#f5f5f4] text-[#57534e]",
};

export function IconBox({
  name,
  size = "md",
  variant = "soft",
  className = "",
}: IconBoxProps) {
  const { box, icon } = boxSizes[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${box} ${boxVariants[variant]} ${className}`}
    >
      <Icon name={name} size={icon} className="currentColor" />
    </span>
  );
}

export function StoreIcon({
  store,
  size = "md",
  variant = "soft",
}: {
  store: StoreCategory;
  size?: "sm" | "md" | "lg";
  variant?: "soft" | "white" | "muted";
}) {
  return <IconBox name={store} size={size} variant={variant} />;
}
