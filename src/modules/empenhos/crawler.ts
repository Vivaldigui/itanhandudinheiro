/* eslint-disable @typescript-eslint/no-unused-vars */
import "@/lib/loadEnv";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Frame, type Page } from "playwright";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePdfFile } from "./pdfParser";
import { isAIEnrichmentConfigured, processEmpenhoWithAI, type AIProcessingResult } from "./aiEnrichment";
import { generateFiscalizacaoBrief } from "./aiFiscalizacao";
import type { NormalizedEmpenho } from "./types";

export type PortalSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export type SyncMonthResult = {
  ano: number;
  mes: number;
  status: "PROCESSADO" | "IGNORADO" | "ERRO";
  hashSha256?: string;
  caminhoArquivo?: string;
  totalEmpenhosExtraidos: number;
  mensagem?: string;
};

const portalUrl = process.env.PORTAL_CIDADAO_URL ?? "";
const defaultDelayMs = 1600;

function sleep(ms = defaultDelayMs) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function monthPath(ano: number, mes: number) {
  const padded = String(mes).padStart(2, "0");
  return path.join(process.cwd(), "data", "raw-pdfs", String(ano), padded, `analitico-empenhos-${ano}-${padded}.pdf`);
}

async function logMessage(message: string) {
  const logDir = path.join(process.cwd(), "data", "logs");
  await mkdir(logDir, { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await writeFile(path.join(logDir, "sync-empenhos.log"), line, { flag: "a", encoding: "utf8" });
}

async function saveErrorScreenshot(page: Page, label: string) {
  const logDir = path.join(process.cwd(), "data", "logs");
  await mkdir(logDir, { recursive: true });
  const safeLabel = label.replace(/[^a-z0-9-]+/gi, "-").toLocaleLowerCase("pt-BR");
  await page.screenshot({ path: path.join(logDir, `${Date.now()}-${safeLabel}.png`), fullPage: true });
}

async function waitForAnaliticoFrame(page: Page): Promise<Frame> {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const frame = page.frames().find((item) => item.url().includes("report-analiticoempenho"));
    if (frame) {
      const text = await frame.locator("body").innerText().catch(() => "");
      if (/Impress[aã]o de Anal/i.test(text) || /Analitico de Empenhos/i.test(text)) return frame;
    }
    await sleep(5000);
  }
  throw new Error("A tela de Analítico de Empenhos não carregou dentro do tempo esperado.");
}

async function selectDxSelectBox(frame: Frame, index: number, value: string) {
  await frame.locator("dx-select-box").nth(index).click({ timeout: 15000 });
  await sleep(500);
  await frame.locator(".dx-list-item").filter({ hasText: value }).first().click({ timeout: 15000 });
  await sleep(500);
}

async function ensureDxCheckbox(frame: Frame, label: string) {
  const checkbox = frame.locator("dx-check-box").filter({ hasText: label }).first();
  if ((await checkbox.count()) === 0) throw new Error(`Checkbox não encontrado: ${label}`);
  const value = await checkbox.locator('input[type="hidden"]').inputValue().catch(() => "");
  if (value !== "true") await checkbox.click({ timeout: 10000 });
  await sleep(350);
}

async function clickDxRadio(frame: Frame, label: string) {
  const found = await frame.evaluate(`(wantedLabel) => {
    const normalize = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("pt-BR");
    const wanted = normalize(wantedLabel);
    const element = [...document.querySelectorAll('[role="radio"]')].find((item) => normalize(item.textContent ?? "").includes(wanted));
    if (!element) return false;
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }`, label);

  if (!found) throw new Error(`Opção de rádio não encontrada: ${label}`);
  await sleep(350);
}

async function clickFirstVisible(page: Page, labels: string[]) {
  for (const label of labels) {
    const locators = [
      page.getByRole("button", { name: new RegExp(label, "i") }),
      page.getByRole("link", { name: new RegExp(label, "i") }),
      page.getByText(new RegExp(label, "i"))
    ];
    for (const locator of locators) {
      const first = locator.first();
      if ((await first.count()) > 0) {
        await first.click({ timeout: 5000 });
        await sleep();
        return;
      }
    }
  }
  throw new Error(`Não encontrei item visível: ${labels.join(" / ")}`);
}

async function setSelectByLabel(page: Page, label: string, visibleValue: string) {
  const labelPattern = new RegExp(label, "i");
  const byLabel = page.getByLabel(labelPattern).first();
  if ((await byLabel.count()) > 0) {
    try {
      await byLabel.selectOption({ label: visibleValue });
      await sleep(500);
      return;
    } catch {
      await byLabel.click();
      await page.getByText(new RegExp(`^${visibleValue}$`, "i")).first().click();
      await sleep(500);
      return;
    }
  }

  const text = page.getByText(labelPattern).first();
  if ((await text.count()) > 0) {
    const select = text.locator("xpath=following::select[1]");
    if ((await select.count()) > 0) {
      await select.selectOption({ label: visibleValue });
      await sleep(500);
      return;
    }
    const input = text.locator("xpath=following::*[@role='combobox' or contains(@class,'select') or self::input][1]");
    if ((await input.count()) > 0) {
      await input.click();
      await page.getByText(new RegExp(`^${visibleValue}$`, "i")).first().click();
      await sleep(500);
      return;
    }
  }

  throw new Error(`Não foi possível selecionar ${visibleValue} no campo ${label}`);
}

async function chooseByText(page: Page, text: string) {
  const label = page.getByText(new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i")).first();
  if ((await label.count()) === 0) throw new Error(`Opção não encontrada: ${text}`);
  await label.click({ timeout: 5000 });
  await sleep(350);
}

async function ensureChecked(page: Page, label: string) {
  const byLabel = page.getByLabel(new RegExp(label, "i")).first();
  if ((await byLabel.count()) > 0) {
    try {
      await byLabel.check({ timeout: 2000 });
      return;
    } catch {
      await byLabel.click();
      return;
    }
  }
  await chooseByText(page, label);
}

async function ensureRadio(page: Page, label: string) {
  const byLabel = page.getByLabel(new RegExp(label, "i")).first();
  if ((await byLabel.count()) > 0) {
    try {
      await byLabel.check({ timeout: 2000 });
      return;
    } catch {
      await byLabel.click();
      return;
    }
  }
  await chooseByText(page, label);
}

export async function abrirPortal(): Promise<PortalSession> {
  if (!portalUrl) throw new Error("PORTAL_CIDADAO_URL não configurada.");
  const headless = process.env.PORTAL_HEADLESS !== "false";
  const browser = await chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1366, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => undefined);
  await sleep();
  return { browser, context, page };
}

export async function navegarParaAnaliticoEmpenhos(page: Page): Promise<Frame> {
  try {
    const directFrame = await waitForAnaliticoFrame(page).catch(() => null);
    if (directFrame) return directFrame;
    await clickFirstVisible(page, ["Transparência", "Transparencia"]);
    await clickFirstVisible(page, ["Compras"]);
    await clickFirstVisible(page, ["Analíticos de Empenhos", "Analiticos de Empenhos", "Analítico de Empenhos"]);
    return await waitForAnaliticoFrame(page);
  } catch (error) {
    await saveErrorScreenshot(page, "navegar-analitico-empenhos").catch(() => undefined);
    throw error;
  }
}

export async function configurarFiltros(page: Page, frame: Frame, { ano, mes }: { ano: number; mes: number }) {
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];

  try {
    await selectDxSelectBox(frame, 0, String(ano));
    await selectDxSelectBox(frame, 1, ".pdf (Adobe PDF)");
    await selectDxSelectBox(frame, 2, monthNames[mes - 1]);
    await ensureDxCheckbox(frame, "Listar Empenhos por Hist");
    await ensureDxCheckbox(frame, "Listar Sub-Empenhos");
    await ensureDxCheckbox(frame, "Listar Documentos de Pagamentos");
    await ensureDxCheckbox(frame, "Listar Processo Compra dos Empenhos");
  } catch (error) {
    await saveErrorScreenshot(page, `configurar-filtros-${ano}-${mes}`).catch(() => undefined);
    throw error;
  }
}

