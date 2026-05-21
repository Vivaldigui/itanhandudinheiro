import { CircleDollarSign, FileSearch, Landmark, ReceiptText, Scale, WalletCards } from "lucide-react";
import type { DashboardSummary } from "@/modules/empenhos/types";
import { formatCurrency, formatNumber } from "@/lib/formatters";

const icons = [CircleDollarSign, ReceiptText, WalletCards, Scale, Landmark, FileSearch];

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const cards = [
    { label: "Total empenhado", value: formatCurrency(summary.totals.valorEmpenhado) },
    { label: "Total liquidado", value: formatCurrency(summary.totals.valorLiquidado) },
    { label: "Total pago", value: formatCurrency(summary.totals.valorPago) },
    { label: "Total a liquidar", value: formatCurrency(summary.totals.valorALiquidar) },
    { label: "Total a pagar", value: formatCurrency(summary.totals.valorAPagar) },
    { label: "Quantidade de empenhos", value: formatNumber(summary.totals.quantidadeEmpenhos) },
    { label: "Quantidade de credores", value: formatNumber(summary.totals.quantidadeCredores) },
    { label: "Processos de compra", value: formatNumber(summary.totals.quantidadeProcessosCompra) },
    { label: "Empenhos com ponto de atenção", value: formatNumber(summary.totals.empenhosComAlerta) },
    { label: "Maior empenho", value: summary.totals.maiorEmpenho ? formatCurrency(summary.totals.maiorEmpenho.valorEmpenhado) : "-" }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div key={card.label} className="rounded border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</span>
              <Icon size={18} className="text-folha-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-xl font-bold text-slate-950">{card.value}</div>
          </div>
        );
      })}
    </section>
  );
}

