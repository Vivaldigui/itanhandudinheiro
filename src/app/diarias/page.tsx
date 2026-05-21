import Link from "next/link";
import { MapPinned, ReceiptText, Route, UsersRound, WalletCards } from "lucide-react";
import { DiariasCharts } from "@/components/DiariasCharts";
import { FiltersBar } from "@/components/FiltersBar";
import { Layout } from "@/components/Layout";
import { RiskBadge, StatusBadge } from "@/components/AlertBadge";
import { getDiariasPageData } from "@/lib/diariasQueries";
import { formatCurrency, formatDate, formatNumber, parseFiltersFromSearchParams } from "@/lib/formatters";

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

export default async function DiariasPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const filters = parseFiltersFromSearchParams(toUrlSearchParams(rawParams));
  const { summary, table } = await getDiariasPageData({ ...filters, pageSize: filters.pageSize ?? 25 });

  const cards = [
    { label: "Total em diárias e viagens", value: formatCurrency(summary.totals.valorTotal), icon: WalletCards },
    { label: "Registros encontrados", value: formatNumber(summary.totals.quantidade), icon: ReceiptText },
    { label: "Credores / beneficiarios", value: formatNumber(summary.totals.quantidadeCredores), icon: UsersRound },
    { label: "Destinos identificados", value: formatNumber(summary.totals.quantidadeDestinos), icon: MapPinned },
    { label: "Maior despesa", value: summary.totals.maiorDespesa ? formatCurrency(summary.totals.maiorDespesa.valor) : "-", icon: Route }
  ];
  const pageCount = Math.max(1, Math.ceil(table.total / table.pageSize));

  return (
    <Layout>
      <div className="mb-6 rounded border border-slate-200 bg-white p-5 shadow-soft">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-folha-800">Visao derivada dos empenhos</p>
        <h1 className="text-3xl font-black text-slate-950">Diárias, viagens e deslocamentos</h1>
        <p className="mt-2 max-w-4xl leading-7 text-slate-600">
          Esta tela filtra empenhos cujo historico indica diaria, viagem, hospedagem, passagem, deslocamento ou despesa relacionada. Os valores devem ser conferidos no detalhe do empenho e nos documentos originais.
        </p>
      </div>

      <div className="space-y-5">
        <FiltersBar filters={filters} action="/diarias" />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;
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

        <DiariasCharts summary={summary} />

        <section className="rounded border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-bold text-slate-950">Tabela de diárias e deslocamentos</h2>
            <p className="text-sm text-slate-600">{table.total} registro{table.total === 1 ? "" : "s"} encontrado{table.total === 1 ? "" : "s"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Empenho</th>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Credor / beneficiario</th>
                  <th className="px-3 py-3">Destino</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Valor</th>
                  <th className="px-3 py-3">Secretaria estimada</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Ponto de atencao</th>
                  <th className="px-3 py-3">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-folha-50">
                    <td className="px-3 py-3 font-semibold text-slate-900">{item.numeroEmpenho}</td>
                    <td className="px-3 py-3 text-slate-700">{formatDate(item.dataEmpenho ?? item.dataEmpenhoIso)}</td>
                    <td className="max-w-[260px] px-3 py-3 text-slate-800">
                      <div className="font-semibold">{item.credor}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.beneficiario}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.destino}</td>
                    <td className="px-3 py-3 text-slate-700">{item.tipoDespesa}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(item.valor)}</td>
                    <td className="px-3 py-3 text-slate-700">{item.secretariaEstimada ?? "-"}</td>
                    <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-3"><RiskBadge level={item.riskLevel} /></td>
                    <td className="px-3 py-3">
                      <Link href={`/empenhos/${item.empenhoId}`} className="inline-flex rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-folha-600 hover:text-folha-800">
                        Abrir empenho
                      </Link>
                    </td>
                  </tr>
                ))}
                {table.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-slate-500">Nenhum empenho com indicio de diaria, viagem ou deslocamento para os filtros aplicados.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <span className="text-slate-600">Pagina {table.page} de {pageCount}</span>
          </div>
        </section>
      </div>
    </Layout>
  );
}
