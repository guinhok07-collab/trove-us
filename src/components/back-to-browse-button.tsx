"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readBrowseReturn } from "@/lib/browse-return";

interface BackToBrowseButtonProps {
  fallbackHref: string;
  fallbackLabel: string;
}

export function BackToBrowseButton({
  fallbackHref,
  fallbackLabel,
}: BackToBrowseButtonProps) {
  const router = useRouter();
  const [returnHref, setReturnHref] = useState(fallbackHref);
  const [returnLabel, setReturnLabel] = useState(fallbackLabel);

  useEffect(() => {
    const saved = readBrowseReturn();
    if (saved) {
      setReturnHref(saved.path);
      setReturnLabel(saved.label);
    }
  }, []);

  function handleBackClick(event: React.MouseEvent<HTMLAnchorElement>) {
    const saved = readBrowseReturn();
    if (saved) {
      event.preventDefault();
      router.push(saved.path);
    }
  }

  return (
    <Link
      href={returnHref}
      onClick={handleBackClick}
      className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-white px-4 py-2.5 text-sm font-semibold text-[#44403c] shadow-sm transition hover:border-[#5f8a7a] hover:text-[#4d7366]"
    >
      <span aria-hidden className="text-base leading-none">
        ←
      </span>
      {returnLabel}
    </Link>
  );
}
