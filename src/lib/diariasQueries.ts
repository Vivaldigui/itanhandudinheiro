import { getEmpenhos } from "./dashboardQueries";
import { analyzeDiarias, applyDiariasFilters, summarizeDiarias, type DiariaItem, type DiariasSummary } from "@/modules/diarias/analyzer";
import type { EmpenhoFilters } from "@/modules/empenhos/types";

async function getAllEmpenhos(filters: EmpenhoFilters = {}) {
  const first = await getEmpenhos({ ...filters, page: 1, pageSize: 500 });
  const items = [...first.items];
  const pages = Math.ceil(first.total / first.pageSize);
  for (let page = 2; page <= pages; page += 1) {
    const next = await getEmpenhos({ ...filters, page, pageSize: 500 });
    items.push(...next.items);
  }
  return items;
}

function sortDiarias(items: DiariaItem[], filters: EmpenhoFilters): DiariaItem[] {
  const sortBy = filters.sortBy ?? "dataEmpenho";
  const direction = filters.sortDir === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const a = sortBy === "credor" ? left.credor : sortBy === "riskScore" ? left.alertas.length : sortBy === "valorEmpenhado" ? left.valor : left.dataEmpenho?.getTime() ?? 0;
    const b = sortBy === "credor" ? right.credor : sortBy === "riskScore" ? right.alertas.length : sortBy === "valorEmpenhado" ? right.valor : right.dataEmpenho?.getTime() ?? 0;
    return a > b ? direction : a < b ? -direction : 0;
  });
}

export async function getDiarias(filters: EmpenhoFilters = {}): Promise<{ items: DiariaItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 25));
  const empenhos = await getAllEmpenhos({ ...filters, page: undefined, pageSize: undefined });
  const { items } = analyzeDiarias(empenhos);
  const filtered = sortDiarias(applyDiariasFilters(items, filters), filters);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize
  };
}

export async function getDiariasSummary(filters: EmpenhoFilters = {}): Promise<DiariasSummary> {
  const empenhos = await getAllEmpenhos({ ...filters, page: undefined, pageSize: undefined });
  const { items } = analyzeDiarias(empenhos);
  return summarizeDiarias(applyDiariasFilters(items, filters));
}