export async function gerarPdf(page: Page, frame: Frame): Promise<Buffer | null> {
  const downloadPromise = page.waitForEvent("download", { timeout: 120000 }).catch(() => null);
  const responsePromise = page
    .waitForResponse((response) => {
      const contentType = response.headers()["content-type"] ?? "";
      return contentType.includes("application/pdf");
    }, { timeout: 120000 })
    .catch(() => null);

  await frame.getByRole("button", { name: "Gerar" }).click({ timeout: 15000 });
  const download = await downloadPromise;
  if (download) {
    const failure = await download.failure();
    if (failure) throw new Error(failure);
    const downloadedPath = await download.path();
    if (!downloadedPath) throw new Error("Download do PDF não retornou caminho temporário.");
    const buffer = await import("node:fs/promises").then((fs) => fs.readFile(downloadedPath));
    return buffer;
  }

  const response = await responsePromise;
  if (response) return response.body();
  return null;
}

export async function baixarPdf({ ano, mes }: { ano: number; mes: number }): Promise<string> {
  const session = await abrirPortal();
  const targetPath = monthPath(ano, mes);
  try {
    const frame = await navegarParaAnaliticoEmpenhos(session.page);
    await configurarFiltros(session.page, frame, { ano, mes });
    await mkdir(path.dirname(targetPath), { recursive: true });
    const buffer = await gerarPdf(session.page, frame);
    if (!buffer || buffer.length < 1000) throw new Error("PDF não foi baixado ou parece vazio.");
    await writeFile(targetPath, buffer);
    await logMessage(`PDF salvo: ${targetPath}`);
    return targetPath;
  } catch (error) {
    await saveErrorScreenshot(session.page, `baixar-pdf-${ano}-${mes}`).catch(() => undefined);
    await logMessage(`Erro ao baixar ${ano}-${mes}: ${String(error)}`);
    throw error;
  } finally {
    await session.browser.close();
  }
}

