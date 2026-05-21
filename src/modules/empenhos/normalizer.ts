import { classifyCategory, estimateSecretaria } from "./classifier";
import type { EmpenhoStatus, NormalizedEmpenho, RawEmpenho } from "./types";

export function normalizeWhitespace(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeCredor(value?: string | null): string {
  return normalizeWhitespace(value).toLocaleUpperCase("pt-BR");
}

export function parseBrazilianCurrency(value?: string | number | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = normalizeWhitespace(value);
  if (!raw) return 0;

  const negative = /\(|^-/.test(raw);
  const sanitized = raw
    .replace(/[R$\s]/g, "")
    .replace(/[()]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(sanitized);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -Math.abs(parsed) : parsed;
}

export function parseBrazilianDate(value?: string | Date | null): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = normalizeWhitespace(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function cleanHistorico(value?: string | null): string {
  return normalizeWhitespace(value)
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,.;:])(?=\S)/g, "$1 ");
}

export function calculateEmpenhoStatus(values: {
  valorEmpenhado: number;
  valorAnulado: number;
  valorPago: number;
  valorALiquidar: number;
  valorLiquidadoAPagar: number;
  valorAPagar: number;
}): EmpenhoStatus {
  const paid = values.valorPago > 0;
  const nothingToPay = values.valorAPagar <= 0.009 && values.valorLiquidadoAPagar <= 0.009;

  if (values.valorAnulado > 0 && values.valorEmpenhado <= 0.009) return "Anulado";
  if (paid && nothingToPay && values.valorALiquidar <= 0.009) return "Pago";
  if (paid && (values.valorAPagar > 0.009 || values.valorALiquidar > 0.009 || values.valorLiquidadoAPagar > 0.009)) {
    return "Parcial";
  }
  if (values.valorLiquidadoAPagar > 0.009 || values.valorAPagar > 0.009) return "A pagar";
  if (values.valorALiquidar > 0.009) return "A liquidar";
  return paid ? "Pago" : "A liquidar";
}

export function normalizeEmpenho(raw: RawEmpenho): NormalizedEmpenho {
  const baseText = [
    raw.historico,
    raw.ficha,
    raw.fonte,
    raw.codigoAplicacao,
    raw.processoCompra,
    raw.credor
  ].join(" ");

  const normalized = {
    numeroEmpenho: normalizeWhitespace(raw.numeroEmpenho) || "SEM-NUMERO",
    tipoEmpenho: normalizeWhitespace(raw.tipoEmpenho) || null,
    dataEmpenho: parseBrazilianDate(raw.dataEmpenho),
    ano: raw.ano,
    mes: raw.mes,
    ficha: normalizeWhitespace(raw.ficha) || null,
    credor: normalizeCredor(raw.credor) || "CREDOR NAO IDENTIFICADO",
    fonte: normalizeWhitespace(raw.fonte) || null,
    codigoAplicacao: normalizeWhitespace(raw.codigoAplicacao) || null,
    valorEmpenhado: parseBrazilianCurrency(raw.valorEmpenhado),
    valorAnulado: parseBrazilianCurrency(raw.valorAnulado),
    valorLiquidado: parseBrazilianCurrency(raw.valorLiquidado),
    valorLiquidadoAnulado: parseBrazilianCurrency(raw.valorLiquidadoAnulado),
    valorPago: parseBrazilianCurrency(raw.valorPago),
    valorPagoAnulado: parseBrazilianCurrency(raw.valorPagoAnulado),
    valorALiquidar: parseBrazilianCurrency(raw.valorALiquidar),
    valorLiquidadoAPagar: parseBrazilianCurrency(raw.valorLiquidadoAPagar),
    valorAPagar: parseBrazilianCurrency(raw.valorAPagar),
    historico: cleanHistorico(raw.historico) || null,
    historicoMascarado: null,
    processoCompra: normalizeWhitespace(raw.processoCompra) || null,
    modalidadeLicitacao: normalizeWhitespace(raw.modalidadeLicitacao) || null,
    processoLicitatorio: normalizeWhitespace(raw.processoLicitatorio) || null,
    numeroModalidade: normalizeWhitespace(raw.numeroModalidade) || null,
    pedidoCompra: normalizeWhitespace(raw.pedidoCompra) || null,
    contrato: normalizeWhitespace(raw.contrato) || null,
    aditamento: normalizeWhitespace(raw.aditamento) || null,
    gestor: normalizeWhitespace(raw.gestor) || null,
    categoria: classifyCategory(baseText),
    secretariaEstimada: estimateSecretaria(baseText),
    status: "A liquidar" as EmpenhoStatus,
    riskScore: 0,
    riskLevel: "Baixo" as const,
    alertas: [],
    documentosPagamento: raw.documentosPagamento ?? []
  };

  // 🔥 CORREÇÃO AQUI: Garante que o ano e mês sejam extraídos da data real do empenho!
  if (normalized.dataEmpenho) {
    normalized.ano = normalized.dataEmpenho.getFullYear();
    normalized.mes = normalized.dataEmpenho.getMonth() + 1;
  }

  normalized.status = calculateEmpenhoStatus(normalized);
  return normalized;
}

export function hasSameSha256(existingHash?: string | null, nextHash?: string | null): boolean {
  return Boolean(existingHash && nextHash && existingHash === nextHash);
}

