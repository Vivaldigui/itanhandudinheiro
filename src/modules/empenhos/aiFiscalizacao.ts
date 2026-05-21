import type { FiscalizacaoResumo, NormalizedEmpenho } from "./types";

export function generateFiscalizacaoBrief(empenho: NormalizedEmpenho): FiscalizacaoResumo {
  const numero = empenho.numeroEmpenho;
  const categoria = empenho.categoria.toLocaleLowerCase("pt-BR");
  const alertas = empenho.alertas.map((alerta) => alerta.tipo).join(", ") || "ponto de atenção operacional";

  return {
    resumo: `O empenho nº ${numero} registra despesa com ${categoria} para o credor ${empenho.credor}. O valor empenhado e os saldos devem ser lidos junto do histórico, processo de compra e documentos de pagamento.`,
    motivoPontoAtencao: `O sistema marcou este empenho como ${empenho.riskLevel.toLocaleLowerCase("pt-BR")} porque encontrou: ${alertas}. Isso é um indicativo para conferência documental, não uma conclusão sobre o gasto.`,
    documentosSolicitar: [
      `Cópia do processo de compra relacionado ao empenho nº ${numero}.`,
      "Nota fiscal, recibo ou documento equivalente.",
      "Comprovante de pagamento ou ordem bancária, quando houver.",
      "Termo de recebimento, medição, atesto ou comprovação da entrega.",
      "Justificativa de preço, autorização da despesa e pareceres aplicáveis."
    ],
    perguntasSugeridas: [
      "Qual objeto foi entregue ou executado com esta despesa?",
      "O processo de compra contém pesquisa de preços e justificativa suficiente?",
      "A liquidação foi feita com base em documento de recebimento ou atesto?",
      "Há contrato, aditamento ou processo anterior vinculado ao empenho?",
      "O saldo a pagar ou a liquidar tem previsão de regularização?"
    ],
    oQueVerificar: [
      "Se o histórico descreve claramente o objeto da despesa.",
      "Se valores empenhados, liquidados e pagos batem com os documentos.",
      "Se o fornecedor aparece de forma recorrente no período.",
      "Se há entrega comprovada antes da liquidação.",
      "Se a modalidade de compra é compatível com o objeto e o valor."
    ]
  };
}

