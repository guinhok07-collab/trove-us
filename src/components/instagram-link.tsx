import { brand } from "@/data/brand";

export function InstagramLink({
  className = "",
  showHandle = true,
}: {
  className?: string;
  showHandle?: boolean;
}) {
  return (
    <a
      href={brand.instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 hover:text-[#4d7366] ${className}`}
      aria-label="Follow Trove on Instagram"
    >
      <InstagramIcon />
      {showHandle ? <span>{brand.instagramHandle}</span> : null}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
