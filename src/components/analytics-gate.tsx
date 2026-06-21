"use client";

import { useEffect, useState } from "react";

export function AnalyticsGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "locked" | "open">("loading");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/owner/auth")
      .then((r) => r.json())
      .then((data: { configured?: boolean; authenticated?: boolean }) => {
        if (!data.configured || data.authenticated) {
          setStatus("open");
          return;
        }
        setStatus("locked");
      })
      .catch(() => setStatus("locked"));
  }, []);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-[#78716c] sm:px-6">
        Checking access…
      </div>
    );
  }

  if (status === "open") return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-sm flex-col px-4 py-24 sm:px-6">
      <h1 className="text-xl font-semibold text-[#1c1917]">Painel Trove</h1>
      <p className="mt-2 text-sm text-[#78716c]">
        Digite seu PIN para acessar pedidos, devoluções e estatísticas.
      </p>
      <input
        type="password"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submitPin();
          }
        }}
        placeholder="PIN"
        className="mt-6 rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
      />
      {error && (
        <p className="mt-2 text-xs text-red-600">Incorrect PIN. Try again.</p>
      )}
      <button
        type="button"
        disabled={submitting || !input.trim()}
        onClick={() => void submitPin()}
        className="btn-primary mt-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Checking…" : "Unlock"}
      </button>
    </div>
  );

  async function submitPin() {
    setSubmitting(true);
    setError(false);

    try {
      const res = await fetch("/api/owner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: input }),
      });

      if (!res.ok) {
        setError(true);
        return;
      }

      setStatus("open");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }
}
