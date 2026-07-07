"use client";

import type { TrafficReport } from "@/lib/traffic/types";

function BarChart({
  rows,
  field,
  color,
  label,
}: {
  rows: TrafficReport["days"];
  field: keyof TrafficReport["days"][number];
  color: string;
  label: string;
}) {
  const max = Math.max(
    1,
    ...rows.map((row) => Number(row[field] as number)),
  );

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-[#1c1917]">{label}</p>
      <div className="mt-4 flex h-40 items-end gap-1.5">
        {rows.map((row) => {
          const value = Number(row[field] as number);
          const height = Math.max(value > 0 ? 8 : 2, Math.round((value / max) * 100));
          return (
            <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-semibold text-[#78716c]">{value || ""}</span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${height}%`, backgroundColor: color }}
                title={`${row.label}: ${value}`}
              />
              <span className="text-[10px] text-[#a8a29e]">{row.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[#57534e]">{label}</span>
        <span className="font-semibold text-[#1c1917]">
          {value}
          {max > 0 && value > 0 ? ` (${pct}%)` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#f5f5f4]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(value > 0 ? 6 : 0, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function HealthBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fee2e2] text-[#991b1b]"
      }`}
    >
      {ok ? "OK" : "Verificar"} · {label}
    </span>
  );
}

export function AdminTrafficPanel({
  report,
  loading,
}: {
  report: TrafficReport | null;
  loading: boolean;
}) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-[#78716c]">Carregando tráfego…</p>;
  }

  if (!report) {
    return (
      <p className="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
        Não foi possível carregar o tráfego.
      </p>
    );
  }

  const { totals, days, topProducts, topSources, health, configured } = report;
  const today = days[days.length - 1];
  const maxFunnel = Math.max(1, totals.pageView);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Visitas hoje
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">
            {today?.pageView ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Produtos vistos
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">{totals.viewProduct}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Carrinho
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">{totals.addToCart}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Checkout
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1c1917]">{totals.initiateCheckout}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
            Compras
          </p>
          <p className="mt-1 text-2xl font-bold text-[#166534]">{totals.purchase}</p>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-[#1c1917]">Status do site</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <HealthBadge ok={health.metaPixel} label="Meta Pixel" />
          <HealthBadge ok={health.paypalLive} label="PayPal live" />
          <HealthBadge ok={health.cjConfigured} label="CJ API" />
          <HealthBadge ok={health.cjManualPay} label="CJ pagamento manual" />
          <HealthBadge ok={health.redis} label="Redis tráfego" />
          <HealthBadge ok={health.telegram} label="Telegram alertas" />
        </div>
        {!health.paypalLive && (
          <p className="mt-3 text-sm text-[#92400e]">
            PayPal não está em modo live — compradores reais nos EUA precisam PAYPAL_MODE=live.
          </p>
        )}
        {health.paypalLive && (
          <p className="mt-3 text-xs text-[#78716c]">
            PayPal live ativo. Se pagamento falhar: Developer → Advanced Card Payments ON · teste com IP US.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart rows={days} field="pageView" color="#5f8a7a" label="Visitas por dia" />
        <div className="card p-5">
          <p className="text-sm font-semibold text-[#1c1917]">Funil (período)</p>
          <div className="mt-4 space-y-3">
            <FunnelStep label="Visitas" value={totals.pageView} max={maxFunnel} color="#5f8a7a" />
            <FunnelStep
              label="Produto visto"
              value={totals.viewProduct}
              max={maxFunnel}
              color="#6b9688"
            />
            <FunnelStep
              label="Add to cart"
              value={totals.addToCart}
              max={maxFunnel}
              color="#7aa897"
            />
            <FunnelStep
              label="Checkout"
              value={totals.initiateCheckout}
              max={maxFunnel}
              color="#89b8a6"
            />
            <FunnelStep
              label="Pagamento iniciado"
              value={totals.paymentStarted}
              max={maxFunnel}
              color="#98c8b4"
            />
            <FunnelStep
              label="Compra"
              value={totals.purchase}
              max={maxFunnel}
              color="#166534"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm font-semibold text-[#1c1917]">Top produtos</p>
          {topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-[#78716c]">Sem dados ainda — aguardando visitas.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topProducts.map((item) => (
                <li
                  key={item.slug}
                  className="flex items-center justify-between rounded-lg bg-[#faf9f7] px-3 py-2 text-sm"
                >
                  <span className="truncate text-[#44403c]">{item.slug}</span>
                  <span className="font-semibold text-[#1c1917]">{item.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-[#1c1917]">Origem do tráfego</p>
          {topSources.length === 0 ? (
            <p className="mt-3 text-sm text-[#78716c]">Sem dados ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topSources.map((item) => (
                <li
                  key={item.source}
                  className="flex items-center justify-between rounded-lg bg-[#faf9f7] px-3 py-2 text-sm"
                >
                  <span className="capitalize text-[#44403c]">{item.source}</span>
                  <span className="font-semibold text-[#1c1917]">{item.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-[#78716c]">
        Dados do site Trove (Redis). Meta Ads mostra impressões/cliques separadamente no Gerenciador
        de Anúncios.
      </p>
    </div>
  );
}
