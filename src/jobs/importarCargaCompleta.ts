import "@/lib/loadEnv";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parsePdfFile } from "@/modules/empenhos/pdfParser";
import { generateFiscalizacaoBrief } from "@/modules/empenhos/aiFiscalizacao";
import { normalizeEmpenho } from "@/modules/empenhos/normalizer";

async function importarPdfCompleto() {
  console.log("🚀 Iniciando leitura do PDF consolidado de todo o período...");

  const pdfPath = path.join(process.cwd(), "analiticoEmpenhos.pdf");

  // Cria registros de segurança para chaves estrangeiras de origem
  const fonte = await prisma.fonteDadosPublicos.upsert({
    where: {
      tipo_modulo_urlOrigem: {
        tipo: "pdf",
        modulo: "empenhos",
        urlOrigem: "importacao-manual-direta"
      }
    },
    update: {},
    create: {
      nome: "Carga Consolidada Manual",
      tipo: "pdf",
      modulo: "empenhos",
      urlOrigem: "importacao-manual-direta",
      ativo: true
    }
  });

  const documento = await prisma.documentoOrigem.upsert({
    where: {
      fonteDadosPublicosId_ano_mes_tipoDocumento: {
        fonteDadosPublicosId: fonte.id,
        ano: 2025,
        mes: 1,
        tipoDocumento: "ANALITICO_EMPENHOS_COMPLETO"
      }
    },
    update: {},
    create: {
      fonteDadosPublicosId: fonte.id,
      ano: 2025,
      mes: 1,
      tipoDocumento: "ANALITICO_EMPENHOS_COMPLETO",
      nomeArquivo: "analiticoEmpenhos.pdf",
      caminhoArquivo: pdfPath,
      hashSha256: "carga-manual-total",
      statusProcessamento: "PROCESSADO"
    }
  });

  console.log("📖 Analisando páginas do PDF... (Isto pode levar alguns segundos pelo volume)");
  const empenhosBrutos = await parsePdfFile(pdfPath, 2025, 1);
  console.log(`✨ Extração textual concluída! ${empenhosBrutos.length} empenhos encontrados.`);
  console.log("📥 Normalizando datas e salvando no PostgreSQL via UPSERT...");

  let processados = 0;

  for (const raw of empenhosBrutos) {
    const empenho = normalizeEmpenho(raw);

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

    // O upsert garante a unificação perfeita usando a chave exclusiva
    await prisma.empenho.upsert({
      where: {
        numeroEmpenho_ano_mes: {
          numeroEmpenho: empenho.numeroEmpenho,
          ano: empenho.ano,
          mes: empenho.mes
        }
      },
      update: {
        valorAnulado: empenho.valorAnulado,
        valorLiquidado: empenho.valorLiquidado,
        valorPago: empenho.valorPago,
        status: empenho.status
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
        processoCompra: empenho.processoCompra,
        processoCompraId: processo?.id,
        modalidadeLicitacao: empenho.modalidadeLicitacao,
        processoLicitatorio: empenho.processoLicitatorio,
        categoria: empenho.categoria,
        secretariaEstimada: empenho.secretariaEstimada,
        status: empenho.status,
        documentoOrigemId: documento.id
      }
    });

    processados++;
    if (processados % 100 === 0) {
      console.log(`▓ Colocando no banco: ${processados}/${empenhosBrutos.length} empenhos consolidados...`);
    }
  }

  console.log(`\n🎉 Carga concluída com sucesso! Banco Neon sincronizado com ${processados} empenhos limpos.`);
}

importarPdfCompleto()
  .catch(console.error)
  .finally(() => prisma.$disconnect());