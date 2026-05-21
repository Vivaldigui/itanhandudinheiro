import { EmpenhosTable } from "@/components/EmpenhosTable";
import { ExportButtons } from "@/components/ExportButtons";
import { FiltersBar } from "@/components/FiltersBar";
import { Layout } from "@/components/Layout";
import { getEmpenhos } from "@/lib/dashboardQueries";
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

export default async function EmpenhosPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const filters = parseFiltersFromSearchParams(toUrlSearchParams(rawParams));
  const table = await getEmpenhos({ ...filters, pageSize: filters.pageSize ?? 30 });

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4 rounded border border-slate-200 bg-white p-5 shadow-soft md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-folha-800">Empenhos</p>
          <h1 className="text-3xl font-black text-slate-950">Consulta de empenhos</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">Busque, filtre, ordene e exporte empenhos públicos processados a partir dos PDFs do Portal Cidadão.</p>
        </div>
        <ExportButtons />
      </div>
      <div className="space-y-5">
        <FiltersBar filters={filters} action="/empenhos" />
        <EmpenhosTable items={table.items} total={table.total} page={table.page} pageSize={table.pageSize} filters={filters} />
      </div>
    </Layout>
  );
}

