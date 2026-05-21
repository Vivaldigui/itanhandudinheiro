import "@/lib/loadEnv";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeCredor, normalizeWhitespace } from "@/modules/empenhos/normalizer";
import type { PortalLicitacao, SyncLicitacoesYearResult } from "./types";

type PortalSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

const portalUrl = process.env.PORTAL_CIDADAO_URL ?? "";
const portalBaseUrl = portalUrl.split("#")[0];
const defaultLicitacoesHash =
  "78c3e513dd43cb27d8a3e2f376196ffc656d7ea577b2c6fba681e0e9421f1a99695b%C4%B720d78c61155e002908be1f1fe504fcac39b4befae7d4685220f471c1aefccc861939df456987bf012360e4e0ce8dc68e05d525c2ead87235b0170afa3a84c2382d76b30b411f03abb564d760f93c09ba360d218dc76d707fd1357e43520366707175066c69ed3cfe3d20d4a3841c40b77291c10f3c60a0c6134a4b55640d7df008e2e064a64267de07f7d76f7681e260bfe84da77fc8f7124be5a24360c2cb2f9016c10fd1302e4493fbd28d45bbbbc04fc33cb7146";
const portalLicitacoesUrl = process.env.PORTAL_CIDADAO_LICITACOES_URL ?? `${portalBaseUrl}#${defaultLicitacoesHash}`;
const defaultDelayMs = 1800;

function sleep(ms = defaultDelayMs) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logMessage(message: string) {
  const logDir = path.join(process.cwd(), "data", "logs");
  await mkdir(logDir, { recursive: true });
  await writeFile(path.join(logDir, "sync-licitacoes.log"), `[${new Date().toISOString()}] ${message}\n`, {
    flag: "a",
    encoding: "utf8"
  });
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clean(value?: string | null): string {
  return normalizeWhitespace(value).replace(/\s+Saiba mais\s*\.{0,3}$/i, "").trim();
}

function parseBrazilianDateTime(value?: string | null): Date | null {
  const raw = clean(value);
  if (!raw) return null;
  const match = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, hour = "12", minute = "0"] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAnoFromNumero(numeroProcesso: string, fallback: number): number {
  return Number(numeroProcesso.match(/\/(\d{4})/)?.[1] ?? fallback);
}

function parseAnoModalidade(numeroModalidade?: string | null): number | null {
  const year = clean(numeroModalidade).match(/\/(\d{4})/)?.[1];
  return year ? Number(year) : null;
}

function splitAberturaDevolucao(value?: string | null): { abertura: Date | null; devolucao: Date | null } {
  const matches = clean(value).match(/\d{1,2}[/-]\d{1,2}[/-]\d{4}(?:\s+\d{1,2}:\d{2})?/g) ?? [];
  return {
    abertura: parseBrazilianDateTime(matches[0]),
    devolucao: parseBrazilianDateTime(matches[1])
  };
}

function normalizeForSearch(value?: string | null): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR");
}

function modalidadeCodigo(modalidade?: string | null): string | null {
  const normalized = normalizeForSearch(modalidade);
  if (normalized.includes("PREGAO ELETRONICO")) return "PE";
  if (normalized.includes("PREGAO PRESENCIAL")) return "PP";
  if (normalized.includes("PREGAO")) return "PR";
  if (normalized.includes("CONCORRENCIA ELETRONICA")) return "CE";
  if (normalized.includes("CONCORRENCIA")) return "CN";
  if (normalized.includes("CREDENCIAMENTO")) return "CR";
  if (normalized.includes("DISPENSA")) return "DL";
  if (normalized.includes("INEXIGIBILIDADE")) return "IL";
  if (normalized.includes("CHAMADA")) return "CH";
  if (normalized.includes("CONVITE")) return "CC";
  if (normalized.includes("TOMADA")) return "TP";
  return null;
}

