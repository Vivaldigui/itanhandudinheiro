import { AlertTriangle, ClipboardList, FileCheck2 } from "lucide-react";
import { AlertCountBadge, CategoryBadge, RiskBadge, StatusBadge } from "./AlertBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { PlainEmpenho } from "@/modules/empenhos/types";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  );
}

export function EmpenhoDetailDrawer({ empenho }: { empenho: PlainEmpenho }) {
  const briefing = empenho.resumoFiscalizacao;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div className="rounded border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Empenho nº {empenho.numeroEmpenho}</h1>
              <p className="mt-1 text-slate-600">{empenho.credor}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CategoryBadge category={empenho.categoria} />
              <StatusBadge status={empenho.status} />
              <RiskBadge level={empenho.riskLevel} />
              <AlertCountBadge count={empenho.alertas.length} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Data" value={formatDate(empenho.dataEmpenho ?? empenho.dataEmpenhoIso)} />
          <Field label="Secretaria estimada" value={empenho.secretariaEstimada} />
          <Field label="Ficha" value={empenho.ficha} />
          <Field label="Valor empenhado" value={formatCurrency(empenho.valorEmpenhado)} />
          <Field label="Liquidado" value={formatCurrency(empenho.valorLiquidado)} />
          <Field label="Pago" value={formatCurrency(empenho.valorPago)} />
          <Field label="A liquidar" value={formatCurrency(empenho.valorALiquidar)} />
          <Field label="Liquidado a pagar" value={formatCurrency(empenho.valorLiquidadoAPagar)} />
          <Field label="A pagar" value={formatCurrency(empenho.valorAPagar)} />
        </div>

        <div className="rounded border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-950">
            <ClipboardList size={20} className="text-folha-600" aria-hidden="true" />
            Histórico completo mascarado
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{empenho.historicoMascarado || "Histórico não identificado no PDF."}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Processo de compra" value={empenho.processoCompra} />
          <Field label="Modalidade" value={empenho.modalidadeLicitacao} />
          <Field label="Processo licitatório" value={empenho.processoLicitatorio} />
          <Field label="Número da modalidade" value={empenho.numeroModalidade} />
          <Field label="Pedido de compra" value={empenho.pedidoCompra} />
          <Field label="Contrato" value={empenho.contrato} />
          <Field label="Aditamento" value={empenho.aditamento} />
          <Field label="Gestor" value={empenho.gestor} />
        </div>

        <div className="rounded border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-950">
            <FileCheck2 size={20} className="text-folha-600" aria-hidden="true" />
            Documentos de pagamento e notas fiscais
          </h2>
          {empenho.documentosPagamento.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Número</th>
                    <th className="py-2">Data</th>
                    <th className="py-2">Valor</th>
                    <th className="py-2">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {empenho.documentosPagamento.map((doc, index) => (
                    <tr key={`${doc.numero}-${index}`} className="border-t border-slate-100">
                      <td className="py-2">{doc.tipo}</td>
                      <td className="py-2">{doc.numero}</td>
                      <td className="py-2">{formatDate(doc.dataEmissao)}</td>
                      <td className="py-2">{formatCurrency(doc.valor)}</td>
                      <td className="py-2">{doc.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Nenhum documento de pagamento foi identificado pelo parser neste empenho.</p>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded border border-amber-200 bg-amber-50 p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-bold text-amber-950">
            <AlertTriangle size={20} aria-hidden="true" />
            Pontos de atenção
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">Alertas são triagens para conferência documental. Eles não indicam conclusão de irregularidade.</p>
          <div className="mt-4 space-y-3">
            {empenho.alertas.length ? empenho.alertas.map((alerta) => (
              <div key={`${alerta.tipo}-${alerta.descricao}`} className="rounded border border-amber-200 bg-white p-3">
                <div className="font-semibold text-slate-900">{alerta.tipo}</div>
                <p className="mt-1 text-sm text-slate-700">{alerta.descricao}</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{alerta.sugestaoFiscalizacao}</p>
              </div>
            )) : <p className="text-sm text-slate-600">Nenhum ponto de atenção automático para este empenho.</p>}
          </div>
        </div>

        {briefing ? (
          <div className="rounded border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold text-slate-950">Resumo para fiscalização</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{briefing.resumo}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{briefing.motivoPontoAtencao}</p>
            <h3 className="mt-4 text-sm font-bold text-slate-950">Documentos que podem ser solicitados</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {briefing.documentosSolicitar.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <h3 className="mt-4 text-sm font-bold text-slate-950">Perguntas sugeridas</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {briefing.perguntasSugeridas.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

