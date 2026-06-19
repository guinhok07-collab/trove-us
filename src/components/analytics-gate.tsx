"use client";

import { useEffect, useState } from "react";

const AUTH_KEY = "trove-analytics-auth";
const PIN = process.env.NEXT_PUBLIC_ANALYTICS_PIN;

export function AnalyticsGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(!PIN);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!PIN) return;
    if (sessionStorage.getItem(AUTH_KEY) === PIN) {
      setUnlocked(true);
    }
  }, []);

  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-sm flex-col px-4 py-24 sm:px-6">
      <h1 className="text-xl font-semibold text-[#1c1917]">Owner Dashboard</h1>
      <p className="mt-2 text-sm text-[#78716c]">
        Enter your PIN to view private store stats.
      </p>
      <input
        type="password"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(false);
        }}
        placeholder="PIN"
        className="mt-6 rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
      />
      {error && (
        <p className="mt-2 text-xs text-red-600">Incorrect PIN. Try again.</p>
      )}
      <button
        type="button"
        onClick={() => {
          if (input === PIN) {
            sessionStorage.setItem(AUTH_KEY, PIN);
            setUnlocked(true);
            return;
          }
          setError(true);
        }}
        className="btn-primary mt-4 py-2.5"
      >
        Unlock
      </button>
    </div>
  );
}
