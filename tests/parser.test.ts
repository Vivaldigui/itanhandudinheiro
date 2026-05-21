import { describe, expect, it } from "vitest";
import { extractDocumentosPagamento, parseEmpenhosFromText } from "@/modules/empenhos/pdfParser";

const sampleText = `
Empenho: 123/2026
Tipo: Ordinario
Data: 04/05/2026
Ficha: Saude
Credor: Clinica Boa Saude Ltda
Fonte: Recursos proprios
Codigo de Aplicacao: Saude
Valor Empenhado: 12.345,67
Valor Anulado: 0,00
Valor Liquidado: 5.000,00
Valor Liquidado a Pagar: 2.000,00
Valor Pago: 3.000,00
Valor a Liquidar: 7.345,67
Valor a Pagar: 9.345,67
Historico: Servicos medicos para Paciente Joao da Silva conforme autorizacao municipal.
Processo Compra: PC-001/2026
Modalidade: Dispensa
Processo Licitatorio: PL-001/2026
Pedido Compra: 456/2026
Contrato: 10/2026
Documento de Pagamento: NF-e 987 10/05/2026 5.000,00

Empenho: 124/2026
Data: 05/05/2026
Credor: Posto Central
Valor Empenhado: 1.000,00
Historico: Abastecimento de veiculo da frota municipal.
`;

const portalTableText = `
Empenho
Data
Ficha
Credor
Fonte
Cod. Apl
Empenhado
Anulado
Liquidado
Liq Anulado
Pago
Anul Pago
A Liquidar
Liq a Pagar
A Pagar
Tipo Emp
813,82
MULTIPLIQUE COMERCIO E SERVICOSLTDA
813,82
5242
813,82
2.661.000
04/05/2026
0,00
0000
0,00
813,82
0,00
0,00
0,00
O
221
Historico:
AQUISICAO DE GENEROS ALIMENTICIOS PARA ATENDER OS GRUPOS DO CRAS
Processo Compra: 1322/2025 - Licitacao - PE - Pregao Eletronico - Processo Licit.: 94/2025 Num. Mod.: 53 - Pedido de Compra: 3006/2026
Tipo
Numero
Valor
Data de Emissao
Descricao
Documentos de Pagamentos
Data de
Vencimento
Nota Fiscal
12/05/2026
383,52
005902
ITEM PARA CONSUMO DO SCFV
14/05/2026
Total Documentos de Pagamentos:
383,52
`;

describe("parser de empenhos", () => {
  it("extrai empenhos do texto do PDF", () => {
    const result = parseEmpenhosFromText(sampleText, 2026, 5);
    expect(result).toHaveLength(2);
    expect(result[0].numeroEmpenho).toBe("123/2026");
    expect(result[0].valorEmpenhado).toBe(12345.67);
    expect(result[0].processoCompra).toBe("PC-001/2026");
    expect(result[0].historicoMascarado).toContain("[DADO PROTEGIDO]");
  });

  it("extrai documentos de pagamento", () => {
    const docs = extractDocumentosPagamento(sampleText);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].tipo).toBe("Nota fiscal");
    expect(docs[0].valor).toBe(5000);
  });

  it("extrai empenho do layout tabular real do Portal Cidadao", () => {
    const result = parseEmpenhosFromText(portalTableText, 2026, 5);
    expect(result).toHaveLength(1);
    expect(result[0].numeroEmpenho).toBe("5242");
    expect(result[0].credor).toBe("MULTIPLIQUE COMERCIO E SERVICOSLTDA");
    expect(result[0].processoCompra).toBe("1322/2025");
    expect(result[0].documentosPagamento[0].numero).toBe("005902");
  });
});
