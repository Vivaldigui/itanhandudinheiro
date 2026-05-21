import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import { maskSensitiveData } from "./maskSensitiveData";
import { normalizeEmpenho } from "./normalizer";
import { calculateRisksForMonth } from "./riskEngine";
import type { DocumentoPagamentoInput, NormalizedEmpenho, RawEmpenho } from "./types";

const labelOrder = [
  "Empenho",
  "Tipo",
  "Data",
  "Ficha",
  "Credor",
  "Fonte",
  "Código de Aplicação",
  "Codigo de Aplicacao",
  "Valor Empenhado",
  "Valor Anulado",
  "Valor Liquidado",
  "Valor Liquidado Anulado",
  "Valor Pago",
  "Valor Pago Anulado",
  "Valor a Liquidar",
  "Valor Liquidado a Pagar",
  "Valor a Pagar",
  "Histórico",
  "Historico",
  "Processo Compra",
  "Modalidade",
  "Processo Licitatório",
  "Processo Licitatorio",
  "Número Modalidade",
  "Numero Modalidade",
  "Pedido Compra",
  "Contrato",
  "Aditamento",
  "Gestor",
  "Documento"
];

const detailStopLabels = [
  "liq.",
  "contexto",
  "sub-empenhos",
  "gestor",
  "tipo",
  "numero",
  "valor",
  "data de emissao",
  "documentos de pagamentos",
  "data de vencimento",
  "total sub-empenhos",
  "total documentos de pagamentos",
  "emissao:",
  "pagina:",
  "empenho",
  "data",
  "ficha",
  "credor",
  "fonte",
  "cod. apl",
  "tipo emp"
];

function toLines(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function isCurrencyLine(value?: string): boolean {
  return Boolean(value && /^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}$/.test(value.trim()));
}

function isDateLine(value?: string): boolean {
  return Boolean(value && /^\d{2}\/\d{2}\/\d{4}$/.test(value.trim()));
}

function isIntegerLine(value?: string): boolean {
  return Boolean(value && /^\d{1,10}$/.test(value.trim()));
}

function isSourceLine(value?: string): boolean {
  return Boolean(value && /^\d\.\d{3}\.\d{3}$/.test(value.trim()));
}

function isApplicationCodeLine(value?: string): boolean {
  return Boolean(value && /^[0-9A-Z./-]{3,}$/.test(value.trim()));
}

function isTypeLine(value?: string): boolean {
  return Boolean(value && /^[A-Z]$/.test(value.trim()));
}

function isLikelyCredor(value?: string): boolean {
  if (!value) return false;
  const token = normalizeToken(value);
  if (detailStopLabels.includes(token)) return false;
  if (isCurrencyLine(value) || isDateLine(value) || isIntegerLine(value) || isSourceLine(value)) return false;
  return /[a-z]/i.test(value) && value.length >= 4;
}

function isRecordStart(lines: string[], index: number): boolean {
  return (
    isCurrencyLine(lines[index]) &&
    isLikelyCredor(lines[index + 1]) &&
    isCurrencyLine(lines[index + 2]) &&
    isIntegerLine(lines[index + 3]) &&
    isCurrencyLine(lines[index + 4]) &&
    isSourceLine(lines[index + 5]) &&
    isDateLine(lines[index + 6]) &&
    isCurrencyLine(lines[index + 7]) &&
    isApplicationCodeLine(lines[index + 8]) &&
    isCurrencyLine(lines[index + 9]) &&
    isCurrencyLine(lines[index + 10]) &&
    isCurrencyLine(lines[index + 11]) &&
    isCurrencyLine(lines[index + 12]) &&
    isCurrencyLine(lines[index + 13]) &&
    isTypeLine(lines[index + 14]) &&
    isIntegerLine(lines[index + 15])
  );
}

