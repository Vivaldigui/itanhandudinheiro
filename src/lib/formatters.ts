import type { EmpenhoFilters } from "@/modules/empenhos/types";

export function formatCurrency(value?: number | string | null): string {
  const amount = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

export function formatDate(value?: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date);
}

export function monthLabel(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

export function parseBoolean(value?: string | null): boolean {
  return value === "true" || value === "1" || value === "on";
}

export function parseFiltersFromSearchParams(searchParams: URLSearchParams): EmpenhoFilters {
  const getNumber = (key: string) => {
    const value = searchParams.get(key);
    return value ? Number(value) : undefined;
  };

  return {
    ano: getNumber("ano"),
    mes: getNumber("mes"),
    periodoInicio: searchParams.get("periodoInicio") ?? undefined,
    periodoFim: searchParams.get("periodoFim") ?? undefined,
    categoria: searchParams.get("categoria") ?? undefined,
    secretariaEstimada: searchParams.get("secretariaEstimada") ?? undefined,
    credor: searchParams.get("credor") ?? undefined,
    processoCompra: searchParams.get("processoCompra") ?? undefined,
    modalidade: searchParams.get("modalidade") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    riskLevel: searchParams.get("riskLevel") ?? undefined,
    apenasAlertas: parseBoolean(searchParams.get("apenasAlertas")),
    busca: searchParams.get("busca") ?? undefined,
    sortBy: (searchParams.get("sortBy") as EmpenhoFilters["sortBy"]) ?? undefined,
    sortDir: (searchParams.get("sortDir") as EmpenhoFilters["sortDir"]) ?? undefined,
    page: getNumber("page"),
    pageSize: getNumber("pageSize")
  };
}

