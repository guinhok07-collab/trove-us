type PaymentButtonVariant = "paypal" | "card" | "paylater";

const variantStyles: Record<
  PaymentButtonVariant,
  { className: string; label: string }
> = {
  paypal: {
    className: "border border-[#f0b429] bg-[#ffc439] text-[#003087]",
    label: "Pay with PayPal",
  },
  card: {
    className: "border border-[#1c1917] bg-[#2c2e2f] text-white",
    label: "Debit or credit card",
  },
  paylater: {
    className: "border border-[#e7e5e4] bg-white text-[#1c1917]",
    label: "Pay in 4",
  },
};

export function PaymentButtonShell({
  variant,
  disabled = true,
  loading = false,
}: {
  variant: PaymentButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { className, label } = variantStyles[variant];

  return (
    <div
      aria-hidden={disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm ${className} ${
        disabled ? "cursor-not-allowed opacity-70" : ""
      }`}
    >
      {variant === "paypal" ? (
        <span className="tracking-tight">
          Pay<span className="font-bold text-[#009cde]">Pal</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
      {loading ? (
        <span className="text-xs font-medium opacity-80">Loading…</span>
      ) : null}
    </div>
  );
}
