import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { SAMPLE_EMPENHOS } from "../src/lib/sampleData";

async function main() {
  await prisma.alertaFiscalizacao.deleteMany();
  await prisma.documentoPagamento.deleteMany();
  await prisma.licitacaoEmpenho.deleteMany();
  await prisma.licitacaoFornecedor.deleteMany();
  await prisma.licitacao.deleteMany();
  await prisma.empenho.deleteMany();
  await prisma.pdfArquivo.deleteMany();
  await prisma.documentoOrigem.deleteMany();
  await prisma.processamentoLog.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.processoCompra.deleteMany();
  await prisma.credor.deleteMany();
  await prisma.fonteDadosPublicos.deleteMany();

  const fonte = await prisma.fonteDadosPublicos.create({
    data: {
      nome: "Dados de exemplo",
      tipo: "seed",
      descricao: "Registros demonstrativos para validar o banco local.",
      urlOrigem: "seed://sample-empenhos",
      ativo: true,
      modulo: "empenhos"
    }
  });

  const documento = await prisma.documentoOrigem.create({
    data: {
      fonteDadosPublicosId: fonte.id,
      ano: 2026,
      mes: 5,
      tipoDocumento: "SEED_EMPENHOS",
      nomeArquivo: "sampleData.ts",
      caminhoArquivo: "src/lib/sampleData.ts",
      hashSha256: "seed",
      statusProcessamento: "PROCESSADO",
      metadados: { origem: "seed", total: SAMPLE_EMPENHOS.length }
    }
  });

  for (const empenho of SAMPLE_EMPENHOS) {
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

    await prisma.empenho.create({
      data: {
        id: empenho.id,
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
        documentoOrigemId: documento.id,
        documentosPagamento: {
          create: empenho.documentosPagamento.map((pagamento) => ({
            tipo: pagamento.tipo,
            numero: pagamento.numero,
            dataEmissao: pagamento.dataEmissao,
            dataVencimento: pagamento.dataVencimento,
            descricao: pagamento.descricao,
            valor: pagamento.valor
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

  await prisma.syncLog.create({
    data: {
      inicio: new Date(),
      fim: new Date(),
      status: "PROCESSADO",
      mensagem: "Seed local executado.",
      ano: 2026,
      mes: 5,
      totalEmpenhosExtraidos: SAMPLE_EMPENHOS.length
    }
  });
}

main()
  .then(async () => {
    console.log(`Seed concluido: ${SAMPLE_EMPENHOS.length} empenhos.`);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
