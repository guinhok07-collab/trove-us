"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { brand } from "@/data/brand";
import { formatUsd } from "@/lib/format";
import type { ReturnRequestStatus, StoredReturnRequest } from "@/lib/returns/types";

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
}

type Tab = "returns" | "orders" | "catalog" | "subscribers";

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
  const [tab, setTab] = useState<Tab>("returns");
  const [returns, setReturns] = useState<StoredReturnRequest[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogVisibleCount, setCatalogVisibleCount] = useState(0);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "visible" | "hidden">("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogToggling, setCatalogToggling] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<MarketingSubscriberRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [mailchimpConnected, setMailchimpConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<ReturnRequestStatus | "all">("all");
  const [selected, setSelected] = useState<StoredReturnRequest | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const res = await fetch("/api/owner/orders?limit=40");
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (data.ok) setOrders(data.orders);
  }, []);

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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadReturns(),
        loadOrders(),
        loadCatalog(),
        loadSubscribers(),
      ]);
    } catch {
      setError("Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [loadReturns, loadOrders, loadCatalog, loadSubscribers]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selected) setNote(selected.ownerNote ?? "");
  }, [selected]);

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
      (catalogFilter === "hidden" && !item.visible);
    return matchesSearch && matchesFilter;
  });

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

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
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

      <div className="mb-4 flex gap-2 border-b border-[#e7e5e4]">
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

      {loading ? (
        <p className="py-12 text-center text-sm text-[#78716c]">Carregando…</p>
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
          {orders.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[#78716c]">
              Nenhum pedido salvo ainda. Novos pedidos aparecem aqui após checkout.
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.orderId} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1c1917]">{o.orderId}</p>
                    <p className="text-sm text-[#57534e]">
                      {o.fullName} · {o.email}
                    </p>
                    <p className="mt-1 text-xs text-[#78716c]">{o.statusLabel}</p>
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
          <div className="card p-4">
            <p className="text-sm text-[#57534e]">
              Oculte produtos caros ou fora de estoque temporariamente. O padrão
              já esconde 8 itens; você pode desocultar quando quiser.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "visible", "hidden"] as const).map((f) => (
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
                {f === "all" ? "Todos" : f === "visible" ? "Visíveis" : "Ocultos"}
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
                    </div>
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
