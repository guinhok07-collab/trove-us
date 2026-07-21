import type { ProductReview } from "@/data/product-reviews";

function StarRating({ rating }: { rating: number }) {
  const stars = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="text-sm tracking-wide text-[#b8956a]" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(stars)}
      <span className="text-[#e7e5e4]">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

interface ProductReviewsSectionProps {
  reviews: ProductReview[];
  productName: string;
}

export function ProductReviewsSection({ reviews, productName }: ProductReviewsSectionProps) {
  if (reviews.length === 0) return null;

  const shown = reviews.slice(0, 3);

  return (
    <section className="mt-8 border-t border-[#e7e5e4] pt-8 sm:mt-12 sm:pt-10">
      <h2 className="section-title">Customer reviews</h2>
      <p className="section-subtitle mt-1 text-sm">
        What shoppers say about {productName}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {shown.map((review) => (
          <article key={review.name} className="card flex flex-col p-4 sm:p-5">
            <StarRating rating={review.rating} />
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[#57534e]">
              &ldquo;{review.quote}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3 border-t border-[#f5f5f4] pt-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef4f1] text-xs font-semibold text-[#4d7366]">
                {review.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div>
                <p className="text-sm font-medium text-[#1c1917]">{review.name}</p>
                <p className="text-xs text-[#a8a29e]">
                  Verified buyer · {review.location}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
