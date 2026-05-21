import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { monthLabel, toNumber } from "./formatters";
import { SAMPLE_EMPENHOS } from "./sampleData";
import { generateFiscalizacaoBrief } from "@/modules/empenhos/aiFiscalizacao";
import { maskSensitiveData } from "@/modules/empenhos/maskSensitiveData";
import type { DashboardSummary, EmpenhoFilters, FiscalizacaoAlert, PlainEmpenho, RiskLevel } from "@/modules/empenhos/types";

const riskLevels: RiskLevel[] = ["Baixo", "Médio", "Alto", "Crítico"];

function cleanFilter(value?: string): string | undefined {
  if (!value || value === "todos") return undefined;
  return value;
}

export function buildWhere(filters: EmpenhoFilters): Prisma.EmpenhoWhereInput {
  const where: Prisma.EmpenhoWhereInput = {};
  if (filters.ano) where.ano = filters.ano;
  if (filters.mes) where.mes = filters.mes;
  if (cleanFilter(filters.categoria)) where.categoria = filters.categoria;
  if (cleanFilter(filters.secretariaEstimada)) where.secretariaEstimada = filters.secretariaEstimada;
  if (cleanFilter(filters.credor)) where.credor = { contains: filters.credor, mode: "insensitive" };
  if (cleanFilter(filters.processoCompra)) where.processoCompra = { contains: filters.processoCompra, mode: "insensitive" };
  if (cleanFilter(filters.modalidade)) where.modalidadeLicitacao = { contains: filters.modalidade, mode: "insensitive" };
  if (cleanFilter(filters.status)) where.status = filters.status;
  if (cleanFilter(filters.riskLevel)) where.riskLevel = filters.riskLevel;
  if (filters.apenasAlertas) where.riskScore = { gt: 0 };
  if (filters.periodoInicio || filters.periodoFim) {
    where.dataEmpenho = {
      ...(filters.periodoInicio ? { gte: new Date(`${filters.periodoInicio}T00:00:00`) } : {}),
      ...(filters.periodoFim ? { lte: new Date(`${filters.periodoFim}T23:59:59`) } : {})
    };
  }
  if (filters.busca) {
    where.OR = [
      { historico: { contains: filters.busca, mode: "insensitive" } },
      { credor: { contains: filters.busca, mode: "insensitive" } },
      { numeroEmpenho: { contains: filters.busca, mode: "insensitive" } },
      { processoCompra: { contains: filters.busca, mode: "insensitive" } }
    ];
  }
  return where;
}

function toFiscalizacaoAlert(value: unknown): FiscalizacaoAlert[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as FiscalizacaoAlert[];
  return [];
}

export function toPlainEmpenho(item: Record<string, unknown>): PlainEmpenho {
  const alertasJson = toFiscalizacaoAlert(item.alertas);
  const relationAlerts = Array.isArray(item.alertasFiscalizacao)
    ? (item.alertasFiscalizacao as Array<Record<string, unknown>>).map((alerta) => ({
        tipo: String(alerta.tipo ?? ""),
        nivel: String(alerta.nivel ?? "Baixo") as RiskLevel,
        descricao: String(alerta.descricao ?? ""),
        sugestaoFiscalizacao: String(alerta.sugestaoFiscalizacao ?? "")
      }))
    : [];
  const documentosPagamento = Array.isArray(item.documentosPagamento)
    ? (item.documentosPagamento as Array<Record<string, unknown>>).map((documento) => ({
        tipo: documento.tipo ? String(documento.tipo) : null,
        numero: documento.numero ? String(documento.numero) : null,
        dataEmissao: documento.dataEmissao ? new Date(String(documento.dataEmissao)) : null,
        dataVencimento: documento.dataVencimento ? new Date(String(documento.dataVencimento)) : null,
        descricao: documento.descricao ? String(documento.descricao) : null,
        valor: toNumber(documento.valor)
      }))
    : [];

  const plain = {
    id: String(item.id),
    numeroEmpenho: String(item.numeroEmpenho ?? ""),
    tipoEmpenho: item.tipoEmpenho ? String(item.tipoEmpenho) : null,
    dataEmpenho: item.dataEmpenho ? new Date(String(item.dataEmpenho)) : null,
    dataEmpenhoIso: item.dataEmpenho ? new Date(String(item.dataEmpenho)).toISOString() : null,
    ano: Number(item.ano),
    mes: Number(item.mes),
    ficha: item.ficha ? String(item.ficha) : null,
    credor: String(item.credor ?? ""),
    fonte: item.fonte ? String(item.fonte) : null,
    codigoAplicacao: item.codigoAplicacao ? String(item.codigoAplicacao) : null,
    valorEmpenhado: toNumber(item.valorEmpenhado),
    valorAnulado: toNumber(item.valorAnulado),
    valorLiquidado: toNumber(item.valorLiquidado),
    valorLiquidadoAnulado: toNumber(item.valorLiquidadoAnulado),
    valorPago: toNumber(item.valorPago),
    valorPagoAnulado: toNumber(item.valorPagoAnulado),
    valorALiquidar: toNumber(item.valorALiquidar),
    valorLiquidadoAPagar: toNumber(item.valorLiquidadoAPagar),
    valorAPagar: toNumber(item.valorAPagar),
    historico: item.historico ? String(item.historico) : null,
    historicoMascarado: item.historicoMascarado ? String(item.historicoMascarado) : maskSensitiveData(String(item.historico ?? "")),
    processoCompra: item.processoCompra ? String(item.processoCompra) : null,
    modalidadeLicitacao: item.modalidadeLicitacao ? String(item.modalidadeLicitacao) : null,
    processoLicitatorio: item.processoLicitatorio ? String(item.processoLicitatorio) : null,
    numeroModalidade: item.numeroModalidade ? String(item.numeroModalidade) : null,
    pedidoCompra: item.pedidoCompra ? String(item.pedidoCompra) : null,
    contrato: item.contrato ? String(item.contrato) : null,
    aditamento: item.aditamento ? String(item.aditamento) : null,
    gestor: item.gestor ? String(item.gestor) : null,
    categoria: String(item.categoria ?? "Outros"),
    secretariaEstimada: item.secretariaEstimada ? String(item.secretariaEstimada) : null,
    status: String(item.status ?? "A liquidar") as PlainEmpenho["status"],
    riskScore: Number(item.riskScore ?? 0),
    riskLevel: String(item.riskLevel ?? "Baixo") as RiskLevel,
    alertas: alertasJson.length ? alertasJson : relationAlerts,
    documentosPagamento,
    documentoOrigemId: item.documentoOrigemId ? String(item.documentoOrigemId) : undefined
  } satisfies PlainEmpenho;

  return {
    ...plain,
    resumoFiscalizacao: plain.riskScore >= 30 ? generateFiscalizacaoBrief(plain) : undefined
  };
}

