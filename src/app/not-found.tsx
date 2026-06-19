import Link from "next/link";
import { brand } from "@/data/brand";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#5f8a7a]">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-[#1c1917]">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#78716c]">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary px-6 py-3">
          Back to {brand.name}
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center rounded-full border border-[#e7e5e4] bg-white px-6 py-3 text-sm font-semibold text-[#44403c] hover:border-[#5f8a7a]"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
