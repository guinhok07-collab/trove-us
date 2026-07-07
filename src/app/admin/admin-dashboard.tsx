"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminTrafficPanel } from "@/components/admin-traffic-panel";
import { AdminPaymentIssuesPanel } from "@/components/admin-payment-issues-panel";
import { brand } from "@/data/brand";
import { formatUsd } from "@/lib/format";
import type { ReturnRequestStatus, StoredReturnRequest } from "@/lib/returns/types";
import type { TrafficReport } from "@/lib/traffic/types";

interface AdminOrder {
  orderId: string;
  status: string;
  statusLabel: string;
  email: string;
  fullName: string;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  paypalCaptureId?: string;
  cjOrderId?: string;
  fulfillmentError?: string;
  needsAction?: boolean;
  pendingLabel?: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}

interface CatalogProduct {
  slug: string;
  name: string;
  price: number;
  store: string;
  storeLabel: string;
  catalogHidden: boolean;
  visible: boolean;
  hasOverride: boolean;
  mediaIssue: { level: "error" | "warn"; messages: string[] } | null;
  cjIssue: {
    level: "error" | "warn";
    messages: string[];
    types: string[];
    cjName?: string;
    overlap?: number;
  } | null;
}

interface CatalogStandards {
  title: string;
  summary: string;
  workflow: string[];
  scripts: Record<string, string>;
  rules: Record<string, string | number>;
  mediaWarnings: Record<string, string>;
}

interface MediaAuditSummary {
  auditedAt: string;
  total: number;
  ok: number;
  issueCount: number;
  errors: number;
  warnings: number;
  minImages: number;
}

interface CjAuditSummary {
  auditedAt: string;
  total: number;
  ok: number;
  issueCount: number;
  errors: number;
  warnings: number;
  nameMismatch: number;
  variantGap: number;
}

type Tab = "traffic" | "payment-issues" | "returns" | "orders" | "catalog" | "subscribers";

interface MarketingSubscriberRow {
  email: string;
  fullName: string;
  source: string;
  subscribedAt: string;
}

const RETURN_STATUS_LABEL: Record<ReturnRequestStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  denied: "Negada",
  refunded: "Reembolsada",
};

const RETURN_STATUS_CLASS: Record<ReturnRequestStatus, string> = {
  pending: "bg-[#fef3c7] text-[#92400e]",
  approved: "bg-[#dbeafe] text-[#1e40af]",
  denied: "bg-[#fee2e2] text-[#991b1b]",
  refunded: "bg-[#dcfce7] text-[#166534]",
};

function formatPtTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("traffic");
  const [returns, setReturns] = useState<StoredReturnRequest[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogVisibleCount, setCatalogVisibleCount] = useState(0);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "visible" | "hidden" | "issues">("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogToggling, setCatalogToggling] = useState<string | null>(null);
  const [catalogStandards, setCatalogStandards] = useState<CatalogStandards | null>(null);
  const [mediaAudit, setMediaAudit] = useState<MediaAuditSummary | null>(null);
  const [cjAudit, setCjAudit] = useState<CjAuditSummary | null>(null);
  const [showStandards, setShowStandards] = useState(false);
  const [subscribers, setSubscribers] = useState<MarketingSubscriberRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [mailchimpConnected, setMailchimpConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [paymentIssueCount, setPaymentIssueCount] = useState(0);
  const [pendingActionCount, setPendingActionCount] = useState(0);
  const [ordersFilter, setOrdersFilter] = useState<"all" | "pending">("all");
  const [filter, setFilter] = useState<ReturnRequestStatus | "all">("all");
  const [selected, setSelected] = useState<StoredReturnRequest | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traffic, setTraffic] = useState<TrafficReport | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const initialPendingTab = useRef(false);

  const loadReturns = useCallback(async () => {
    const qs =
      filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
    const res = await fetch(`/api/owner/returns${qs}`);
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) {
      setReturns(data.returns);
      setPendingCount(data.pendingCount ?? 0);
    }
  }, [filter]);

  const loadOrders = useCallback(async () => {
    const qs = ordersFilter === "pending" ? "?pending=1&limit=40" : "?limit=40";
    const res = await fetch(`/api/owner/orders${qs}`);
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) {
      setOrders(data.orders);
      setPendingActionCount(data.pendingActionCount ?? 0);
    }
  }, [ordersFilter]);

  const loadCatalog = useCallback(async () => {
    const res = await fetch("/api/owner/catalog");
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) {
      setCatalog(data.products);
      setCatalogVisibleCount(data.visibleCount ?? 0);
      setCatalogStandards(data.standards ?? null);
      setMediaAudit(data.mediaAudit ?? null);
      setCjAudit(data.cjAudit ?? null);
    }
  }, []);

  const loadSubscribers = useCallback(async () => {
    const res = await fetch("/api/owner/subscribers?limit=200");
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) {
      setSubscribers(data.subscribers ?? []);
      setSubscriberCount(data.subscribed ?? 0);
      setMailchimpConnected(Boolean(data.mailchimp));
    }
  }, []);

  const loadPaymentIssues = useCallback(async () => {
    const res = await fetch("/api/owner/payment-issues?status=open&limit=1");
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) setPaymentIssueCount(data.openCount ?? 0);
  }, []);

  const loadTraffic = useCallback(async () => {
    setTrafficLoading(true);
    const res = await fetch("/api/owner/traffic?days=14");
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = (await res.json()) as TrafficReport;
    if (data.ok) setTraffic(data);
    setTrafficLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadTraffic(),
        loadReturns(),
        loadOrders(),
        loadCatalog(),
        loadSubscribers(),
        loadPaymentIssues(),
      ]);
    } catch {
      setError("Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [loadTraffic, loadReturns, loadOrders, loadCatalog, loadSubscribers, loadPaymentIssues]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadTraffic();
      void loadReturns();
      void loadOrders();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadTraffic, loadReturns, loadOrders]);

  useEffect(() => {
    if (!initialPendingTab.current && pendingActionCount > 0) {
      setTab("orders");
      initialPendingTab.current = true;
    }
  }, [pendingActionCount]);

  useEffect(() => {
    if (!loading) void loadOrders();
  }, [ordersFilter, loadOrders, loading]);

  useEffect(() => {
    if (selected) setNote(selected.ownerNote ?? "");
  }, [selected]);

  async function resolvePendingOrder(orderId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/orders/resolve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "resolve" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Falha ao marcar.");
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao marcar pedido.");
    } finally {
      setActionLoading(false);
    }
  }

  async function updateReturnStatus(status: ReturnRequestStatus) {
    if (!selected) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/returns/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rmaId: selected.rmaId,
          status,
          ownerNote: note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Falha ao atualizar.");
      setSelected(data.return);
      await loadReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleCatalogVisibility(slug: string, visible: boolean) {
    setCatalogToggling(slug);
    setError(null);
    try {
      const res = await fetch("/api/owner/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, visible }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Falha ao atualizar.");
      setCatalog((prev) => {
        const next = prev.map((item) =>
          item.slug === slug
            ? { ...item, visible: data.visible, hasOverride: true }
            : item,
        );
        setCatalogVisibleCount(next.filter((item) => item.visible).length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar catálogo.");
    } finally {
      setCatalogToggling(null);
    }
  }

  const filteredCatalog = catalog.filter((item) => {
    const q = catalogSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.slug.includes(q) ||
      item.storeLabel.toLowerCase().includes(q);
    const matchesFilter =
      catalogFilter === "all" ||
      (catalogFilter === "visible" && item.visible) ||
      (catalogFilter === "hidden" && !item.visible) ||
      (catalogFilter === "issues" && (item.mediaIssue || item.cjIssue));
    return matchesSearch && matchesFilter;
  });

  const catalogMediaIssueCount = catalog.filter((item) => item.mediaIssue).length;
  const catalogCjIssueCount = catalog.filter((item) => item.cjIssue).length;
  const catalogAnyIssueCount = catalog.filter((item) => item.mediaIssue || item.cjIssue).length;

  async function logout() {
    await fetch("/api/owner/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="section-title text-2xl">Painel {brand.name}</h1>
          <p className="section-subtitle mt-1">
            Pedidos, devoluções e problemas — sem depender só do e-mail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-[#e7e5e4] px-4 py-2 text-sm font-semibold text-[#44403c] hover:border-[#5f8a7a]"
          >
            Atualizar
          </button>
          <Link
            href="/analytics"
            className="rounded-full border border-[#e7e5e4] px-4 py-2 text-sm font-semibold text-[#44403c] hover:border-[#5f8a7a]"
          >
            Estatísticas
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-[#e7e5e4] px-4 py-2 text-sm text-[#78716c] hover:border-red-200 hover:text-red-600"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className={`card p-4 ${pendingActionCount > 0 ? "border-amber-300 bg-[#fffbeb]" : ""}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Vendas pendentes
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${pendingActionCount > 0 ? "text-[#92400e]" : "text-[#1c1917]"}`}
          >
            {pendingActionCount}
          </p>
          <p className="mt-1 text-xs text-[#78716c]">
            Cliente pagou — você precisa agir no CJ
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Devoluções pendentes
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">{pendingCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Pedidos recentes
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">{orders.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Produtos visíveis
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">{catalogVisibleCount}</p>
          <p className="mt-1 text-xs text-[#a8a29e]">
            Oculte ou mostre na aba Catálogo
          </p>
        </div>
      </div>

      {paymentIssueCount > 0 && (
        <div className="mb-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
          <p className="font-semibold">
            💳 {paymentIssueCount} problema{paymentIssueCount > 1 ? "s" : ""} de pagamento no
            checkout
          </p>
          <p className="mt-1 text-[#78716c]">
            Cliente não conseguiu pagar — veja nome e telefone na aba Pagamentos.
          </p>
        </div>
      )}

      {pendingActionCount > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
          <p className="font-semibold">
            ⚠️ {pendingActionCount} venda{pendingActionCount > 1 ? "s" : ""}{" "}
            pendente{pendingActionCount > 1 ? "s" : ""} — cliente na mão
          </p>
          <p className="mt-1 text-[#78716c]">
            Pagou no PayPal — pague manual no painel CJ e marque como resolvido.
          </p>
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-[#e7e5e4]">
        <button
          type="button"
          onClick={() => setTab("traffic")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "traffic"
              ? "border-[#5f8a7a] text-[#4d7366]"
              : "border-transparent text-[#78716c]"
          }`}
        >
          Tráfego
        </button>
        <button
          type="button"
          onClick={() => setTab("payment-issues")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "payment-issues"
              ? "border-[#5f8a7a] text-[#4d7366]"
              : "border-transparent text-[#78716c]"
          }`}
        >
          Pagamentos
          {paymentIssueCount > 0 && (
            <span className="ml-2 rounded-full bg-[#fee2e2] px-2 py-0.5 text-xs text-[#991b1b]">
              {paymentIssueCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("returns")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "returns"
              ? "border-[#5f8a7a] text-[#4d7366]"
              : "border-transparent text-[#78716c]"
          }`}
        >
          Devoluções
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs text-[#92400e]">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "orders"
              ? "border-[#5f8a7a] text-[#4d7366]"
              : "border-transparent text-[#78716c]"
          }`}
        >
          Pedidos
          {pendingActionCount > 0 && (
            <span className="ml-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs text-[#92400e]">
              {pendingActionCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "catalog"
              ? "border-[#5f8a7a] text-[#4d7366]"
              : "border-transparent text-[#78716c]"
          }`}
        >
          Catálogo
        </button>
        <button
          type="button"
          onClick={() => setTab("subscribers")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "subscribers"
              ? "border-[#5f8a7a] text-[#4d7366]"
              : "border-transparent text-[#78716c]"
          }`}
        >
          Promoções
          {subscriberCount > 0 && (
            <span className="ml-2 rounded-full bg-[#eef4f1] px-2 py-0.5 text-xs text-[#4d7366]">
              {subscriberCount}
            </span>
          )}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
          {error}
        </p>
      )}

      {loading && tab !== "traffic" ? (
        <p className="py-12 text-center text-sm text-[#78716c]">Carregando…</p>
      ) : tab === "traffic" ? (
        <AdminTrafficPanel report={traffic} loading={trafficLoading} />
      ) : tab === "payment-issues" ? (
        <AdminPaymentIssuesPanel />
      ) : tab === "returns" ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "denied", "refunded"] as const).map(
                (f) => (
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
                    {f === "all" ? "Todas" : RETURN_STATUS_LABEL[f]}
                  </button>
                ),
              )}
            </div>

            {returns.length === 0 ? (
              <div className="card p-8 text-center text-sm text-[#78716c]">
                Nenhuma devolução aqui ainda.
              </div>
            ) : (
              returns.map((r) => (
                <button
                  key={r.rmaId}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`card w-full p-4 text-left transition ${
                    selected?.rmaId === r.rmaId ? "ring-2 ring-[#5f8a7a]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-[#a8a29e]">{r.rmaId}</p>
                      <p className="mt-1 font-semibold text-[#1c1917]">{r.customerName}</p>
                      <p className="text-xs text-[#78716c]">{r.reasonLabel}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${RETURN_STATUS_CLASS[r.status]}`}
                    >
                      {RETURN_STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#a8a29e]">
                    {formatPtTime(r.createdAt)} · {formatUsd(r.orderTotal)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-3">
            {selected ? (
              <div className="card space-y-4 p-5">
                <div>
                  <p className="font-mono text-sm text-[#57534e]">{selected.rmaId}</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#1c1917]">
                    {selected.reasonLabel}
                  </h2>
                  <p className="text-sm text-[#78716c]">
                    Pedido {selected.orderId} · {formatPtTime(selected.createdAt)}
                  </p>
                </div>

                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[#a8a29e]">Cliente</dt>
                    <dd className="font-medium text-[#1c1917]">{selected.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#a8a29e]">E-mail</dt>
                    <dd>
                      <a
                        href={`mailto:${selected.email}`}
                        className="font-medium text-[#5f8a7a] hover:underline"
                      >
                        {selected.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#a8a29e]">Total</dt>
                    <dd className="font-medium">{formatUsd(selected.orderTotal)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#a8a29e]">PayPal</dt>
                    <dd className="font-mono text-xs break-all">
                      {selected.paypalCaptureId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#a8a29e]">CJ</dt>
                    <dd className="font-mono text-xs break-all">
                      {selected.cjOrderId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#a8a29e]">Tracking</dt>
                    <dd className="text-xs">{selected.trackingNumber ?? "—"}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-sm font-medium text-[#1c1917]">Itens</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-[#57534e]">
                    {selected.itemNames.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-[#fafaf9] p-4">
                  <p className="text-sm font-medium text-[#1c1917]">Mensagem do cliente</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#57534e]">
                    {selected.details}
                  </p>
                  {selected.needsPhotos && (
                    <p className="mt-2 text-xs font-semibold text-[#92400e]">
                      📷 Exige fotos — confirme no e-mail antes de reembolsar.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ownerNote" className="text-sm font-medium text-[#1c1917]">
                    Nota interna (opcional)
                  </label>
                  <textarea
                    id="ownerNote"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex.: reembolso PayPal feito, cliente ficou com produto…"
                    className="mt-2 w-full rounded-xl border border-[#e7e5e4] px-3 py-2 text-sm outline-none focus:border-[#5f8a7a]/50"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void updateReturnStatus("approved")}
                    className="rounded-full bg-[#dbeafe] px-4 py-2 text-sm font-semibold text-[#1e40af] disabled:opacity-60"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void updateReturnStatus("refunded")}
                    className="rounded-full bg-[#dcfce7] px-4 py-2 text-sm font-semibold text-[#166534] disabled:opacity-60"
                  >
                    Marcar reembolsado
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void updateReturnStatus("denied")}
                    className="rounded-full bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#991b1b] disabled:opacity-60"
                  >
                    Negar
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void updateReturnStatus("pending")}
                    className="rounded-full border border-[#e7e5e4] px-4 py-2 text-sm font-semibold text-[#57534e] disabled:opacity-60"
                  >
                    Voltar p/ pendente
                  </button>
                </div>

                <p className="text-xs text-[#a8a29e]">
                  Reembolso: PayPal → Activity → Issue refund. Depois marque
                  &quot;Reembolsado&quot; aqui.
                </p>
              </div>
            ) : (
              <div className="card p-10 text-center text-sm text-[#78716c]">
                Selecione uma devolução na lista.
              </div>
            )}
          </div>
        </div>
      ) : tab === "orders" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setOrdersFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  ordersFilter === f
                    ? "bg-[#5f8a7a] text-white"
                    : "bg-[#f5f5f4] text-[#57534e]"
                }`}
              >
                {f === "all" ? "Todos" : `Pendentes (${pendingActionCount})`}
              </button>
            ))}
          </div>
          {orders.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[#78716c]">
              {ordersFilter === "pending"
                ? "Nenhuma venda pendente — tudo em dia."
                : "Nenhum pedido salvo ainda. Novos pedidos aparecem aqui após checkout."}
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.orderId}
                className={`card p-4 ${o.needsAction ? "border-amber-300 bg-[#fffbeb]" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1c1917]">{o.orderId}</p>
                    <p className="text-sm text-[#57534e]">
                      {o.fullName} · {o.email}
                    </p>
                    <p className="mt-1 text-xs text-[#78716c]">{o.statusLabel}</p>
                    {o.needsAction && o.pendingLabel && (
                      <p className="mt-2 inline-block rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs font-semibold text-[#92400e]">
                        {o.pendingLabel}
                      </p>
                    )}
                    {o.fulfillmentError && (
                      <p className="mt-2 text-xs text-[#991b1b]">{o.fulfillmentError}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#1c1917]">{formatUsd(o.total)}</p>
                    <p className="text-xs text-[#a8a29e]">{formatPtTime(o.createdAt)}</p>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-[#78716c]">
                  {o.items.map((item) => (
                    <li key={item.name}>
                      {item.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {o.needsAction && (
                    <>
                      <a
                        href="https://cjdropshipping.com/myCJ.html#/orderList"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#92400e] hover:underline"
                      >
                        Abrir CJ →
                      </a>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void resolvePendingOrder(o.orderId)}
                        className="font-semibold text-[#4d7366] hover:underline disabled:opacity-60"
                      >
                        Marcar resolvido
                      </button>
                    </>
                  )}
                  {o.trackingUrl && (
                    <a
                      href={o.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#5f8a7a] hover:underline"
                    >
                      Tracking
                    </a>
                  )}
                  <Link
                    href={`/returns?order=${encodeURIComponent(o.orderId)}&email=${encodeURIComponent(o.email)}`}
                    className="font-semibold text-[#5f8a7a] hover:underline"
                  >
                    Ver devolução
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "catalog" ? (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#1c1917]">
                  {catalogStandards?.title ?? "Padrão CJ — Trove"}
                </p>
                <p className="mt-1 text-sm text-[#57534e]">
                  {catalogStandards?.summary ??
                    "Todo produto novo segue o fluxo CJ: fotos, variantes, vídeo e preço Trove."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStandards((v) => !v)}
                className="rounded-full border border-[#e7e5e4] px-3 py-1.5 text-xs font-semibold text-[#57534e] hover:border-[#5f8a7a]"
              >
                {showStandards ? "Ocultar regras" : "Ver regras CJ"}
              </button>
            </div>

            {(mediaAudit || cjAudit) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {cjAudit && (
                  <>
                    <span className="rounded-full bg-[#f5f5f4] px-2.5 py-1 font-semibold text-[#57534e]">
                      CJ: {cjAudit.ok}/{cjAudit.total} OK
                    </span>
                    {cjAudit.nameMismatch > 0 && (
                      <span className="rounded-full bg-[#fee2e2] px-2.5 py-1 font-semibold text-[#991b1b]">
                        {cjAudit.nameMismatch} produto CJ errado
                      </span>
                    )}
                    {cjAudit.variantGap > 0 && (
                      <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 font-semibold text-[#92400e]">
                        {cjAudit.variantGap} sem variantes
                      </span>
                    )}
                  </>
                )}
                {mediaAudit && mediaAudit.errors > 0 && (
                  <span className="rounded-full bg-[#fee2e2] px-2.5 py-1 font-semibold text-[#991b1b]">
                    {mediaAudit.errors} erro(s) de mídia
                  </span>
                )}
                {mediaAudit && mediaAudit.warnings > 0 && (
                  <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 font-semibold text-[#92400e]">
                    {mediaAudit.warnings} aviso(s) mídia
                  </span>
                )}
                {catalogAnyIssueCount === 0 && (
                  <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 font-semibold text-[#166534]">
                    Catálogo CJ OK
                  </span>
                )}
              </div>
            )}

            {showStandards && catalogStandards && (
              <div className="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-4 text-sm text-[#57534e] space-y-3">
                <div>
                  <p className="font-semibold text-[#1c1917]">Fluxo ao adicionar produto</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {catalogStandards.workflow.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-[#1c1917]">Scripts</p>
                  <ul className="mt-2 space-y-1 font-mono text-xs">
                    {Object.entries(catalogStandards.scripts).map(([key, cmd]) => (
                      <li key={key}>
                        <span className="text-[#78716c]">{key}:</span> {cmd}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-[#1c1917]">Avisos de mídia</p>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(catalogStandards.mediaWarnings).map(([key, msg]) => (
                      <li key={key}>
                        <span className="font-semibold">{key}:</span> {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <p className="text-sm text-[#57534e]">
              Audit CJ automático: nome vs fornecedor, variantes, preços. Problemas
              aparecem abaixo — rode{" "}
              <code className="text-xs">fix-catalog-cj.mjs</code> após adicionar produtos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "visible", "hidden", "issues"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setCatalogFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  catalogFilter === f
                    ? "bg-[#5f8a7a] text-white"
                    : "bg-[#f5f5f4] text-[#57534e]"
                }`}
              >
                {f === "all"
                  ? "Todos"
                  : f === "visible"
                    ? "Visíveis"
                    : f === "hidden"
                      ? "Ocultos"
                      : `Problemas (${catalogAnyIssueCount})`}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Buscar por nome, slug ou categoria…"
            className="w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50"
          />

          {filteredCatalog.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[#78716c]">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCatalog.map((item) => (
                <div
                  key={item.slug}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1c1917]">{item.name}</p>
                    <p className="text-xs text-[#a8a29e]">
                      {item.storeLabel} · {formatUsd(item.price)} · {item.slug}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.visible
                            ? "bg-[#dcfce7] text-[#166534]"
                            : "bg-[#fee2e2] text-[#991b1b]"
                        }`}
                      >
                        {item.visible ? "Visível" : "Oculto"}
                      </span>
                      {item.catalogHidden && (
                        <span className="rounded-full bg-[#f5f5f4] px-2 py-0.5 text-xs font-semibold text-[#57534e]">
                          Padrão oculto
                        </span>
                      )}
                      {item.hasOverride && (
                        <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-xs font-semibold text-[#1e40af]">
                          Override admin
                        </span>
                      )}
                      {item.mediaIssue && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.mediaIssue.level === "error"
                              ? "bg-[#fee2e2] text-[#991b1b]"
                              : "bg-[#fef3c7] text-[#92400e]"
                          }`}
                          title={item.mediaIssue.messages.join(" · ")}
                        >
                          {item.mediaIssue.level === "error"
                            ? "Mídia — erro"
                            : "Mídia — aviso"}
                        </span>
                      )}
                      {item.cjIssue && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.cjIssue.level === "error"
                              ? "bg-[#fee2e2] text-[#991b1b]"
                              : "bg-[#fef3c7] text-[#92400e]"
                          }`}
                          title={item.cjIssue.messages.join(" · ")}
                        >
                          {item.cjIssue.types?.includes("name_mismatch")
                            ? "CJ errado"
                            : "CJ — aviso"}
                        </span>
                      )}
                    </div>
                    {(item.mediaIssue || item.cjIssue) && (
                      <p className="mt-1 text-xs text-[#92400e]">
                        {[
                          ...(item.cjIssue?.messages ?? []),
                          ...(item.mediaIssue?.messages ?? []),
                        ].join(" · ")}
                      </p>
                    )}
                    {item.cjIssue?.cjName && (
                      <p className="mt-0.5 text-xs text-[#a8a29e]">
                        CJ: {item.cjIssue.cjName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.visible && (
                      <Link
                        href={`/products/${item.slug}`}
                        target="_blank"
                        className="rounded-full border border-[#e7e5e4] px-3 py-1.5 text-xs font-semibold text-[#57534e] hover:border-[#5f8a7a]"
                      >
                        Ver
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={catalogToggling === item.slug}
                      onClick={() =>
                        void toggleCatalogVisibility(item.slug, !item.visible)
                      }
                      className="rounded-full bg-[#5f8a7a] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {catalogToggling === item.slug
                        ? "Salvando…"
                        : item.visible
                          ? "Ocultar"
                          : "Mostrar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm text-[#57534e]">
              Pessoas que aceitaram receber promoções (rodapé do site ou checkbox
              no checkout). Exporte para Mailchimp ou envie campanhas por lá.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/api/owner/subscribers?format=csv"
                className="rounded-full bg-[#5f8a7a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d7366]"
              >
                Exportar CSV
              </a>
              {mailchimpConnected && (
                <span className="rounded-full bg-[#dcfce7] px-3 py-1.5 text-xs font-semibold text-[#166534]">
                  Mailchimp conectado
                </span>
              )}
            </div>
          </div>

          {subscribers.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[#78716c]">
              Nenhum inscrito ainda. Aparecem aqui quando alguém marcar no
              checkout ou entrar pelo rodapé.
            </div>
          ) : (
            <div className="space-y-2">
              {subscribers.map((s) => (
                <div key={s.email} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1c1917]">
                        {s.fullName || s.email}
                      </p>
                      <p className="text-sm text-[#57534e]">{s.email}</p>
                      <p className="mt-1 text-xs text-[#a8a29e]">
                        {s.source === "checkout" ? "Checkout" : "Rodapé"} ·{" "}
                        {formatPtTime(s.subscribedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
