import Link from "next/link";
import { brand, copy } from "@/data/brand";

export function AboutSection() {
  return (
    <section className="card mt-12 grid gap-8 p-8 lg:grid-cols-2">
      <div>
        <h2 className="section-title">{copy.aboutTitle}</h2>
        <p className="mt-4 text-base leading-relaxed text-[#57534e]">
          {copy.aboutText}
        </p>
        <Link
          href="/about"
          className="mt-5 inline-block text-sm font-semibold text-[#5f8a7a] hover:text-[#4d7366]"
        >
          Learn more about us →
        </Link>
      </div>
      <ul className="space-y-4">
        {copy.aboutPoints.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-sm leading-relaxed text-[#57534e]"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef4f1] text-xs text-[#4d7366]">
              ✓
            </span>
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GuaranteeBanner() {
  return (
    <section className="mt-10 rounded-3xl bg-[#eef4f1] px-6 py-10 text-center sm:px-10">
      <h2 className="section-title text-[#1c1917]">{copy.guaranteeTitle}</h2>
      <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[#57534e]">
        {copy.guaranteeText}
      </p>
      <a
        href={`mailto:${brand.supportEmail}`}
        className="btn-primary mt-6 px-6 py-3"
      >
        Contact Support
      </a>
    </section>
  );
}