export async function abrirPortalLicitacoes(): Promise<PortalSession> {
  if (!portalBaseUrl) throw new Error("PORTAL_CIDADAO_URL não configurada.");
  const browser = await chromium.launch({
    headless: process.env.PORTAL_HEADLESS !== "false",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  await page.goto(portalLicitacoesUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(5000);
  const directReady = await hasLicitacoesForm(page);
  if (!directReady) {
    await page.goto(portalBaseUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await sleep(5000);
    await page.evaluate(`(() => {
      const normalize = (value) =>
        (value || "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .replace(/\\s+/g, " ")
          .trim()
          .toLocaleLowerCase("pt-BR");
      const link = [...document.querySelectorAll("a")].find((item) => normalize(item.textContent) === "processos licitatorios");
      if (link) link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    })()`);
  }

  await waitForLicitacoesForm(page);
  return { browser, context, page };
}

async function hasLicitacoesForm(page: Page) {
  return page.evaluate(`(() => {
    const normalize = (value) => (value || "").replace(/\\s+/g, " ").trim();
    return /Processos Licitatórios|Rol de Licitações/i.test(normalize(document.body.textContent)) &&
      [...document.querySelectorAll("input")].some((input) => input.value === String(new Date().getFullYear()));
  })()`).catch(() => false);
}

async function waitForLicitacoesForm(page: Page) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const ready = await hasLicitacoesForm(page);
    if (ready) return;
    await sleep(2500);
  }
  throw new Error("A tela de Processos Licitatórios não carregou dentro do tempo esperado.");
}

async function preencherBuscaAno(page: Page, ano: number) {
  const ok = await page.evaluate(`(() => {
    const targetYear = ${JSON.stringify(String(ano))};
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const inputs = [...document.querySelectorAll("input")].filter(visible);
    const setValue = (input, value) => {
      if (!input) return false;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };
    const yearOk = setValue(inputs[0], targetYear);
    const maxOk = setValue(inputs.at(-1), "1000");
    return yearOk && maxOk;
  })()`);
  if (!ok) throw new Error(`Não foi possível preencher a busca de licitações do ano ${ano}.`);
}

async function clicarBuscar(page: Page) {
  const clicked = await page.evaluate(`(() => {
    const button = [...document.querySelectorAll("button, input[type=submit]")]
      .find((element) => /buscar/i.test((element.textContent || element.value || "").trim()));
    if (!button) return false;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  })()`);
  if (!clicked) throw new Error("Botão Buscar não encontrado em licitações.");
}

async function extractLicitacoesRows(page: Page, ano: number): Promise<PortalLicitacao[]> {
  await page.waitForFunction(`(() => {
      const targetYear = ${JSON.stringify(String(ano))};
      const body = document.body.textContent ?? "";
      if (/processo\(s\) licitat/i.test(body)) return true;
      return [...document.querySelectorAll("tr")].some((row) => (row.textContent ?? "").includes("/" + targetYear));
    })()`, undefined, { timeout: 60000 }).catch(() => undefined);

  const rows = await page.evaluate(`(() => {
    const targetYear = ${JSON.stringify(String(ano))};
    const cleanText = (value) => (value || "").replace(/\\s+/g, " ").trim();
    return [...document.querySelectorAll("tr")]
      .map((row) => [...row.children].map((cell) => cleanText(cell.textContent)))
      .filter((cells) => cells.length >= 7 && new RegExp("^\\\\d+/" + targetYear + "$").test(cells[0] || ""))
      .map((cells) => ({
        numeroProcesso: cells[0],
        modalidade: cells[1],
        numeroModalidade: cells[2],
        aberturaDevolucao: cells[3],
        publicacao: cells[4],
        situacao: cells[5],
        objeto: cleanText((cells[6] ?? "").replace(/Saiba mais\\s*\\.{0,3}/i, ""))
      }));
  })()`) as Array<{
    numeroProcesso: string;
    modalidade: string;
    numeroModalidade: string;
    aberturaDevolucao: string;
    publicacao: string;
    situacao: string;
    objeto: string;
  }>;

  const unique = new Map<string, PortalLicitacao>();
  for (const row of rows) {
    const datas = splitAberturaDevolucao(row.aberturaDevolucao);
    unique.set(row.numeroProcesso, {
      numeroProcesso: row.numeroProcesso,
      anoProcesso: parseAnoFromNumero(row.numeroProcesso, ano),
      modalidade: clean(row.modalidade) || null,
      modalidadeCodigo: modalidadeCodigo(row.modalidade),
      numeroModalidade: clean(row.numeroModalidade) || null,
      anoModalidade: parseAnoModalidade(row.numeroModalidade),
      abertura: datas.abertura,
      devolucao: datas.devolucao,
      publicacao: parseBrazilianDateTime(row.publicacao),
      situacao: clean(row.situacao) || null,
      objeto: clean(row.objeto) || null,
      fornecedores: [],
      rawJson: row
    });
  }

  return [...unique.values()].sort((a, b) => a.numeroProcesso.localeCompare(b.numeroProcesso, "pt-BR", { numeric: true }));
}

export async function buscarLicitacoesAno(ano: number): Promise<PortalLicitacao[]> {
  const session = await abrirPortalLicitacoes();
  try {
    await preencherBuscaAno(session.page, ano);
    await clicarBuscar(session.page);
    await sleep(12000);
    const licitacoes = await extractLicitacoesRows(session.page, ano);
    return licitacoes;
  } finally {
    await session.context.close().catch(() => undefined);
    await session.browser.close().catch(() => undefined);
  }
}

async function ensureFonteDadosPublicos() {
  return prisma.fonteDadosPublicos.upsert({
    where: {
      tipo_modulo_urlOrigem: {
        tipo: "html",
        modulo: "licitacoes",
        urlOrigem: portalLicitacoesUrl
      }
    },
    update: {
      ativo: true,
      descricao: "Rol de Processos Licitatórios do Portal Cidadão de Itanhandu."
    },
    create: {
      nome: "Portal Cidadão - Processos Licitatórios",
      tipo: "html",
      descricao: "Rol de Processos Licitatórios do Portal Cidadão de Itanhandu.",
      urlOrigem: portalLicitacoesUrl,
      ativo: true,
      modulo: "licitacoes"
    }
  });
}

async function persistDocumentoAno(ano: number, licitacoes: PortalLicitacao[], hashSha256: string) {
  const fonte = await ensureFonteDadosPublicos();
  return prisma.documentoOrigem.upsert({
    where: {
      fonteDadosPublicosId_ano_mes_tipoDocumento: {
        fonteDadosPublicosId: fonte.id,
        ano,
        mes: 0,
        tipoDocumento: "PROCESSOS_LICITATORIOS_HTML"
      }
    },
    update: {
      nomeArquivo: `processos-licitatorios-${ano}.json`,
      caminhoArquivo: `portal-cidadao://processos-licitatorios/${ano}`,
      hashSha256,
      dataDownload: new Date(),
      statusProcessamento: "PROCESSADO",
      metadados: { origem: "Portal Cidadão", modulo: "licitacoes", total: licitacoes.length }
    },
    create: {
      fonteDadosPublicosId: fonte.id,
      ano,
      mes: 0,
      tipoDocumento: "PROCESSOS_LICITATORIOS_HTML",
      nomeArquivo: `processos-licitatorios-${ano}.json`,
      caminhoArquivo: `portal-cidadao://processos-licitatorios/${ano}`,
      hashSha256,
      statusProcessamento: "PROCESSADO",
      metadados: { origem: "Portal Cidadão", modulo: "licitacoes", total: licitacoes.length }
    }
  });
}

async function findEmpenhosRelacionados(licitacao: PortalLicitacao) {
  const or: Prisma.EmpenhoWhereInput[] = [
    { processoLicitatorio: { equals: licitacao.numeroProcesso, mode: "insensitive" } },
    { processoCompra: { equals: licitacao.numeroProcesso, mode: "insensitive" } }
  ];

  return prisma.empenho.findMany({
    where: {
      OR: or
    },
    select: {
      id: true,
      credor: true,
      credorId: true,
      valorEmpenhado: true,
      valorLiquidado: true,
      valorPago: true,
      processoLicitatorio: true,
      processoCompra: true,
      numeroModalidade: true,
      modalidadeLicitacao: true
    }
  });
}

function relacaoConfianca(
  licitacao: PortalLicitacao,
  empenho: { processoLicitatorio: string | null; processoCompra: string | null; numeroModalidade: string | null }
) {
  if (normalizeForSearch(empenho.processoLicitatorio).includes(normalizeForSearch(licitacao.numeroProcesso))) return 100;
  if (normalizeForSearch(empenho.processoCompra).includes(normalizeForSearch(licitacao.numeroProcesso))) return 95;
  const numeroModalidade = clean(licitacao.numeroModalidade).replace(/\/\d{4}$/, "");
  if (numeroModalidade && normalizeForSearch(empenho.numeroModalidade).includes(normalizeForSearch(numeroModalidade))) return 75;
  return 50;
}

async function relacionarLicitacao(licitacaoId: string, licitacao: PortalLicitacao) {
  const empenhos = await findEmpenhosRelacionados(licitacao);
  await prisma.licitacaoEmpenho.deleteMany({ where: { licitacaoId } });
  await prisma.licitacaoFornecedor.deleteMany({ where: { licitacaoId, origem: "EMPENHO" } });

  for (const empenho of empenhos) {
    await prisma.licitacaoEmpenho.create({
      data: {
        licitacaoId,
        empenhoId: empenho.id,
        tipoRelacao: relacaoConfianca(licitacao, empenho) >= 90 ? "PROCESSO_LICITATORIO" : "MODALIDADE_NUMERO",
        confianca: relacaoConfianca(licitacao, empenho)
      }
    });
  }

  const fornecedores = new Map<string, { nome: string; credorId: string | null; valor: number }>();
  for (const empenho of empenhos) {
    const key = empenho.credorId ?? normalizeCredor(empenho.credor);
    const current = fornecedores.get(key) ?? { nome: normalizeCredor(empenho.credor), credorId: empenho.credorId, valor: 0 };
    current.valor += Number(empenho.valorPago) || Number(empenho.valorLiquidado) || Number(empenho.valorEmpenhado) || 0;
    fornecedores.set(key, current);
  }

  for (const fornecedor of fornecedores.values()) {
    const credor = fornecedor.credorId
      ? null
      : await prisma.credor.upsert({
          where: { nomeNormalizado: fornecedor.nome },
          update: { nome: fornecedor.nome },
          create: { nome: fornecedor.nome, nomeNormalizado: fornecedor.nome }
        });
    await prisma.licitacaoFornecedor.create({
      data: {
        licitacaoId,
        credorId: fornecedor.credorId ?? credor?.id,
        nome: fornecedor.nome,
        valor: fornecedor.valor,
        origem: "EMPENHO"
      }
    });
  }

  return {
    totalEmpenhos: empenhos.length,
    totalFornecedores: fornecedores.size
  };
}

async function persistLicitacoes(ano: number, licitacoes: PortalLicitacao[]) {
  const hashSha256 = sha256(licitacoes.map((item) => ({ ...item, abertura: item.abertura?.toISOString(), publicacao: item.publicacao?.toISOString() })));
  const documento = await persistDocumentoAno(ano, licitacoes, hashSha256);
  let totalEmpenhosRelacionados = 0;
  let totalFornecedoresRelacionados = 0;

  for (const licitacao of licitacoes) {
    const row = await prisma.licitacao.upsert({
      where: { numeroProcesso: licitacao.numeroProcesso },
      update: {
        anoProcesso: licitacao.anoProcesso,
        modalidade: licitacao.modalidade,
        modalidadeCodigo: licitacao.modalidadeCodigo,
        numeroModalidade: licitacao.numeroModalidade,
        anoModalidade: licitacao.anoModalidade,
        abertura: licitacao.abertura,
        devolucao: licitacao.devolucao,
        publicacao: licitacao.publicacao,
        situacao: licitacao.situacao,
        objeto: licitacao.objeto,
        criterio: licitacao.criterio,
        tipo: licitacao.tipo,
        localRealizacao: licitacao.localRealizacao,
        prazoEntrega: licitacao.prazoEntrega,
        prazoExecucao: licitacao.prazoExecucao,
        dataSituacao: licitacao.dataSituacao,
        justificativa: licitacao.justificativa,
        valorTotal: licitacao.valorTotal ?? undefined,
        rawJson: licitacao.rawJson as Prisma.InputJsonValue,
        documentoOrigemId: documento.id
      },
      create: {
        numeroProcesso: licitacao.numeroProcesso,
        anoProcesso: licitacao.anoProcesso,
        modalidade: licitacao.modalidade,
        modalidadeCodigo: licitacao.modalidadeCodigo,
        numeroModalidade: licitacao.numeroModalidade,
        anoModalidade: licitacao.anoModalidade,
        abertura: licitacao.abertura,
        devolucao: licitacao.devolucao,
        publicacao: licitacao.publicacao,
        situacao: licitacao.situacao,
        objeto: licitacao.objeto,
        criterio: licitacao.criterio,
        tipo: licitacao.tipo,
        localRealizacao: licitacao.localRealizacao,
        prazoEntrega: licitacao.prazoEntrega,
        prazoExecucao: licitacao.prazoExecucao,
        dataSituacao: licitacao.dataSituacao,
        justificativa: licitacao.justificativa,
        valorTotal: licitacao.valorTotal ?? undefined,
        rawJson: licitacao.rawJson as Prisma.InputJsonValue,
        documentoOrigemId: documento.id
      }
    });

    await prisma.licitacaoFornecedor.deleteMany({ where: { licitacaoId: row.id, origem: "PORTAL" } });
    for (const fornecedor of licitacao.fornecedores ?? []) {
      const nome = normalizeCredor(fornecedor.nome);
      if (!nome) continue;
      const credor = await prisma.credor.upsert({
        where: { nomeNormalizado: nome },
        update: { nome, documento: fornecedor.documento ?? undefined },
        create: { nome, nomeNormalizado: nome, documento: fornecedor.documento ?? undefined }
      });
      await prisma.licitacaoFornecedor.create({
        data: {
          licitacaoId: row.id,
          credorId: credor.id,
          nome,
          documento: fornecedor.documento,
          resultado: fornecedor.resultado,
          contrato: fornecedor.contrato,
          ata: fornecedor.ata,
          valor: fornecedor.valor ?? undefined,
          origem: fornecedor.origem ?? "PORTAL"
        }
      });
    }

    const related = await relacionarLicitacao(row.id, licitacao);
    totalEmpenhosRelacionados += related.totalEmpenhos;
    totalFornecedoresRelacionados += related.totalFornecedores;
  }

  return { hashSha256, totalEmpenhosRelacionados, totalFornecedoresRelacionados };
}

export async function sincronizarLicitacoesAno(ano: number): Promise<SyncLicitacoesYearResult> {
  const inicio = new Date();
  let processamentoLogId: string | null = null;

  try {
    await logMessage(`Iniciando sincronização de licitações ${ano}.`);
    const fonte = await ensureFonteDadosPublicos();
    const procLog = await prisma.processamentoLog.create({
      data: {
        fonteDadosPublicosId: fonte.id,
        modulo: "licitacoes",
        inicio,
        status: "EM_EXECUCAO"
      }
    });
    processamentoLogId = procLog.id;

    const licitacoes = await buscarLicitacoesAno(ano);
    const persisted = await persistLicitacoes(ano, licitacoes);
    await prisma.processamentoLog.update({
      where: { id: processamentoLogId },
      data: {
        fim: new Date(),
        status: "PROCESSADO",
        totalRegistros: licitacoes.length,
        mensagem: `Licitações ${ano} importadas e relacionadas.`
      }
    });

    await logMessage(`Licitações ${ano}: ${licitacoes.length} processos, ${persisted.totalEmpenhosRelacionados} vínculos com empenhos.`);
    return {
      ano,
      status: "PROCESSADO",
      hashSha256: persisted.hashSha256,
      totalLicitacoes: licitacoes.length,
      totalEmpenhosRelacionados: persisted.totalEmpenhosRelacionados,
      totalFornecedoresRelacionados: persisted.totalFornecedoresRelacionados
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logMessage(`Erro em licitações ${ano}: ${message}`);
    if (processamentoLogId) {
      await prisma.processamentoLog.update({
        where: { id: processamentoLogId },
        data: { fim: new Date(), status: "ERRO", mensagem: message, totalErros: 1 }
      }).catch(() => undefined);
    }
    return { ano, status: "ERRO", totalLicitacoes: 0, totalEmpenhosRelacionados: 0, totalFornecedoresRelacionados: 0, mensagem: message };
  }
}

export async function sincronizarLicitacoesHistorico(): Promise<SyncLicitacoesYearResult[]> {
  const startYear = Number(process.env.LICITACOES_START_YEAR ?? 2025);
  const endYear = Number(process.env.LICITACOES_INITIAL_END_YEAR ?? new Date().getFullYear());
  const results: SyncLicitacoesYearResult[] = [];
  for (let ano = startYear; ano <= endYear; ano += 1) {
    results.push(await sincronizarLicitacoesAno(ano));
    await sleep(2500);
  }
  return results;
}

export async function sincronizarLicitacoesFuturas(): Promise<SyncLicitacoesYearResult[]> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;
  const years = new Set<number>([currentYear, nextYear]);
  const fonte = await ensureFonteDadosPublicos();
  const existingDocs = await prisma.documentoOrigem.findMany({
    where: { fonteDadosPublicosId: fonte.id, tipoDocumento: "PROCESSOS_LICITATORIOS_HTML" },
    select: { ano: true }
  });
  for (const doc of existingDocs) {
    if (doc.ano >= Number(process.env.LICITACOES_START_YEAR ?? 2025)) years.add(doc.ano);
  }

  const results: SyncLicitacoesYearResult[] = [];
  for (const ano of [...years].sort()) {
    results.push(await sincronizarLicitacoesAno(ano));
    await sleep(2500);
  }
  return results;
}
