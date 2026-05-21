import { describe, expect, it } from "vitest";
import { calculateEmpenhoStatus, hasSameSha256, parseBrazilianCurrency, parseBrazilianDate } from "@/modules/empenhos/normalizer";

describe("normalização de empenhos", () => {
  it("converte valores brasileiros", () => {
    expect(parseBrazilianCurrency("1.234,56")).toBe(1234.56);
    expect(parseBrazilianCurrency("0,00")).toBe(0);
    expect(parseBrazilianCurrency("R$ 15.010,90")).toBe(15010.9);
  });

  it("converte datas brasileiras", () => {
    const date = parseBrazilianDate("04/05/2026");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(4);
    expect(date?.getDate()).toBe(4);
  });

  it("calcula status do empenho", () => {
    expect(calculateEmpenhoStatus({ valorEmpenhado: 100, valorAnulado: 0, valorPago: 100, valorALiquidar: 0, valorLiquidadoAPagar: 0, valorAPagar: 0 })).toBe("Pago");
    expect(calculateEmpenhoStatus({ valorEmpenhado: 100, valorAnulado: 0, valorPago: 20, valorALiquidar: 80, valorLiquidadoAPagar: 0, valorAPagar: 80 })).toBe("Parcial");
    expect(calculateEmpenhoStatus({ valorEmpenhado: 0, valorAnulado: 100, valorPago: 0, valorALiquidar: 0, valorLiquidadoAPagar: 0, valorAPagar: 0 })).toBe("Anulado");
  });

  it("deduplica por hash", () => {
    expect(hasSameSha256("abc", "abc")).toBe(true);
    expect(hasSameSha256("abc", "def")).toBe(false);
  });
});

