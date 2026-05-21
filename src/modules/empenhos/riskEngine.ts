import type { FiscalizacaoAlert, NormalizedEmpenho, RiskLevel } from "./types";

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "Crítico";
  if (score >= 60) return "Alto";
  if (score >= 30) return "Médio";
  return "Baixo";
}

function percentile(values: number[], target: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((target / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function isGenericHistory(text?: string | null): boolean {
  const normalized = (text ?? "").toLocaleLowerCase("pt-BR");
  if (normalized.length < 45) return true;
  return ["serviços diversos", "despesas diversas", "aquisição de materiais", "prestação de serviços"].some((term) =>
    normalized.includes(term)
  );
}

function makeAlert(tipo: string, nivel: RiskLevel, descricao: string, sugestaoFiscalizacao: string): FiscalizacaoAlert {
  return { tipo, nivel, descricao, sugestaoFiscalizacao };
}

export function calculateRiskForEmpenho(
  empenho: NormalizedEmpenho,
  monthEmpenhos: NormalizedEmpenho[]
): Pick<NormalizedEmpenho, "riskScore" | "riskLevel" | "alertas"> {
  let score = 0;
  const alertas: FiscalizacaoAlert[] = [];
  const monthValues = monthEmpenhos.map((item) => item.valorEmpenhado).filter((value) => value > 0);
  const p75 = percentile(monthValues, 75);
  const p90 = percentile(monthValues, 90);
  const sameCredor = monthEmpenhos.filter((item) => item.credor === empenho.credor);
  const sameDay = sameCredor.filter(
    (item) =>
      item.dataEmpenho?.toISOString().slice(0, 10) &&
      item.dataEmpenho?.toISOString().slice(0, 10) === empenho.dataEmpenho?.toISOString().slice(0, 10)
  );
  const sameProcess = empenho.processoCompra
    ? monthEmpenhos.filter((item) => item.processoCompra === empenho.processoCompra)
    : [];
  const monthTotal = monthValues.reduce((sum, value) => sum + value, 0);
  const credorTotal = sameCredor.reduce((sum, item) => sum + item.valorEmpenhado, 0);

  if (empenho.valorEmpenhado >= p90 && p90 > 0) {
    score += 25;
    alertas.push(makeAlert("Valor elevado para o mês", "Alto", "O empenho está entre os maiores valores do mês.", "Conferir justificativa da despesa, processo de compra, autorização e documentação de entrega."));
  } else if (empenho.valorEmpenhado >= p75 && p75 > 0) {
    score += 15;
    alertas.push(makeAlert("Valor acima da mediana", "Médio", "O valor empenhado está acima da maior parte dos empenhos do mês.", "Verificar se a descrição e os documentos explicam adequadamente o gasto."));
  }

  if (sameCredor.length >= 5) {
    score += 15;
    alertas.push(makeAlert("Credor recorrente", "Médio", "O mesmo credor aparece em vários empenhos no mês.", "Conferir se os empenhos têm objetos distintos e documentação individualizada."));
  }

  if (sameDay.length >= 3) {
    score += 10;
    alertas.push(makeAlert("Muitos empenhos no mesmo dia", "Médio", "Há vários empenhos para o mesmo credor no mesmo dia.", "Conferir se houve fracionamento operacional ou se os processos justificam a separação."));
  }

  if (sameProcess.length >= 4) {
    score += 10;
    alertas.push(makeAlert("Muitos empenhos no mesmo processo de compra", "Médio", "O processo de compra está vinculado a vários empenhos.", "Solicitar cópia integral do processo e verificar itens, fornecedores e autorizações."));
  }

  if (isGenericHistory(empenho.historico)) {
    score += 10;
    alertas.push(makeAlert("Histórico genérico", "Médio", "O histórico tem baixa descrição do objeto da despesa.", "Pedir detalhamento do objeto, nota fiscal e termo de recebimento."));
  }

  const textoCompra = `${empenho.modalidadeLicitacao ?? ""} ${empenho.historico ?? ""}`.toLocaleLowerCase("pt-BR");
  if (/(dispensa|inexigibilidade|compra direta|adiantamento)/i.test(textoCompra)) {
    score += 10;
    alertas.push(makeAlert("Compra direta ou despesa recorrente", "Médio", "A despesa parece envolver compra direta ou rotina administrativa recorrente.", "Verificar fundamento, cotação de preços e justificativa da contratação."));
  }

  if (empenho.aditamento) {
    score += 10;
    alertas.push(makeAlert("Contrato com aditamento", "Médio", "O empenho informa aditamento contratual.", "Conferir termo aditivo, objeto, prazo, valor e justificativa."));
  }

  if (empenho.valorALiquidar > Math.max(p75, 10000)) {
    score += 10;
    alertas.push(makeAlert("Valor alto ainda não liquidado", "Médio", "Há valor relevante ainda a liquidar.", "Conferir se o bem ou serviço foi entregue e se há previsão de liquidação."));
  }

  if (empenho.valorAPagar > Math.max(p75, 10000) || empenho.valorLiquidadoAPagar > Math.max(p75, 10000)) {
    score += 10;
    alertas.push(makeAlert("Valor alto ainda não pago", "Médio", "Há valor relevante liquidado ou registrado a pagar.", "Verificar documentos de pagamento, ordem cronológica e comprovantes."));
  }

  if (monthTotal > 0 && credorTotal / monthTotal >= 0.2) {
    score += 10;
    alertas.push(makeAlert("Concentração de despesa por fornecedor", "Alto", "O credor concentra parcela relevante do valor empenhado no mês.", "Comparar com contratos, processos de compra e demais fornecedores do período."));
  }

  const cappedScore = Math.min(100, score);
  return {
    riskScore: cappedScore,
    riskLevel: riskLevelFromScore(cappedScore),
    alertas
  };
}

export function calculateRisksForMonth(empenhos: NormalizedEmpenho[]): NormalizedEmpenho[] {
  return empenhos.map((empenho) => ({
    ...empenho,
    ...calculateRiskForEmpenho(empenho, empenhos)
  }));
}

