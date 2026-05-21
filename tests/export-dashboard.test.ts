import { describe, expect, it } from "vitest";
import { getEmpenhos } from "@/lib/dashboardQueries";
import { empenhosToCsv } from "@/modules/empenhos/exports";

describe("filtros e exportações", () => {
  it("filtra dashboard por categoria usando fallback local quando banco não está disponível", async () => {
    const result = await getEmpenhos({ categoria: "Combustível e Frota", pageSize: 10 });
    expect(result.items.every((item) => item.categoria === "Combustível e Frota")).toBe(true);
  });

  it("exporta CSV com cabeçalho e linhas", async () => {
    const result = await getEmpenhos({ pageSize: 2 });
    const csv = empenhosToCsv(result.items);
    expect(csv).toContain("Empenho;Data;Credor");
    expect(csv.split("\n").length).toBeGreaterThan(1);
  });
});

