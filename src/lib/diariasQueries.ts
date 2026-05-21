import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { buildWhere, toPlainEmpenho } from "./dashboardQueries";
import { analyzeDiarias, applyDiariasFilters, buildDiariaItem, summarizeDiarias, type DiariaItem, type DiariasSummary } from "@/modules/diarias/analyzer";
import type { AIDiariaResponse } from "@/lib/geminiDiarias";
import type { EmpenhoFilters } from "@/modules/empenhos/types";

const diariaTerms = [
  "diaria",
  "diarias",
  "diária",
  "diárias",
  "diÃ¡ria",
  "diÃ¡rias",
  "viagem",
  "deslocamento",
  "hospedagem",
  "passagem",
  "passagens",
  "estadia",
  "adiantamento",
  "ressarcimento",
  "taxa de inscricao",
  "taxa de inscrição",
  "taxa de inscriÃ§Ã£o"
];

const diariaSearchFields = [
  "historico",
  "historicoMascarado",
  "credor",
  "processoCompra",
  "modalidadeLicitacao",
  "secretariaEstimada"
] satisfies Array<keyof Prisma.EmpenhoWhereInput>;

function buildDiariasWhere(filters: EmpenhoFilters): Prisma.EmpenhoWhereInput {
  const baseWhere = buildWhere({ ...filters, page: undefined, pageSize: undefined });
  const diariaWhere: Prisma.EmpenhoWhereInput = {
    OR: diariaTerms.flatMap((term) =>
      diariaSearchFields.map((field) => ({
        [field]: { contains: term, mode: "insensitive" }
      }))
    ) as Prisma.EmpenhoWhereInput[]
  };

  return Object.keys(baseWhere).length ? { AND: [baseWhere, diariaWhere] } : diariaWhere;
}

function getDadosDiariaIA(value: Prisma.JsonValue | null): AIDiariaResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const dados = (value as Record<string, unknown>).dadosDiariaIA;
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return null;

  const row = dados as Record<string, unknown>;
  if (typeof row.isDiariaValida !== "boolean") return null;

  return {
    isDiariaValida: row.isDiariaValida,
    beneficiario: String(row.beneficiario ?? ""),
    destino: String(row.destino ?? "Não identificado"),
    tipoDespesa: String(row.tipoDespesa ?? "Outras despesas de viagem") as AIDiariaResponse["tipoDespesa"]
  };
}

async function getDiariasDataset(filters: EmpenhoFilters = {}): Promise<DiariaItem[]> {
  if (!process.env.DATABASE_URL) {
    const { SAMPLE_EMPENHOS } = await import("./sampleData");
    const { items } = analyzeDiarias(SAMPLE_EMPENHOS);
    return applyDiariasFilters(items, filters);
  }

  const rows = await prisma.empenho.findMany({
    where: buildDiariasWhere(filters),
    orderBy: [{ dataEmpenho: "desc" }, { numeroEmpenho: "desc" }],
    include: {
      documentosPagamento: true,
      alertasFiscalizacao: true
    }
  });

  const items: DiariaItem[] = [];

  for (const row of rows) {
    const dadosIA = getDadosDiariaIA(row.resumoFiscalizacao);
    if (dadosIA?.isDiariaValida === false) continue;

    const plain = toPlainEmpenho(row as unknown as Record<string, unknown>);
    const item = buildDiariaItem(plain);

    items.push({
      ...item,
      beneficiario: dadosIA?.beneficiario || item.beneficiario,
      destino: dadosIA?.destino || item.destino,
      tipoDespesa: dadosIA?.tipoDespesa || item.tipoDespesa
    });
  }

  return applyDiariasFilters(items, filters);
}

function sortDiarias(items: DiariaItem[], filters: EmpenhoFilters): DiariaItem[] {
  const sortBy = filters.sortBy ?? "dataEmpenho";
  const direction = filters.sortDir === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const a = sortBy === "credor" ? left.credor : sortBy === "riskScore" ? left.alertas.length : sortBy === "valorEmpenhado" ? left.valor : left.dataEmpenho?.getTime() ?? 0;
    const b = sortBy === "credor" ? right.credor : sortBy === "riskScore" ? right.alertas.length : sortBy === "valorEmpenhado" ? right.valor : right.dataEmpenho?.getTime() ?? 0;
    return a > b ? direction : a < b ? -direction : 0;
  });
}

export async function getDiarias(filters: EmpenhoFilters = {}): Promise<{ items: DiariaItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 25));
  const filtered = sortDiarias(await getDiariasDataset(filters), filters);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize
  };
}

export async function getDiariasSummary(filters: EmpenhoFilters = {}): Promise<DiariasSummary> {
  return summarizeDiarias(await getDiariasDataset(filters));
}

export async function getDiariasPageData(filters: EmpenhoFilters = {}): Promise<{
  summary: DiariasSummary;
  table: { items: DiariaItem[]; total: number; page: number; pageSize: number };
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 25));
  const filtered = sortDiarias(await getDiariasDataset(filters), filters);

  return {
    summary: summarizeDiarias(filtered),
    table: {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize
    }
  };
}
