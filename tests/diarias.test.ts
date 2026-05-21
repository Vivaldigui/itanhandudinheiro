import { describe, expect, it } from "vitest";
import { analyzeDiarias, extractDestino, isDiariaEmpenho } from "@/modules/diarias/analyzer";
import type { PlainEmpenho } from "@/modules/empenhos/types";

const base: PlainEmpenho = {
  id: "1",
  numeroEmpenho: "1302/2026",
  ano: 2026,
  mes: 5,
  dataEmpenho: new Date(2026, 4, 14, 12),
  dataEmpenhoIso: "2026-05-14T15:00:00.000Z",
  tipoEmpenho: null,
  ficha: null,
  credor: "SERVIDOR MUNICIPAL",
  fonte: null,
  codigoAplicacao: null,
  valorEmpenhado: 980,
  valorAnulado: 0,
  valorLiquidado: 980,
  valorLiquidadoAnulado: 0,
  valorPago: 980,
  valorPagoAnulado: 0,
  valorALiquidar: 0,
  valorLiquidadoAPagar: 0,
  valorAPagar: 0,
  historico: "Pagamento de diaria ao servidor para viagem a Belo Horizonte para capacitacao.",
  historicoMascarado: "Pagamento de diaria ao servidor para viagem a Belo Horizonte para capacitacao.",
  processoCompra: "DIARIA-014/2026",
  modalidadeLicitacao: null,
  processoLicitatorio: null,
  numeroModalidade: null,
  pedidoCompra: null,
  contrato: null,
  aditamento: null,
  gestor: null,
  categoria: "Servicos Administrativos",
  secretariaEstimada: "Administracao",
  status: "Pago",
  riskScore: 30,
  riskLevel: "Médio",
  alertas: [],
  documentosPagamento: []
};

describe("analise de diarias derivada dos empenhos", () => {
  it("identifica empenho com diaria ou viagem", () => {
    expect(isDiariaEmpenho(base)).toBe(true);
  });

  it("extrai destino quando o historico informa viagem", () => {
    expect(extractDestino(base.historico ?? "")).toBe("Belo Horizonte");
  });

  it("gera resumo de diarias", () => {
    const result = analyzeDiarias([base]);
    expect(result.items).toHaveLength(1);
    expect(result.summary.totals.valorTotal).toBe(980);
    expect(result.summary.topDestinos[0].name).toBe("Belo Horizonte");
  });
});
