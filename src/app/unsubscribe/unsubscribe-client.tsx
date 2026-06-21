"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { brand, copy } from "@/data/brand";

type PageMode = "signup" | "unsubscribe" | "loading";
type Result = "idle" | "success" | "error";

export default function UnsubscribePageClient() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<PageMode>("signup");
  const [result, setResult] = useState<Result>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qEmail = params.get("email")?.trim() ?? "";
    const qToken = params.get("token")?.trim() ?? "";
    const wantsUnsubscribe = params.get("action") === "unsubscribe";

    if (qEmail) setEmail(qEmail);
    if (qToken) setToken(qToken);

    if (qEmail && qToken) {
      setMode("loading");
      void runUnsubscribe(qEmail, qToken);
    } else if (wantsUnsubscribe) {
      setMode("unsubscribe");
    }
  }, []);

  async function runSubscribe(targetEmail: string) {
    setResult("idle");
    setMessage(null);

    try {
      const res = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not subscribe.");
      }
      setResult("success");
      setMessage(copy.dealsPageSuccess);
      setEmail("");
    } catch (err) {
      setResult("error");
      setMessage(
        err instanceof Error ? err.message : "Could not subscribe. Try again.",
      );
    }
  }

  async function runUnsubscribe(targetEmail: string, targetToken?: string) {
    setResult("idle");
    setMessage(null);

    try {
      const res = await fetch("/api/marketing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          token: targetToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not unsubscribe.");
      }
      setMode("unsubscribe");
      setResult("success");
      setMessage(copy.unsubscribeSuccess);
    } catch (err) {
      setMode("unsubscribe");
      setResult("error");
      setMessage(
        err instanceof Error ? err.message : "Could not unsubscribe. Try again.",
      );
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await runSubscribe(email.trim());
  }

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await runUnsubscribe(email.trim(), token || undefined);
  }

  if (mode === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-[#78716c]">Updating your email preferences…</p>
      </div>
    );
  }

  if (mode === "unsubscribe") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="section-title text-2xl">{copy.unsubscribeTitle}</h1>
        <p className="section-subtitle mt-2">{copy.unsubscribeText}</p>

        {result === "success" ? (
          <div className="card mt-8 space-y-4 p-6 text-sm leading-relaxed text-[#57534e]">
            <p>{message}</p>
            <Link
              href="/products"
              className="inline-block text-sm font-semibold text-[#5f8a7a]"
            >
              Continue shopping →
            </Link>
            <p className="text-xs text-[#a8a29e]">
              Changed your mind?{" "}
              <Link href="/unsubscribe" className="text-[#5f8a7a] hover:underline">
                Join the deals list again
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="card mt-8 space-y-4 p-6">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.newsletterPlaceholder}
              aria-label={copy.newsletterPlaceholder}
              className="w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-[#e7e5e4] py-3 text-sm font-semibold text-[#57534e] hover:border-[#d6d3d1]"
            >
              {copy.unsubscribeButton}
            </button>
            {message && result === "error" && (
              <p className="text-sm text-[#991b1b]">{message}</p>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[#a8a29e]">
          Need help?{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="section-title text-2xl">{copy.dealsPageTitle}</h1>
      <p className="section-subtitle mt-2">{copy.dealsPageText}</p>

      {result === "success" ? (
        <div className="card mt-8 space-y-4 p-6 text-sm leading-relaxed text-[#57534e]">
          <p>{message}</p>
          <Link
            href="/products"
            className="inline-block text-sm font-semibold text-[#5f8a7a]"
          >
            Start shopping →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSignup} className="card mt-8 space-y-4 p-6">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.newsletterPlaceholder}
            aria-label={copy.newsletterPlaceholder}
            className="w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
          />
          <button
            type="submit"
            className="btn-primary w-full py-3"
          >
            {copy.dealsPageButton}
          </button>
          {message && result === "error" && (
            <p className="text-sm text-[#991b1b]">{message}</p>
          )}
          <p className="text-[11px] leading-relaxed text-[#a8a29e]">
            {copy.newsletterFinePrint}
          </p>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-[#a8a29e]">
        {copy.dealsPageUnsubscribeHint}{" "}
        <Link
          href="/unsubscribe?action=unsubscribe"
          className="font-medium text-[#5f8a7a] hover:underline"
        >
          {copy.dealsPageUnsubscribeLink}
        </Link>
      </p>
    </div>
  );
}
