import Link from "next/link";
import { brand } from "@/data/brand";

interface PolicyLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PolicyLayout({ title, children }: PolicyLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-[#a8a29e]">
        <Link href="/" className="hover:text-[#4d7366]">
          {brand.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#57534e]">{title}</span>
      </nav>

      <h1 className="section-title text-3xl">{title}</h1>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#78716c]">
        {children}
      </div>
    </div>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-[#1c1917]">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
