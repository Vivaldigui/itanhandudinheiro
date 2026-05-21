import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";

async function limparTudo() {
  console.log("💥 Limpando registros antigos para re-sincronização...");
  await prisma.alertaFiscalizacao.deleteMany();
  await prisma.documentoPagamento.deleteMany();
  await prisma.empenho.deleteMany();
  await prisma.documentoOrigem.updateMany({ data: { statusProcessamento: "PENDENTE" } });
  console.log("✨ Banco limpo com sucesso! Pronto para re-sincronizar.");
}
limparTudo().finally(() => prisma.$disconnect());