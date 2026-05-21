import Link from "next/link";
import { ArrowDownUp, Eye } from "lucide-react";
import { AlertCountBadge, CategoryBadge, RiskBadge, StatusBadge } from "./AlertBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { EmpenhoFilters, PlainEmpenho } from "@/modules/empenhos/types";

function withSort(filters: EmpenhoFilters, sortBy: NonNullable<EmpenhoFilters["sortBy"]>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === "" || key === "page") continue;
    params.set(key, String(value));
  }
  const same = filters.sortBy === sortBy;
  params.set("sortBy", sortBy);
  params.set("sortDir", same && filters.sortDir !== "asc" ? "asc" : "desc");
  return `?${params.toString()}`;
}

function pageHref(filters: EmpenhoFilters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === "" || key === "page") continue;
    params.set(key, String(value));
  }
  params.set("page", String(page));
  return `?${params.toString()}`;
}

function SortLink({ label, sortBy, filters }: { label: string; sortBy: NonNullable<EmpenhoFilters["sortBy"]>; filters: EmpenhoFilters }) {
  return (
    <Link href={withSort(filters, sortBy)} className="inline-flex items-center gap-1 hover:text-folha-800">
      {label}
      <ArrowDownUp size={13} aria-hidden="true" />
    </Link>
  );
}

export function EmpenhosTable({
  items,
  total,
  page,
  pageSize,
  filters
}: {
  items: PlainEmpenho[];
  total: number;
  page: number;
  pageSize: number;
  filters: EmpenhoFilters;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">Tabela de empenhos</h2>
          <p className="text-sm text-slate-600">{total} registro{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Empenho</th>
              <th className="px-3 py-3"><SortLink label="Data" sortBy="dataEmpenho" filters={filters} /></th>
              <th className="px-3 py-3"><SortLink label="Credor" sortBy="credor" filters={filters} /></th>
              <th className="px-3 py-3">Categoria</th>
              <th className="px-3 py-3"><SortLink label="Valor empenhado" sortBy="valorEmpenhado" filters={filters} /></th>
              <th className="px-3 py-3">Liquidado</th>
              <th className="px-3 py-3">Pago</th>
              <th className="px-3 py-3">A liquidar</th>
              <th className="px-3 py-3">A pagar</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3"><SortLink label="Risco" sortBy="riskScore" filters={filters} /></th>
              <th className="px-3 py-3">Alertas</th>
              <th className="px-3 py-3">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-folha-50">
                <td className="px-3 py-3 font-semibold text-slate-900">{item.numeroEmpenho}</td>
                <td className="px-3 py-3 text-slate-700">{formatDate(item.dataEmpenho ?? item.dataEmpenhoIso)}</td>
                <td className="max-w-[260px] px-3 py-3 text-slate-800">{item.credor}</td>
                <td className="px-3 py-3"><CategoryBadge category={item.categoria} /></td>
                <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(item.valorEmpenhado)}</td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(item.valorLiquidado)}</td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(item.valorPago)}</td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(item.valorALiquidar)}</td>
                <td className="px-3 py-3 text-slate-700">{formatCurrency(item.valorAPagar + item.valorLiquidadoAPagar)}</td>
                <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-3 py-3"><RiskBadge level={item.riskLevel} /></td>
                <td className="px-3 py-3"><AlertCountBadge count={item.alertas.length} /></td>
                <td className="px-3 py-3">
                  <Link href={`/empenhos/${item.id}`} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-folha-600 hover:text-folha-800">
                    <Eye size={14} aria-hidden="true" />
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-slate-500">Nenhum empenho encontrado para os filtros aplicados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <span className="text-slate-600">Página {page} de {pageCount}</span>
        <div className="flex gap-2">
          <Link aria-disabled={page <= 1} className="rounded border border-slate-300 px-3 py-2 font-semibold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-50" href={pageHref(filters, Math.max(1, page - 1))}>Anterior</Link>
          <Link aria-disabled={page >= pageCount} className="rounded border border-slate-300 px-3 py-2 font-semibold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-50" href={pageHref(filters, Math.min(pageCount, page + 1))}>Próxima</Link>
        </div>
      </div>
    </section>
  );
}