function applyFallbackFilters(items: PlainEmpenho[], filters: EmpenhoFilters): PlainEmpenho[] {
  const busca = filters.busca?.toLocaleLowerCase("pt-BR");
  return items
    .filter((item) => !filters.ano || item.ano === filters.ano)
    .filter((item) => !filters.mes || item.mes === filters.mes)
    .filter((item) => !cleanFilter(filters.categoria) || item.categoria === filters.categoria)
    .filter((item) => !cleanFilter(filters.status) || item.status === filters.status)
    .filter((item) => !cleanFilter(filters.riskLevel) || item.riskLevel === filters.riskLevel)
    .filter((item) => !filters.apenasAlertas || item.alertas.length > 0)
    .filter((item) => !filters.credor || item.credor.toLocaleLowerCase("pt-BR").includes(filters.credor.toLocaleLowerCase("pt-BR")))
    .filter((item) => !filters.processoCompra || (item.processoCompra ?? "").toLocaleLowerCase("pt-BR").includes(filters.processoCompra.toLocaleLowerCase("pt-BR")))
    .filter((item) => !busca || `${item.historico} ${item.credor} ${item.numeroEmpenho} ${item.processoCompra}`.toLocaleLowerCase("pt-BR").includes(busca));
}

function sortItems(items: PlainEmpenho[], filters: EmpenhoFilters): PlainEmpenho[] {
  const sortBy = filters.sortBy ?? "dataEmpenho";
  const direction = filters.sortDir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = sortBy === "credor" ? a.credor : sortBy === "dataEmpenho" ? a.dataEmpenho?.getTime() ?? 0 : a[sortBy];
    const right = sortBy === "credor" ? b.credor : sortBy === "dataEmpenho" ? b.dataEmpenho?.getTime() ?? 0 : b[sortBy];
    return left > right ? direction : left < right ? -direction : 0;
  });
}

export async function getEmpenhos(filters: EmpenhoFilters = {}): Promise<{ items: PlainEmpenho[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, filters.pageSize ?? 25));

  if (!process.env.DATABASE_URL) {
    const filtered = sortItems(applyFallbackFilters(SAMPLE_EMPENHOS, filters), filters);
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize
    };
  }

  const orderBy: Prisma.EmpenhoOrderByWithRelationInput =
    filters.sortBy === "credor"
      ? { credor: filters.sortDir ?? "asc" }
      : filters.sortBy === "riskScore"
        ? { riskScore: filters.sortDir ?? "desc" }
        : filters.sortBy === "valorEmpenhado"
          ? { valorEmpenhado: filters.sortDir ?? "desc" }
          : { dataEmpenho: filters.sortDir ?? "desc" };

  try {
    const where = buildWhere(filters);
    const [total, rows] = await prisma.$transaction([
      prisma.empenho.count({ where }),
      prisma.empenho.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          documentosPagamento: true,
          alertasFiscalizacao: true
        }
      })
    ]);
    return { items: rows.map((row) => toPlainEmpenho(row as unknown as Record<string, unknown>)), total, page, pageSize };
  } catch {
    const filtered = sortItems(applyFallbackFilters(SAMPLE_EMPENHOS, filters), filters);
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize
    };
  }
}

