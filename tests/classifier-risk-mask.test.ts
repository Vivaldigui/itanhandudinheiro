import { describe, expect, it } from "vitest";
import { classifyCategory } from "@/modules/empenhos/classifier";
import { maskSensitiveData } from "@/modules/empenhos/maskSensitiveData";
import { normalizeEmpenho } from "@/modules/empenhos/normalizer";
import { calculateRisksForMonth } from "@/modules/empenhos/riskEngine";

describe("classificação, risco e LGPD", () => {
  it("classifica categorias por palavras-chave", () => {
    expect(classifyCategory("compra de diesel para veículo da frota")).toBe("Combustível e Frota");
    expect(classifyCategory("software e licença de sistema")).toBe("Tecnologia");
    expect(classifyCategory("merenda para alunos da escola")).toBe("Educação");
  });

  it("mascara dados sensíveis", () => {
    const masked = maskSensitiveData("Consulta para Paciente João da Silva CPF 123.456.789-10 telefone 35999998888 Rua Central, 123");
    expect(masked).toContain("[DADO PROTEGIDO]");
    expect(masked).toContain("[CPF PROTEGIDO]");
    expect(masked).toContain("[TELEFONE PROTEGIDO]");
    expect(masked).toContain("[ENDERECO PROTEGIDO]");
  });

  it("calcula risco com alertas", () => {
    const empenhos = [
      normalizeEmpenho({ ano: 2026, mes: 5, numeroEmpenho: "1", credor: "Fornecedor A", valorEmpenhado: "100.000,00", valorPago: "0,00", valorALiquidar: "100.000,00", historico: "serviços diversos", processoCompra: "PC-1" }),
      normalizeEmpenho({ ano: 2026, mes: 5, numeroEmpenho: "2", credor: "Fornecedor B", valorEmpenhado: "100,00", valorPago: "100,00", valorALiquidar: "0,00", historico: "compra de material escolar detalhado" }),
      normalizeEmpenho({ ano: 2026, mes: 5, numeroEmpenho: "3", credor: "Fornecedor C", valorEmpenhado: "200,00", valorPago: "200,00", valorALiquidar: "0,00", historico: "compra de material escolar detalhado" })
    ];
    const [high] = calculateRisksForMonth(empenhos);
    expect(high.riskScore).toBeGreaterThanOrEqual(30);
    expect(high.alertas.length).toBeGreaterThan(0);
  });
});

