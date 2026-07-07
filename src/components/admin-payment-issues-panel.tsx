"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "@/lib/format";
import {
  PAYMENT_ISSUE_SOURCE_LABEL,
  PAYMENT_ISSUE_STATUS_LABEL,
  type PaymentIssueStatus,
  type StoredPaymentIssue,
} from "@/lib/payment-issues/types";

function formatPtTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

const STATUS_CLASS: Record<PaymentIssueStatus, string> = {
  open: "bg-[#fee2e2] text-[#991b1b]",
  contacted: "bg-[#fef3c7] text-[#92400e]",
  resolved: "bg-[#dcfce7] text-[#166534]",
};

export function AdminPaymentIssuesPanel() {
  const [issues, setIssues] = useState<StoredPaymentIssue[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [filter, setFilter] = useState<PaymentIssueStatus | "all">("open");
  const [selected, setSelected] = useState<StoredPaymentIssue | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
    const res = await fetch(`/api/owner/payment-issues${qs}`);
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) {
      setIssues(data.issues ?? []);
      setOpenCount(data.openCount ?? 0);
      if (selected && !data.issues.some((i: StoredPaymentIssue) => i.issueId === selected.issueId)) {
        setSelected(null);
      }
    } else {
      setError(data.error ?? "Could not load payment issues.");
    }
    setLoading(false);
  }, [filter, selected]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: PaymentIssueStatus) {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/owner/payment-issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId: selected.issueId,
        status,
        ownerNote: note,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelected(data.issue);
      await load();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm font-semibold text-[#1c1917]">Problemas de pagamento</p>
        <p className="mt-1 text-sm text-[#78716c]">
          Relatos de clientes e erros detectados automaticamente no checkout. A Aria avisa no
          Telegram quando chega algo novo.
        </p>
        <p className="mt-3 text-2xl font-bold text-[#991b1b]">{openCount} aberto(s)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(["open", "contacted", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  filter === f
                    ? "bg-[#5f8a7a] text-white"
                    : "bg-[#f5f5f4] text-[#57534e]"
                }`}
              >
                {f === "all" ? "Todos" : PAYMENT_ISSUE_STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card p-8 text-center text-sm text-[#78716c]">Carregando...</div>
          ) : issues.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[#78716c]">
              Nenhum problema de pagamento aqui.
            </div>
          ) : (
            issues.map((issue) => (
              <button
                key={issue.issueId}
                type="button"
                onClick={() => {
                  setSelected(issue);
                  setNote(issue.ownerNote ?? "");
                }}
                className={`card w-full p-4 text-left transition ${
                  selected?.issueId === issue.issueId ? "ring-2 ring-[#5f8a7a]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-[#a8a29e]">{issue.issueId}</p>
                    <p className="mt-1 font-semibold text-[#1c1917]">{issue.fullName}</p>
                    <p className="text-xs text-[#78716c]">{issue.phone || "Sem telefone"}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[issue.status]}`}
                  >
                    {PAYMENT_ISSUE_STATUS_LABEL[issue.status]}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-[#57534e]">{issue.problem}</p>
                <p className="mt-2 text-xs text-[#a8a29e]">
                  {formatPtTime(issue.createdAt)} · {PAYMENT_ISSUE_SOURCE_LABEL[issue.source]}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <div className="card space-y-4 p-5">
              <div>
                <p className="font-mono text-sm text-[#57534e]">{selected.issueId}</p>
                <h2 className="mt-1 text-lg font-semibold text-[#1c1917]">
                  {PAYMENT_ISSUE_SOURCE_LABEL[selected.source]}
                </h2>
                <p className="text-sm text-[#78716c]">{formatPtTime(selected.createdAt)}</p>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#a8a29e]">Nome</dt>
                  <dd className="font-medium text-[#1c1917]">{selected.fullName}</dd>
                </div>
                <div>
                  <dt className="text-[#a8a29e]">Telefone</dt>
                  <dd className="font-medium text-[#1c1917]">
                    {selected.phone ? (
                      <a href={`tel:${selected.phone}`} className="text-[#5f8a7a] hover:underline">
                        {selected.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[#a8a29e]">E-mail</dt>
                  <dd>
                    {selected.email ? (
                      <a
                        href={`mailto:${selected.email}`}
                        className="font-medium text-[#5f8a7a] hover:underline"
                      >
                        {selected.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {selected.orderId && (
                  <div>
                    <dt className="text-[#a8a29e]">Pedido</dt>
                    <dd className="font-mono text-xs">{selected.orderId}</dd>
                  </div>
                )}
                {selected.cartTotal != null && (
                  <div>
                    <dt className="text-[#a8a29e]">Total carrinho</dt>
                    <dd className="font-medium">{formatUsd(selected.cartTotal)}</dd>
                  </div>
                )}
              </dl>

              <div className="rounded-xl bg-[#fef2f2] p-4">
                <p className="text-sm font-medium text-[#991b1b]">Problema reportado</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#57534e]">
                  {selected.problem}
                </p>
              </div>

              {selected.technicalDetail && (
                <div className="rounded-xl bg-[#fafaf9] p-4">
                  <p className="text-sm font-medium text-[#1c1917]">Detalhe técnico (auto)</p>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-[#57534e]">
                    {selected.technicalDetail}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-[#1c1917]">Nota interna</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#e7e5e4] px-3 py-2 text-sm"
                  placeholder="O que você fez / vai fazer..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(["open", "contacted", "resolved"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={saving || selected.status === status}
                    onClick={() => updateStatus(status)}
                    className="rounded-full bg-[#5f8a7a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {PAYMENT_ISSUE_STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-[#78716c]">
              Selecione um problema para ver nome, telefone e detalhes.
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-[#991b1b]">{error}</p>}
    </div>
  );
}