function addToMap(map: Map<string, { value: number; count: number }>, key: string, value: number) {
  const current = map.get(key) ?? { value: 0, count: 0 };
  map.set(key, { value: current.value + value, count: current.count + 1 });
}

export async function getDashboardSummary(filters: EmpenhoFilters = {}): Promise<DashboardSummary> {
  const { items } = await getEmpenhos({ ...filters, page: 1, pageSize: 500 });
  const credores = new Set(items.map((item) => item.credor));
  const processos = new Set(items.map((item) => item.processoCompra).filter(Boolean));
  const monthly = new Map<string, DashboardSummary["seriesMensal"][number]>();
  const category = new Map<string, { value: number; count: number }>();
  const credor = new Map<string, { value: number; count: number }>();
  const processo = new Map<string, { value: number; count: number }>();
  const risco = new Map<RiskLevel, number>(riskLevels.map((level) => [level, 0]));

  for (const item of items) {
    const key = `${item.ano}-${String(item.mes).padStart(2, "0")}`;
    const row = monthly.get(key) ?? {
      mes: monthLabel(item.ano, item.mes),
      valorEmpenhado: 0,
      valorLiquidado: 0,
      valorPago: 0,
      valorALiquidar: 0,
      valorAPagar: 0
    };
    row.valorEmpenhado += item.valorEmpenhado;
    row.valorLiquidado += item.valorLiquidado;
    row.valorPago += item.valorPago;
    row.valorALiquidar += item.valorALiquidar;
    row.valorAPagar += item.valorAPagar + item.valorLiquidadoAPagar;
    monthly.set(key, row);
    addToMap(category, item.categoria, item.valorEmpenhado);
    addToMap(credor, item.credor, item.valorEmpenhado);
    addToMap(processo, item.processoCompra ?? "Sem processo informado", item.valorEmpenhado);
    risco.set(item.riskLevel, (risco.get(item.riskLevel) ?? 0) + 1);
  }

  const top = (map: Map<string, { value: number; count: number }>, limit: number) =>
    [...map.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  return {
    totals: {
      valorEmpenhado: items.reduce((sum, item) => sum + item.valorEmpenhado, 0),
      valorLiquidado: items.reduce((sum, item) => sum + item.valorLiquidado, 0),
      valorPago: items.reduce((sum, item) => sum + item.valorPago, 0),
      valorALiquidar: items.reduce((sum, item) => sum + item.valorALiquidar, 0),
      valorAPagar: items.reduce((sum, item) => sum + item.valorAPagar + item.valorLiquidadoAPagar, 0),
      quantidadeEmpenhos: items.length,
      quantidadeCredores: credores.size,
      quantidadeProcessosCompra: processos.size,
      empenhosComAlerta: items.filter((item) => item.alertas.length > 0).length,
      maiorEmpenho: [...items].sort((a, b) => b.valorEmpenhado - a.valorEmpenhado)[0] ?? null
    },
    seriesMensal: [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value),
    porCategoria: top(category, 12).map(({ name, value }) => ({ name, value })),
    topCredores: top(credor, 10),
    topProcessos: top(processo, 10),
    porRisco: riskLevels.map((name) => ({ name, value: risco.get(name) ?? 0 }))
  };
}

export async function getEmpenhoById(id: string): Promise<PlainEmpenho | null> {
  try {
    const item = await prisma.empenho.findUnique({
      where: { id },
      include: { documentosPagamento: true, alertasFiscalizacao: true }
    });
    return item ? toPlainEmpenho(item as unknown as Record<string, unknown>) : null;
  } catch {
    return SAMPLE_EMPENHOS.find((item) => item.id === id) ?? null;
  }
}

export async function getAlertas() {
  const { items } = await getEmpenhos({ apenasAlertas: true, pageSize: 100 });
  return items.flatMap((item) =>
    item.alertas.map((alerta) => ({
      ...alerta,
      empenhoId: item.id,
      numeroEmpenho: item.numeroEmpenho,
      credor: item.credor,
      valorEmpenhado: item.valorEmpenhado
    }))
  );
}

export async function getSyncStatus() {
  try {
    const [lastLog, docs] = await Promise.all([
      prisma.syncLog.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.documentoOrigem.findMany({
        orderBy: [{ ano: "desc" }, { mes: "desc" }],
        take: 12,
        select: { ano: true, mes: true, hashSha256: true, statusProcessamento: true, dataDownload: true }
      })
    ]);
    return { lastLog, documentosRecentes: docs };
  } catch {
    return {
      lastLog: null,
      documentosRecentes: [],
      mensagem: "Banco ainda não configurado. Rode docker compose up -d e npx prisma migrate dev."
    };
  }
}
