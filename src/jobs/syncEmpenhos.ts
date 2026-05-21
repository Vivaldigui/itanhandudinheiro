import "@/lib/loadEnv";
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sincronizarHistorico, sincronizarMes, sincronizarMesesFuturos } from "@/modules/empenhos/crawler";
import { sincronizarLicitacoesFuturas } from "@/modules/licitacoes/crawler";

async function sincronizarPortalFuturo() {
  const empenhos = await sincronizarMesesFuturos();
  console.table(empenhos);

  if (process.env.AUTO_SYNC_LICITACOES_ENABLED === "false") return;
  const licitacoes = await sincronizarLicitacoesFuturas();
  console.table(licitacoes);
}

async function run() {
  const mode = process.argv[2] ?? "mensal";

  if (mode === "historico") {
    const results = await sincronizarHistorico();
    console.table(results.map((item) => ({
      periodo: `${item.ano}-${String(item.mes).padStart(2, "0")}`,
      status: item.status,
      empenhos: item.totalEmpenhosExtraidos
    })));
    return;
  }

  if (mode === "mensal") {
    const now = new Date();
    const result = await sincronizarMes({ ano: now.getFullYear(), mes: now.getMonth() + 1 });
    console.table([result]);
    return;
  }

  if (mode === "futuros") {
    await sincronizarPortalFuturo();
    return;
  }

  if (mode === "worker") {
    if (process.env.AUTO_SYNC_ENABLED === "false") {
      console.log("AUTO_SYNC_ENABLED=false. Worker encerrado sem agendar sincronizacao.");
      return;
    }
    const expression = process.env.CRON_EXPRESSION ?? "0 6 * * *";
    console.log(`Worker de sincronizacao ativo. Cron: ${expression}`);
    cron.schedule(expression, () => {
      sincronizarPortalFuturo().catch((error) => console.error("Erro no job de sincronizacao", error));
    });
    await sincronizarPortalFuturo().catch((error) => console.error("Erro na primeira sincronizacao", error));
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