function findTableRecordStarts(lines: string[]): number[] {
  const starts: number[] = [];
  for (let index = 0; index < lines.length - 16; index += 1) {
    if (isRecordStart(lines, index)) starts.push(index);
  }
  return starts;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBetweenLabels(block: string, labels: string[]): string | null {
  for (const label of labels) {
    const nextLabels = labelOrder.filter((item) => item !== label).map(escapeRegex).join("|");
    const regex = new RegExp(`${escapeRegex(label)}\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\n?\\s*(?:${nextLabels})\\s*[:\\-]|$)`, "i");
    const match = block.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractFirst(block: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function splitEmpenhoBlocks(text: string): string[] {
  const lines = toLines(text);
  const tableStarts = findTableRecordStarts(lines);
  if (tableStarts.length > 0) {
    return tableStarts.map((start, index) => {
      const end = tableStarts[index + 1] ?? lines.length;
      return lines.slice(start, end).join("\n").trim();
    });
  }

  const normalized = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  const matches = [...normalized.matchAll(/(?:^|\n)\s*(?:Empenho|N[ºo]\.?\s*Empenho)\s*[:\-]?\s*(\d{1,8}(?:[./-]\d{1,4})?)/gim)];
  if (matches.length <= 1) return normalized.trim() ? [normalized] : [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? normalized.length;
    return normalized.slice(start, end).trim();
  });
}

function parseBrazilianCurrencyValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBrazilianDateValue(value?: string | null): Date | null {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
}

function isDocTypeLine(value: string): boolean {
  return /^(nota fiscal|documento|nf-e|nfe|recibo|fatura)/i.test(normalizeToken(value));
}

function isDocHeaderLine(value: string): boolean {
  const token = normalizeToken(value);
  return detailStopLabels.includes(token) || token === "descricao" || token === "data de";
}

export function extractDocumentosPagamento(block: string): DocumentoPagamentoInput[] {
  const docs: DocumentoPagamentoInput[] = [];
  const lines = toLines(block);
  const sectionStart = lines.findIndex((line) => /documentos de pagamentos/i.test(normalizeToken(line)));
  if (sectionStart >= 0) {
    const totalIndex = lines.findIndex((line, index) => index > sectionStart && /total documentos de pagamentos/i.test(normalizeToken(line)));
    const section = lines.slice(sectionStart + 1, totalIndex >= 0 ? totalIndex : lines.length);

    for (let index = 0; index < section.length; index += 1) {
      if (!isDocTypeLine(section[index])) continue;
      const tipo = section[index];
      let cursor = index + 1;
      let dataEmissao: Date | null = null;
      let dataVencimento: Date | null = null;
      let valor = 0;
      let numero: string | null = null;
      const descricao: string[] = [];

      while (cursor < section.length && !isDocTypeLine(section[cursor])) {
        const line = section[cursor];
        if (isDocHeaderLine(line)) {
          cursor += 1;
          continue;
        }
        if (isDateLine(line)) {
          if (!dataEmissao) dataEmissao = parseBrazilianDateValue(line);
          else if (!dataVencimento) dataVencimento = parseBrazilianDateValue(line);
          cursor += 1;
          continue;
        }
        if (isCurrencyLine(line)) {
          if (!valor) valor = parseBrazilianCurrencyValue(line);
          cursor += 1;
          continue;
        }
        if (!numero && /^[A-Z0-9./-]+$/i.test(line)) {
          numero = line;
          cursor += 1;
          continue;
        }
        descricao.push(line);
        cursor += 1;
      }

      docs.push({
        tipo,
        numero,
        descricao: descricao.join(" ") || null,
        dataEmissao,
        dataVencimento,
        valor
      });
      index = cursor - 1;
    }
  }

  if (docs.length > 0) return docs;

  for (const line of lines) {
    if (!/(documento|pagamento|nota fiscal|nf-e|nfe)/i.test(line)) continue;
    const valor = extractFirst(line, [/(\d{1,3}(?:\.\d{3})*,\d{2})/]);
    const numero = extractFirst(line, [
      /(?:NF(?:-e)?|Nota Fiscal|NFE)\s*[:\-]?\s*([A-Z0-9./-]+)/i,
      /Documento(?: de Pagamento)?\s*[:\-]?\s*(?:NF(?:-e)?\s*)?([A-Z0-9./-]+)/i
    ]);
    const data = extractFirst(line, [/(\d{2}\/\d{2}\/\d{4})/]);
    docs.push({
      tipo: /nota fiscal|nf-e|nfe/i.test(line) ? "Nota fiscal" : "Documento de pagamento",
      numero,
      descricao: line,
      dataEmissao: parseBrazilianDateValue(data),
      dataVencimento: null,
      valor: parseBrazilianCurrencyValue(valor)
    });
  }
  return docs;
}

function readAfterLabel(lines: string[], normalizedLabel: string): string | null {
  const index = lines.findIndex((line) => normalizeToken(line).startsWith(normalizedLabel));
  if (index < 0) return null;
  const inlineValue = lines[index].replace(/^[^:]+:\s*/i, "").trim();
  if (inlineValue && inlineValue !== lines[index]) return inlineValue;

  const collected: string[] = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const token = normalizeToken(lines[cursor]);
    if (detailStopLabels.includes(token) || token.startsWith("processo compra")) break;
    collected.push(lines[cursor]);
  }
  return collected.join(" ").trim() || null;
}

function parseProcessoCompra(lines: string[]) {
  const line = readAfterLabel(lines, "processo compra");
  if (!line) {
    return {
      processoCompra: null,
      modalidadeLicitacao: null,
      processoLicitatorio: null,
      numeroModalidade: null,
      pedidoCompra: null
    };
  }

  const processoCompra = line.match(/^([^-]+)/)?.[1]?.trim() ?? line;
  const modalidadeLicitacao = line.match(/-\s*(.*?)(?:\s*-\s*Processo Licit\.?:|$)/i)?.[1]?.trim() ?? null;
  const processoLicitatorio = line.match(/Processo Licit\.?:\s*([A-Z0-9./-]+)/i)?.[1]?.trim() ?? null;
  const numeroModalidade = line.match(/Num\.?\s*Mod\.?:\s*([A-Z0-9./-]+)/i)?.[1]?.trim() ?? null;
  const pedidoCompra = line.match(/Pedido de Compra:\s*([A-Z0-9./-]+)/i)?.[1]?.trim() ?? null;

  return {
    processoCompra,
    modalidadeLicitacao,
    processoLicitatorio,
    numeroModalidade,
    pedidoCompra
  };
}

function parseTableBlock(block: string, ano: number, mes: number): RawEmpenho | null {
  const lines = toLines(block);
  if (!isRecordStart(lines, 0)) return null;
  const processo = parseProcessoCompra(lines);

  return {
    ano,
    mes,
    numeroEmpenho: lines[3],
    tipoEmpenho: lines[14],
    dataEmpenho: lines[6],
    ficha: lines[15],
    credor: lines[1],
    fonte: lines[5],
    codigoAplicacao: lines[8],
    valorEmpenhado: lines[0],
    valorAnulado: lines[7],
    valorLiquidado: lines[2],
    valorLiquidadoAnulado: lines[9],
    valorPago: lines[10],
    valorPagoAnulado: lines[11],
    valorALiquidar: lines[12],
    valorLiquidadoAPagar: lines[13],
    valorAPagar: "0,00",
    historico: readAfterLabel(lines, "historico"),
    processoCompra: processo.processoCompra,
    modalidadeLicitacao: processo.modalidadeLicitacao,
    processoLicitatorio: processo.processoLicitatorio,
    numeroModalidade: processo.numeroModalidade,
    pedidoCompra: processo.pedidoCompra,
    contrato: extractBetweenLabels(block, ["Contrato"]),
    aditamento: extractBetweenLabels(block, ["Aditamento"]),
    gestor: extractBetweenLabels(block, ["Gestor"]),
    documentosPagamento: extractDocumentosPagamento(block)
  };
}

export function parseEmpenhosFromText(text: string, ano: number, mes: number): NormalizedEmpenho[] {
  const blocks = splitEmpenhoBlocks(text);
  const rawEmpenhos: RawEmpenho[] = blocks
    .map((block) => {
      const tableRaw = parseTableBlock(block, ano, mes);
      if (tableRaw) return tableRaw;

      const numeroEmpenho = extractFirst(block, [
        /(?:Empenho|N[ºo]\.?\s*Empenho)\s*[:\-]?\s*([0-9./-]+)/i,
        /^([0-9]{1,8}\/[0-9]{4})\b/m
      ]);

      const raw: RawEmpenho = {
        ano,
        mes,
        numeroEmpenho,
        tipoEmpenho: extractBetweenLabels(block, ["Tipo", "Tipo Empenho"]),
        dataEmpenho: extractFirst(block, [/(?:Data(?: do)? Empenho|Data)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i]),
        ficha: extractBetweenLabels(block, ["Ficha"]),
        credor: extractBetweenLabels(block, ["Credor", "Fornecedor"]),
        fonte: extractBetweenLabels(block, ["Fonte", "Fonte de Recurso"]),
        codigoAplicacao: extractBetweenLabels(block, ["Código de Aplicação", "Codigo de Aplicacao", "Cód. Aplicação"]),
        valorEmpenhado: extractBetweenLabels(block, ["Valor Empenhado", "Empenhado"]),
        valorAnulado: extractBetweenLabels(block, ["Valor Anulado", "Anulado"]),
        valorLiquidado: extractBetweenLabels(block, ["Valor Liquidado", "Liquidado"]),
        valorLiquidadoAnulado: extractBetweenLabels(block, ["Valor Liquidado Anulado", "Liquidado Anulado"]),
        valorPago: extractBetweenLabels(block, ["Valor Pago", "Pago"]),
        valorPagoAnulado: extractBetweenLabels(block, ["Valor Pago Anulado", "Pago Anulado"]),
        valorALiquidar: extractBetweenLabels(block, ["Valor a Liquidar", "A Liquidar"]),
        valorLiquidadoAPagar: extractBetweenLabels(block, ["Valor Liquidado a Pagar", "Liquidado a Pagar"]),
        valorAPagar: extractBetweenLabels(block, ["Valor a Pagar", "A Pagar"]),
        historico: extractBetweenLabels(block, ["Histórico", "Historico", "Histórico Empenho"]),
        processoCompra: extractBetweenLabels(block, ["Processo Compra", "Processo de Compra"]),
        modalidadeLicitacao: extractBetweenLabels(block, ["Modalidade", "Modalidade Licitação", "Modalidade Licitacao"]),
        processoLicitatorio: extractBetweenLabels(block, ["Processo Licitatório", "Processo Licitatorio"]),
        numeroModalidade: extractBetweenLabels(block, ["Número Modalidade", "Numero Modalidade"]),
        pedidoCompra: extractBetweenLabels(block, ["Pedido Compra", "Pedido de Compra"]),
        contrato: extractBetweenLabels(block, ["Contrato"]),
        aditamento: extractBetweenLabels(block, ["Aditamento"]),
        gestor: extractBetweenLabels(block, ["Gestor"]),
        documentosPagamento: extractDocumentosPagamento(block)
      };

      return raw;
    })
    .filter((raw) => raw.numeroEmpenho || raw.credor || raw.valorEmpenhado);

  const normalized = rawEmpenhos.map(normalizeEmpenho);
  return calculateRisksForMonth(
    normalized.map((empenho) => ({
      ...empenho,
      historicoMascarado: maskSensitiveData(empenho.historico)
    }))
  );
}

export async function parsePdfFile(filePath: string, ano: number, mes: number): Promise<NormalizedEmpenho[]> {
  const data = await pdfParse(await import("node:fs").then((fs) => fs.readFileSync(filePath)));
  const empenhos = parseEmpenhosFromText(data.text, ano, mes);
  const outputDir = path.join(process.cwd(), "data", "processed-json", String(ano), String(mes).padStart(2, "0"));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, `analitico-empenhos-${ano}-${String(mes).padStart(2, "0")}.json`), JSON.stringify(empenhos, null, 2), "utf8");
  return empenhos;
}
