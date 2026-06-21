"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { brand, copy } from "@/data/brand";

export default function UnsubscribePageClient() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qEmail = params.get("email")?.trim() ?? "";
    const qToken = params.get("token")?.trim() ?? "";
    if (qEmail) setEmail(qEmail);
    if (qToken) setToken(qToken);
    if (qEmail && qToken) {
      void unsubscribe(qEmail, qToken);
    }
  }, []);

  async function unsubscribe(targetEmail: string, targetToken?: string) {
    setStatus("loading");
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
      setStatus("done");
      setMessage(copy.unsubscribeSuccess);
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not unsubscribe. Try again.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await unsubscribe(email.trim(), token || undefined);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="section-title text-2xl">{copy.unsubscribeTitle}</h1>
      <p className="section-subtitle mt-2">{copy.unsubscribeText}</p>

      {status === "done" ? (
        <div className="card mt-8 p-6 text-sm leading-relaxed text-[#57534e]">
          <p>{message}</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-semibold text-[#5f8a7a]"
          >
            Continue shopping →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {status === "loading" ? "Updating…" : copy.unsubscribeButton}
          </button>
          {message && status === "error" && (
            <p className="text-sm text-[#991b1b]">{message}</p>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-xs text-[#a8a29e]">
        Need help?{" "}
        <a href={`mailto:${brand.supportEmail}`} className="text-[#5f8a7a] hover:underline">
          {brand.supportEmail}
        </a>
      </p>
    </div>
  );
}
