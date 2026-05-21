import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";
import { analisarLoteDiariasComIA, type AIDiariaItemInput } from "@/lib/geminiDiarias";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function rodarSaneamentoEmLoteComIA() {
  console.log("🔍 [1/4] Buscando empenhos candidatos no banco de dados Neon...");

  const diariaTerms = ["diaria", "diárias", "viagem", "deslocamento", "hospedagem", "estadia", "adiantamento"];

  const todosCandidatos = await prisma.empenho.findMany({
    where: {
      OR: diariaTerms.flatMap((term) => [
        { historico: { contains: term, mode: "insensitive" } }
      ])
    }
  });

  // Filtra apenas os registros que a IA ainda não processou
  const empenhosParaProcessar = todosCandidatos.filter((empenho) => {
    const resumoObj = empenho.resumoFiscalizacao as any;
    return !resumoObj?.dadosDiariaIA;
  });

  console.log(`📊 [2/4] Total pendente no histórico: ${empenhosParaProcessar.length} empenhos.`);

  if (empenhosParaProcessar.length === 0) {
    console.log("✨ Tudo pronto! Não há empenhos antigos pendentes de IA.");
    return;
  }

  // 🛠️ CONFIGURAÇÃO DE SEGURANÇA PARA A COTA DE 20 REQUESTS/DIA
  const TAMANHO_LOTE = 50; // Quantos itens agrupamos por prompt
  const MAX_REQUISICOES_HOJE = 20; // Limite diário estrito da API do Gemini
  
  const limiteItensHoje = TAMANHO_LOTE * MAX_REQUISICOES_HOJE; // 1.000 itens máximos
  const loteCompletoHoje = empenhosParaProcessar.slice(0, limiteItensHoje);

  console.log(`🚀 [3/4] Preparando para tratar ${loteCompletoHoje.length} empenhos em grupos de ${TAMANHO_LOTE} por vez.`);
  console.log("⚙️ [4/4] Executando chamadas em bloco...");

  // Corta os registros de 50 em 50
  for (let i = 0; i < loteCompletoHoje.length; i += TAMANHO_LOTE) {
    const fatia = loteCompletoHoje.slice(i, i + TAMANHO_LOTE);
    const numeroRequest = Math.floor(i / TAMANHO_LOTE) + 1;
    const totalRequests = Math.ceil(loteCompletoHoje.length / TAMANHO_LOTE);

    console.log(`\n📦 [Requisição ${numeroRequest}/${totalRequests}] Enviando bloco de ${fatia.length} empenhos para a IA...`);

    const dadosParaIA: AIDiariaItemInput[] = fatia.map(e => ({
      id: e.id,
      credor: e.credor,
      historico: e.historico || ""
    }));

    // Uma única requisição consome 50 empenhos!
    const resultadosIA = await analisarLoteDiariasComIA(dadosParaIA);

    if (resultadosIA.length === 0) {
      console.log("❌ O bloco falhou ou estourou a cota diária. Interrompendo a execução de hoje.");
      break;
    }

    console.log(`📥 Recebidos ${resultadosIA.length} resultados. Salvando dados estruturados no PostgreSQL...`);

    // Varre as respostas da IA e atualiza o banco de dados
    for (const resultado of resultadosIA) {
      const empenhoOriginal = fatia.find(f => f.id === resultado.id);
      if (!empenhoOriginal) continue;

      const { id, ...dadosDiaria } = resultado;

      await prisma.empenho.update({
        where: { id: empenhoOriginal.id },
        data: {
          resumoFiscalizacao: {
            ...(empenhoOriginal.resumoFiscalizacao as Record<string, unknown> || {}),
            dadosDiariaIA: dadosDiaria
          }
        }
      });
    }

    console.log(`✅ Bloco ${numeroRequest} concluído e sincronizado!`);

    // Intervalo de segurança de 15 segundos entre blocos para evitar travas colaterais por minuto
    if (i + TAMANHO_LOTE < loteCompletoHoje.length) {
      console.log("⏳ Aguardando 15 segundos de intervalo de segurança antes do próximo bloco...");
      await sleep(15000);
    }
  }

  console.log("\n🎉 Processamento em lote finalizado com sucesso!");
}

rodarSaneamentoEmLoteComIA()
  .catch((err) => console.error("Erro no Job de Lotes:", err))
  .finally(() => prisma.$disconnect());