export async function calcularHashPdf(filePath: string): Promise<string> {
  await stat(filePath);
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function ensureFonteDadosPublicos() {
  return prisma.fonteDadosPublicos.upsert({
    where: {
      tipo_modulo_urlOrigem: {
        tipo: "pdf",
        modulo: "empenhos",
        urlOrigem: portalUrl
      }
    },
    update: {
      ativo: true,
      descricao: "Relatórios mensais de Analítico de Empenhos do Portal Cidadão de Itanhandu."
    },
    create: {
      nome: "Portal Cidadão - Analítico de Empenhos",
      tipo: "pdf",
      descricao: "Relatórios mensais de Analítico de Empenhos do Portal Cidadão de Itanhandu.",
      urlOrigem: portalUrl,
      ativo: true,
      modulo: "empenhos"
    }
  });
}

function isCurrentMonth({ ano, mes }: { ano: number; mes: number }): boolean {
  const now = new Date();
  return ano === now.getFullYear() && mes === now.getMonth() + 1;
}

function shouldUseAIEnrichment({ ano, mes }: { ano: number; mes: number }): boolean {
  if (process.env.AI_EMPENHOS_ENABLED === "false") return false;
  if (!isAIEnrichmentConfigured()) return false;
  if (process.env.AI_EMPENHOS_ENABLED === "true") return true;
  return isCurrentMonth({ ano, mes });
}

function aiCacheKey(empenho: NormalizedEmpenho): string {
  return `${empenho.credor}\n${empenho.historico ?? ""}`;
}

async function enrichEmpenhoWithAI(
  empenho: NormalizedEmpenho,
  enabled: boolean,
  cache: Map<string, AIProcessingResult | null>
): Promise<NormalizedEmpenho> {
  if (!enabled || empenho.categoria !== "Outros" || !empenho.historico) return empenho;

  const key = aiCacheKey(empenho);
  if (!cache.has(key)) {
    try {
      cache.set(key, await processEmpenhoWithAI(empenho.historico, empenho.credor));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await logMessage(`IA ignorada no empenho ${empenho.numeroEmpenho}: ${message}`);
      cache.set(key, null);
    }
  }

  const dadosIa = cache.get(key);
  if (!dadosIa) return empenho;

  return {
    ...empenho,
    categoria: dadosIa.categoria,
    secretariaEstimada: dadosIa.secretariaEstimada,
    aiAnalise: dadosIa.analiseCritica,
    clarezaHistorico: dadosIa.grauDeClareza
  };
}

async function persistEmpenhos(documentoOrigemId: string, empenhos: NormalizedEmpenho[]) {
  // Opcional: não remova às cegas registros de outros meses se o parser reclassificar os meses
  await prisma.empenho.deleteMany({ where: { documentoOrigemId } });

  for (const empenho of empenhos) {
    const credor = await prisma.credor.upsert({
      where: { nomeNormalizado: empenho.credor },
      update: { nome: empenho.credor },
      create: { nome: empenho.credor, nomeNormalizado: empenho.credor }
    });

    const processo = empenho.processoCompra
      ? await prisma.processoCompra.upsert({
          where: { numero: empenho.processoCompra },
          update: {
            modalidade: empenho.modalidadeLicitacao,
            processoLicitatorio: empenho.processoLicitatorio
          },
          create: {
            numero: empenho.processoCompra,
            modalidade: empenho.modalidadeLicitacao,
            processoLicitatorio: empenho.processoLicitatorio
          }
        })
      : null;

    const resumo = empenho.riskScore >= 30 ? generateFiscalizacaoBrief(empenho) : undefined;

    // 🔥 MUDANÇA AQUI: De 'create' para 'upsert' com base na chave única composta
    await prisma.empenho.upsert({
      where: {
        numeroEmpenho_ano_mes: {
          numeroEmpenho: empenho.numeroEmpenho,
          ano: empenho.ano,
          mes: empenho.mes
        }
      },
      update: {
        // Se o empenho reaparecer em meses futuros, atualiza os valores financeiros consolidados
        valorAnulado: empenho.valorAnulado,
        valorLiquidado: empenho.valorLiquidado,
        valorLiquidadoAnulado: empenho.valorLiquidadoAnulado,
        valorPago: empenho.valorPago,
        valorPagoAnulado: empenho.valorPagoAnulado,
        valorALiquidar: empenho.valorALiquidar,
        valorLiquidadoAPagar: empenho.valorLiquidadoAPagar,
        valorAPagar: empenho.valorAPagar,
        status: empenho.status,
        documentoOrigemId
      },
      create: {
        numeroEmpenho: empenho.numeroEmpenho,
        tipoEmpenho: empenho.tipoEmpenho,
        dataEmpenho: empenho.dataEmpenho,
        ano: empenho.ano,
        mes: empenho.mes,
        ficha: empenho.ficha,
        credor: empenho.credor,
        credorId: credor.id,
        fonte: empenho.fonte,
        codigoAplicacao: empenho.codigoAplicacao,
        valorEmpenhado: empenho.valorEmpenhado,
        valorAnulado: empenho.valorAnulado,
        valorLiquidado: empenho.valorLiquidado,
        valorLiquidadoAnulado: empenho.valorLiquidadoAnulado,
        valorPago: empenho.valorPago,
        valorPagoAnulado: empenho.valorPagoAnulado,
        valorALiquidar: empenho.valorALiquidar,
        valorLiquidadoAPagar: empenho.valorLiquidadoAPagar,
        valorAPagar: empenho.valorAPagar,
        historico: empenho.historico,
        historicoMascarado: empenho.historicoMascarado,
        processoCompra: empenho.processoCompra,
        processoCompraId: processo?.id,
        modalidadeLicitacao: empenho.modalidadeLicitacao,
        processoLicitatorio: empenho.processoLicitatorio,
        numeroModalidade: empenho.numeroModalidade,
        pedidoCompra: empenho.pedidoCompra,
        contrato: empenho.contrato,
        aditamento: empenho.aditamento,
        gestor: empenho.gestor,
        categoria: empenho.categoria,
        secretariaEstimada: empenho.secretariaEstimada,
        status: empenho.status,
        riskScore: empenho.riskScore,
        riskLevel: empenho.riskLevel,
        alertas: empenho.alertas as unknown as Prisma.InputJsonValue,
        resumoFiscalizacao: resumo as unknown as Prisma.InputJsonValue,
        documentoOrigemId,
        documentosPagamento: {
          create: empenho.documentosPagamento.map((documento) => ({
            tipo: documento.tipo,
            numero: documento.numero,
            dataEmissao: documento.dataEmissao,
            dataVencimento: documento.dataVencimento,
            descricao: documento.descricao,
            valor: documento.valor
          }))
        },
        alertasFiscalizacao: {
          create: empenho.alertas.map((alerta) => ({
            tipo: alerta.tipo,
            nivel: alerta.nivel,
            descricao: alerta.descricao,
            sugestaoFiscalizacao: alerta.sugestaoFiscalizacao
          }))
        }
      }
    });
  }
}

export async function sincronizarMes({ ano, mes }: { ano: number; mes: number }): Promise<SyncMonthResult> {
  const inicio = new Date();
  const syncLog = await prisma.syncLog.create({
    data: { inicio, status: "EM_EXECUCAO", ano, mes }
  });
  let processamentoLogId: string | null = null;

  try {
    await logMessage(`Iniciando sincronização ${ano}-${String(mes).padStart(2, "0")}`);
    const fonte = await ensureFonteDadosPublicos();
    const procLog = await prisma.processamentoLog.create({
      data: {
        fonteDadosPublicosId: fonte.id,
        modulo: "empenhos",
        inicio,
        status: "EM_EXECUCAO"
      }
    });
    processamentoLogId = procLog.id;

    const pdfPath = await baixarPdf({ ano, mes });
    const hashSha256 = await calcularHashPdf(pdfPath);
    const existing = await prisma.documentoOrigem.findUnique({
      where: {
        fonteDadosPublicosId_ano_mes_tipoDocumento: {
          fonteDadosPublicosId: fonte.id,
          ano,
          mes,
          tipoDocumento: "ANALITICO_EMPENHOS_PDF"
        }
      }
    });

    if (existing?.hashSha256 === hashSha256 && existing.statusProcessamento === "PROCESSADO") {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          fim: new Date(),
          status: "IGNORADO",
          mensagem: "PDF já processado e hash SHA256 igual.",
          totalEmpenhosExtraidos: 0
        }
      });
      await prisma.processamentoLog.update({
        where: { id: processamentoLogId },
        data: {
          fim: new Date(),
          status: "IGNORADO",
          mensagem: "Hash SHA256 igual ao último processamento.",
          totalRegistros: 0
        }
      });
      return { ano, mes, status: "IGNORADO", hashSha256, caminhoArquivo: pdfPath, totalEmpenhosExtraidos: 0 };
    }

    const documento = await prisma.documentoOrigem.upsert({
      where: {
        fonteDadosPublicosId_ano_mes_tipoDocumento: {
          fonteDadosPublicosId: fonte.id,
          ano,
          mes,
          tipoDocumento: "ANALITICO_EMPENHOS_PDF"
        }
      },
      update: {
        nomeArquivo: path.basename(pdfPath),
        caminhoArquivo: pdfPath,
        hashSha256,
        dataDownload: new Date(),
        statusProcessamento: "EM_PROCESSAMENTO",
        metadados: { origem: "Portal Cidadão", modulo: "empenhos" }
      },
      create: {
        fonteDadosPublicosId: fonte.id,
        ano,
        mes,
        tipoDocumento: "ANALITICO_EMPENHOS_PDF",
        nomeArquivo: path.basename(pdfPath),
        caminhoArquivo: pdfPath,
        hashSha256,
        statusProcessamento: "EM_PROCESSAMENTO",
        metadados: { origem: "Portal Cidadão", modulo: "empenhos" }
      }
    });

    await prisma.pdfArquivo.upsert({
      where: { documentoOrigemId: documento.id },
      update: {
        ano,
        mes,
        nomeArquivo: path.basename(pdfPath),
        caminhoArquivo: pdfPath,
        hashSha256,
        dataDownload: new Date(),
        statusProcessamento: "EM_PROCESSAMENTO"
      },
      create: {
        ano,
        mes,
        nomeArquivo: path.basename(pdfPath),
        caminhoArquivo: pdfPath,
        hashSha256,
        statusProcessamento: "EM_PROCESSAMENTO",
        documentoOrigemId: documento.id
      }
    });

    if (existing && existing.caminhoArquivo !== pdfPath) {
      await copyFile(pdfPath, existing.caminhoArquivo).catch(() => undefined);
    }

    const empenhos = await parsePdfFile(pdfPath, ano, mes);
    const useAIEnrichment = shouldUseAIEnrichment({ ano, mes });
    if (useAIEnrichment) {
      await logMessage(`Enriquecimento por IA habilitado para categorias "Outros" em ${ano}-${String(mes).padStart(2, "0")}.`);
    }
    await persistEmpenhos(documento.id, empenhos, { useAIEnrichment });

    await prisma.documentoOrigem.update({
      where: { id: documento.id },
      data: { statusProcessamento: "PROCESSADO" }
    });
    await prisma.pdfArquivo.update({
      where: { documentoOrigemId: documento.id },
      data: { statusProcessamento: "PROCESSADO" }
    });
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        fim: new Date(),
        status: "PROCESSADO",
        mensagem: "PDF baixado, parseado e gravado.",
        totalEmpenhosExtraidos: empenhos.length
      }
    });
    await prisma.processamentoLog.update({
      where: { id: processamentoLogId },
      data: {
        documentoOrigemId: documento.id,
        fim: new Date(),
        status: "PROCESSADO",
        mensagem: "PDF baixado, parseado e gravado.",
        totalRegistros: empenhos.length
      }
    });

    await logMessage(`Sincronização concluída ${ano}-${mes}: ${empenhos.length} empenhos`);
    return { ano, mes, status: "PROCESSADO", hashSha256, caminhoArquivo: pdfPath, totalEmpenhosExtraidos: empenhos.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logMessage(`Erro na sincronização ${ano}-${mes}: ${message}`);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { fim: new Date(), status: "ERRO", mensagem: message, totalErros: 1 }
    }).catch(() => undefined);
    if (processamentoLogId) {
      await prisma.processamentoLog.update({
        where: { id: processamentoLogId },
        data: { fim: new Date(), status: "ERRO", mensagem: message, totalErros: 1 }
      }).catch(() => undefined);
    }
    return { ano, mes, status: "ERRO", totalEmpenhosExtraidos: 0, mensagem: message };
  }
}

