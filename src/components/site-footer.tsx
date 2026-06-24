import Link from "next/link";

import { brand } from "@/data/brand";
import { NewsletterSignup } from "@/components/newsletter-signup";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#e7e5e4] bg-white pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-8 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-display text-lg font-semibold text-[#1c1917]">
            {brand.name}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#78716c]">
            {brand.description}
          </p>
          <p className="mt-3 text-xs text-[#a8a29e]">{brand.locationLine}</p>
          <NewsletterSignup />
        </div>

        <div>
          <p className="text-sm font-semibold text-[#1c1917]">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm text-[#78716c]">
            <li>
              <Link href="/products" className="hover:text-[#4d7366]">
                All Products
              </Link>
            </li>
            <li>
              <Link href="/stores/pet" className="hover:text-[#4d7366]">
                Pet Essentials
              </Link>
            </li>
            <li>
              <Link href="/stores/home" className="hover:text-[#4d7366]">
                Home Comfort
              </Link>
            </li>
            <li>
              <Link href="/stores/wellness" className="hover:text-[#4d7366]">
                Wellness Studio
              </Link>
            </li>
            <li>
              <Link href="/stores/tech" className="hover:text-[#4d7366]">
                Desk & Tech
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-[#1c1917]">Customer Care</p>
          <ul className="mt-4 space-y-2.5 text-sm text-[#78716c]">
            <li>
              <Link href="/track" className="hover:text-[#4d7366]">
                Track Order
              </Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-[#4d7366]">
                Start a Return
              </Link>
            </li>
            <li>
              <Link href="/shipping-returns" className="hover:text-[#4d7366]">
                Shipping & Returns
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#4d7366]">
                About Us
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${brand.supportEmail}`}
                className="hover:text-[#4d7366]"
              >
                {brand.supportEmail}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-[#1c1917]">Policies</p>
          <ul className="mt-4 space-y-2.5 text-sm text-[#78716c]">
            <li>
              <Link href="/privacy" className="hover:text-[#4d7366]">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[#4d7366]">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/shipping-returns" className="hover:text-[#4d7366]">
                Return Policy
              </Link>
            </li>
            <li>
              <Link href="/unsubscribe" className="hover:text-[#4d7366]">
                Deals & email signup
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#f5f5f4] py-5 text-center text-xs text-[#a8a29e]">
        © {new Date().getFullYear()} {brand.name}. {brand.trustLine}
      </div>
    </footer>
  );
}
