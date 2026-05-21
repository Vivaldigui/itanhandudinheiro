import { Charts } from "@/components/Charts";
import { EmpenhosTable } from "@/components/EmpenhosTable";
import { ExportButtons } from "@/components/ExportButtons";
import { FiltersBar } from "@/components/FiltersBar";
import { Layout } from "@/components/Layout";
import { SummaryCards } from "@/components/SummaryCards";
import { getDashboardSummary, getEmpenhos } from "@/lib/dashboardQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(params: Record<string, string | string[] | undefined> = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => searchParams.append(key, item));
    else if (value != null) searchParams.set(key, value);
  }
  return searchParams;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const filters = parseFiltersFromSearchParams(toUrlSearchParams(rawParams));
  const [summary, table] = await Promise.all([
    getDashboardSummary(filters),
    getEmpenhos({ ...filters, pageSize: filters.pageSize ?? 20 })
  ]);

  return (
    <Layout>
      <div className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-soft">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-folha-800">Módulo ativo: Empenhos</p>
        <h1 className="text-3xl font-black text-slate-950">Empenhos públicos</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">Despesas empenhadas extraídas do Portal Cidadão da Prefeitura Municipal de Itanhandu.</p>
        <p className="mt-3 max-w-4xl rounded bg-slate-50 p-3 text-sm leading-6 text-slate-600">Neste primeiro momento, a plataforma apresenta os dados de empenhos. Novos módulos de transparência serão adicionados gradualmente.</p>
      </div>

      <div className="space-y-5">
        <FiltersBar filters={filters} action="/dashboard" />
        <SummaryCards summary={summary} />
        <div className="flex justify-end">
          <ExportButtons />
        </div>
        <Charts summary={summary} />
        <EmpenhosTable items={table.items} total={table.total} page={table.page} pageSize={table.pageSize} filters={filters} />
      </div>
    </Layout>
  );
}

