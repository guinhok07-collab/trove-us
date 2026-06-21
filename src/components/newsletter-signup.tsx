"use client";

import { useState } from "react";
import { copy } from "@/data/brand";

interface NewsletterSignupProps {
  compact?: boolean;
}

export function NewsletterSignup({ compact }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not subscribe.");
      }
      setStatus("success");
      setMessage(copy.newsletterSuccess);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not subscribe. Try again.",
      );
    }
  }

  return (
    <div className={compact ? "" : "mt-4"}>
      {!compact && (
        <>
          <p className="text-sm font-semibold text-[#1c1917]">
            {copy.newsletterTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#78716c]">
            {copy.newsletterText}
          </p>
        </>
      )}
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder={copy.newsletterPlaceholder}
          aria-label={copy.newsletterPlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-[#5f8a7a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4d7366] disabled:opacity-60"
        >
          {status === "loading" ? "Joining…" : copy.newsletterButton}
        </button>
      </form>
      {message && (
        <p
          className={`mt-2 text-xs ${
            status === "success" ? "text-[#166534]" : "text-[#991b1b]"
          }`}
        >
          {message}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-[#a8a29e]">
        {copy.newsletterFinePrint}
      </p>
    </div>
  );
}
