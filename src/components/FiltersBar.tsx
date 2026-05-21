import { Search, SlidersHorizontal } from "lucide-react";
import { listCategories } from "@/modules/empenhos/classifier";
import type { EmpenhoFilters } from "@/modules/empenhos/types";

const statuses = ["Pago", "A pagar", "A liquidar", "Anulado", "Parcial"];
const risks = ["Baixo", "Médio", "Alto", "Crítico"];
const months = [
  ["1", "Janeiro"],
  ["2", "Fevereiro"],
  ["3", "Março"],
  ["4", "Abril"],
  ["5", "Maio"],
  ["6", "Junho"],
  ["7", "Julho"],
  ["8", "Agosto"],
  ["9", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"]
];

export function FiltersBar({ filters, action = "/dashboard" }: { filters: EmpenhoFilters; action?: string }) {
  return (
    <form action={action} className="rounded border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
        <SlidersHorizontal size={18} className="text-folha-600" aria-hidden="true" />
        Filtros de empenhos
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Período inicial
          <input name="periodoInicio" type="date" defaultValue={filters.periodoInicio} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Período final
          <input name="periodoFim" type="date" defaultValue={filters.periodoFim} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Ano
          <select name="ano" defaultValue={filters.ano ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">
            <option value="">Todos</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Mês
          <select name="mes" defaultValue={filters.mes ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">
            <option value="">Todos</option>
            {months.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Categoria
          <select name="categoria" defaultValue={filters.categoria ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">
            <option value="">Todas</option>
            {listCategories().map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Secretaria estimada
          <input name="secretariaEstimada" defaultValue={filters.secretariaEstimada} placeholder="Ex.: Saúde" className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Credor
          <input name="credor" defaultValue={filters.credor} placeholder="Fornecedor ou credor" className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Processo de compra
          <input name="processoCompra" defaultValue={filters.processoCompra} placeholder="Número ou trecho" className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Modalidade
          <input name="modalidade" defaultValue={filters.modalidade} placeholder="Pregão, dispensa..." className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">
            <option value="">Todos</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Nível de risco
          <select name="riskLevel" defaultValue={filters.riskLevel ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2">
            <option value="">Todos</option>
            {risks.map((risk) => (
              <option key={risk} value={risk}>{risk}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Busca no histórico
          <span className="relative mt-1 block">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input name="busca" defaultValue={filters.busca} placeholder="Medicamento, obra, contrato..." className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3" />
          </span>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="apenasAlertas" type="checkbox" defaultChecked={filters.apenasAlertas} value="true" className="h-4 w-4 rounded border-slate-300 text-folha-600" />
          Apenas empenhos com ponto de atenção
        </label>
        <div className="flex gap-2">
          <a href={action} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Limpar</a>
          <button className="rounded bg-folha-600 px-4 py-2 text-sm font-semibold text-white hover:bg-folha-800" type="submit">Aplicar filtros</button>
        </div>
      </div>
    </form>
  );
}