function monthsBetween(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  const months: Array<{ ano: number; mes: number }> = [];
  let ano = startYear;
  let mes = startMonth;
  while (ano < endYear || (ano === endYear && mes <= endMonth)) {
    months.push({ ano, mes });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return months;
}

export async function sincronizarHistorico(): Promise<SyncMonthResult[]> {
  const startYear = Number(process.env.SYNC_START_YEAR ?? 2025);
  const startMonth = Number(process.env.SYNC_START_MONTH ?? 1);
  const endYear = Number(process.env.SYNC_INITIAL_END_YEAR ?? 2026);
  const endMonth = Number(process.env.SYNC_INITIAL_END_MONTH ?? 5);
  const results: SyncMonthResult[] = [];
  for (const month of monthsBetween(startYear, startMonth, endYear, endMonth)) {
    results.push(await sincronizarMes(month));
    await sleep(2500);
  }
  return results;
}

export async function sincronizarMesesFuturos(): Promise<SyncMonthResult[]> {
  const now = new Date();
  const current = { ano: now.getFullYear(), mes: now.getMonth() + 1 };
  const fonte = await ensureFonteDadosPublicos();
  const existingDocs = await prisma.documentoOrigem.findMany({
    where: { fonteDadosPublicosId: fonte.id, tipoDocumento: "ANALITICO_EMPENHOS_PDF" },
    select: { ano: true, mes: true },
    orderBy: [{ ano: "asc" }, { mes: "asc" }]
  });

  const keys = new Map<string, { ano: number; mes: number }>();
  for (const doc of existingDocs) keys.set(`${doc.ano}-${doc.mes}`, doc);
  keys.set(`${current.ano}-${current.mes}`, current);

  const results: SyncMonthResult[] = [];
  for (const month of keys.values()) {
    results.push(await sincronizarMes(month));
    await sleep(2500);
  }
  return results;
}
