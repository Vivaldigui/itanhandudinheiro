import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";

async function diagnosticar() {
  console.log("🔍 Puxando os 13 registros do empenho 5337 do banco...");

  const empenhos = await prisma.empenho.findMany({
    where: {
      numeroEmpenho: {
        contains: "5337" // Busca ampla para pegar variações com espaços
      }
    },
    orderBy: [
      { ano: "asc" },
      { mes: "asc" }
    ]
  });

  console.log(`\n📊 Foram encontrados ${empenhos.length} registros no banco de dados:\n`);

  empenhos.forEach((e) => {
    // Usamos aspas simples ao redor do número para ver se existem espaços invisíveis vazados
    console.log(`ID: ${e.id}`);
    console.log(`   Número: '${e.numeroEmpenho}' | Ano: ${e.ano} | Mês: ${e.mes}`);
    console.log(`   Valor Empenhado: R$ ${e.valorEmpenhado} | Valor Pago: R$ ${e.valorPago}`);
    console.log(`   Histórico resumido: ${e.historico?.substring(0, 60)}...`);
    console.log("-".repeat(70));
  });
}

diagnosticar()
  .catch(console.error)
  .finally(() => prisma.$disconnect());