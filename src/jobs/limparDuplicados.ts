import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";

async function apagarEmpenhosDuplicados() {
  console.log("🧹 Iniciando varredura e limpeza de empenhos duplicados no Neon...");

  // Query PostgreSQL utilizando partição de linhas por número, ano e mês
  const rowsDeleted = await prisma.$executeRawUnsafe(`
    DELETE FROM "Empenho"
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                     PARTITION BY "numeroEmpenho", ano, mes 
                     ORDER BY "createdAt" DESC
                   ) as numero_linha
            FROM "Empenho"
        ) t
        WHERE t.numero_linha > 1
    );
  `);

  console.log(`✨ Saneamento concluído! Foram removidos ${rowsDeleted} registros duplicados de empenhos.`);
}

apagarEmpenhosDuplicados()
  .catch((err) => console.error("Erro ao limpar banco:", err))
  .finally(() => prisma.$disconnect());