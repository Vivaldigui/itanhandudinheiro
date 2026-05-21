import "@/lib/loadEnv";
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import {
  sincronizarLicitacoesAno,
  sincronizarLicitacoesFuturas,
  sincronizarLicitacoesHistorico
} from "@/modules/licitacoes/crawler";

async function run() {
  const mode = process.argv[2] ?? "atual";

  if (mode === "historico") {
    const results = await sincronizarLicitacoesHistorico();
    console.table(results.map((item) => ({
      ano: item.ano,
      status: item.status,
      licitacoes: item.totalLicitacoes,
      empenhosRelacionados: item.totalEmpenhosRelacionados,
      fornecedores: item.totalFornecedoresRelacionados
    })));
    return;
  }

  if (mode === "atual") {
    const yearArg = Number(process.argv[3]);
    const result = await sincronizarLicitacoesAno(Number.isFinite(yearArg) ? yearArg : new Date().getFullYear());
    console.table([result]);
    return;
  }

  if (mode === "futuros") {
    const results = await sincronizarLicitacoesFuturas();
    console.table(results);
    return;
  }

  if (mode === "worker") {
    if (process.env.AUTO_SYNC_LICITACOES_ENABLED === "false") {
      console.log("AUTO_SYNC_LICITACOES_ENABLED=false. Worker de licitações encerrado sem agendar sincronização.");
      return;
    }

    const expression = process.env.LICITACOES_CRON_EXPRESSION ?? process.env.CRON_EXPRESSION ?? "30 6 * * *";
    console.log(`Worker de licitações ativo. Cron: ${expression}`);
    cron.schedule(expression, () => {
      sincronizarLicitacoesFuturas()
        .then((results) => console.table(results))
        .catch((error) => console.error("Erro no job de licitações", error));
    });
    await sincronizarLicitacoesFuturas().catch((error) => console.error("Erro na primeira sincronização de licitações", error));
    await new Promise(() => undefined);
  }

  throw new Error(`Modo desconhecido: ${mode}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.argv[2] !== "worker") await prisma.$disconnect().catch(() => undefined);
  });
