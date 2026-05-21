import type { PlainEmpenho } from "./types";
import { formatCurrency, formatDate } from "@/lib/formatters";

const csvColumns = [
  "Empenho",
  "Data",
  "Credor",
  "Categoria",
  "Valor empenhado",
  "Liquidado",
  "Pago",
  "A liquidar",
  "A pagar",
  "Status",
  "Risco",
  "Alertas"
];

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function empenhosToCsv(empenhos: PlainEmpenho[]): string {
  const rows = empenhos.map((item) => [
    item.numeroEmpenho,
    formatDate(item.dataEmpenho ?? item.dataEmpenhoIso),
    item.credor,
    item.categoria,
    item.valorEmpenhado,
    item.valorLiquidado,
    item.valorPago,
    item.valorALiquidar,
    item.valorAPagar,
    item.status,
    item.riskLevel,
    item.alertas.map((alerta) => alerta.tipo).join(" | ")
  ]);
  return [csvColumns, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export function generateMonthlyBriefing(args: {
  ano: number;
  mes: number;
  empenhos: PlainEmpenho[];
}): string {
  const totalEmpenhado = args.empenhos.reduce((sum, item) => sum + item.valorEmpenhado, 0);
  const totalPago = args.empenhos.reduce((sum, item) => sum + item.valorPago, 0);
  const totalAPagar = args.empenhos.reduce((sum, item) => sum + item.valorAPagar + item.valorLiquidadoAPagar, 0);
  const byCredor = new Map<string, number>();
  const byProcesso = new Map<string, number>();
  const byCategoria = new Map<string, number>();

  for (const item of args.empenhos) {
    byCredor.set(item.credor, (byCredor.get(item.credor) ?? 0) + item.valorEmpenhado);
    byProcesso.set(item.processoCompra ?? "Sem processo informado", (byProcesso.get(item.processoCompra ?? "Sem processo informado") ?? 0) + item.valorEmpenhado);
    byCategoria.set(item.categoria, (byCategoria.get(item.categoria) ?? 0) + item.valorEmpenhado);
  }

  const top = (map: Map<string, number>, limit = 5) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, value]) => `- ${name}: ${formatCurrency(value)}`)
      .join("\n");

  const critical = args.empenhos
    .filter((item) => item.riskLevel === "Crítico" || item.riskLevel === "Alto")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8);

  return `# Briefing mensal de empenhos - ${String(args.mes).padStart(2, "0")}/${args.ano}

## Síntese
- Total empenhado: ${formatCurrency(totalEmpenhado)}
- Total pago: ${formatCurrency(totalPago)}
- Total a pagar: ${formatCurrency(totalAPagar)}
- Quantidade de empenhos: ${args.empenhos.length}

## Maiores fornecedores
${top(byCredor)}

## Maiores processos de compra
${top(byProcesso)}

## Categorias com maior gasto
${top(byCategoria)}

## Pontos de atenção prioritários
${critical.length ? critical.map((item) => `- Empenho ${item.numeroEmpenho}, ${item.credor}, ${formatCurrency(item.valorEmpenhado)}: ${item.alertas.map((alerta) => alerta.tipo).join(", ")}`).join("\n") : "- Nenhum ponto de atenção alto ou crítico no recorte consultado."}

## Perguntas sugeridas para vereadores
- Os maiores empenhos possuem processo de compra, autorização e nota fiscal compatíveis?
- Os saldos a pagar e a liquidar têm justificativa e prazo de regularização?
- Os fornecedores recorrentes possuem contratos, atas ou processos que expliquem a concentração?
- As despesas com histórico genérico têm objeto detalhado nos documentos internos?

## Documentos recomendados
- Processo de compra completo.
- Notas fiscais e comprovantes de pagamento.
- Termos de recebimento, medições ou atestos.
- Justificativa de preço e autorização da despesa.

> Observação: pontos de atenção são indicativos para conferência documental. Eles não significam conclusão de irregularidade.
`;
}

