import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Interface para a entrada do lote
export interface AIDiariaItemInput {
  id: string;
  credor: string;
  historico: string;
}

// Interface para a saída do lote
export interface AIDiariaResponseItem {
  id: string;
  isDiariaValida: boolean;
  beneficiario: string;
  destino: string;
  tipoDespesa: "Diária" | "Hospedagem" | "Passagem" | "Deslocamento" | "Inscrição / evento" | "Outras despesas de viagem";
}

export async function analisarLoteDiariasComIA(lote: AIDiariaItemInput[]): Promise<AIDiariaResponseItem[]> {
  if (lote.length === 0) return [];

  // Formata o grupo de empenhos em texto legível para a IA
  const listaFormatada = lote.map(item => 
    `ID_REF: "${item.id}"\nCredor: "${item.credor}"\nHistórico: "${item.historico}"\n---`
  ).join("\n");

  const prompt = `
    Você é um auditor de contas públicas. Analise a lista de empenhos abaixo vindos da Prefeitura de Itanhandu e identifique se cada item se trata de uma concessão de DIÁRIA, VIAGEM ou DESLOCAMENTO para um SERVIDOR PÚBLICO (Pessoa Física).

    Lista de empenhos a analisar:
    ${listaFormatada}

    Regras Críticas para CADA ITEM da lista:
    1. O campo 'id' no JSON de saída deve ser exatamente o 'ID_REF' fornecido na entrada.
    2. Se o credor for uma Empresa/PJ (Ltda, Associações, Hospitais, Pro Solo, etc), 'isDiariaValida' DEVE ser false. Diárias legítimas são pagas apenas para Pessoas Físicas.
    3. Identifique o nome do beneficiário (servidor que viajou).
    4. Extraia e formalize a cidade de destino. Se não houver destino explícito, use "Não identificado".
    5. Classifique o tipoDespesa estritamente nas opções permitidas.
  `;

  try {
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        // Forçamos o esquema a devolver um ARRAY de objetos estruturados
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              isDiariaValida: { type: "BOOLEAN" },
              beneficiario: { type: "STRING" },
              destino: { type: "STRING" },
              tipoDespesa: { 
                type: "STRING", 
                enum: ["Diária", "Hospedagem", "Passagem", "Deslocamento", "Inscrição / evento", "Outras despesas de viagem"] 
              },
            },
            required: ["id", "isDiariaValida", "beneficiario", "destino", "tipoDespesa"],
          },
        },
      },
    });

    const responseText = response.response.text();
    return JSON.parse(responseText) as AIDiariaResponseItem[];
  } catch (error) {
    console.error("Erro na API do Gemini ao processar o lote:", error);
    return []; // Retorna vazio para o job tratar a parada do loop de forma limpa
  }
}