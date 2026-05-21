import { listCategories } from "./classifier";

export type AIProcessingResult = {
  categoria: string;
  secretariaEstimada: string;
  analiseCritica: string;
  grauDeClareza: "ALTO" | "MEDIO" | "BAIXO";
};

type GeminiTextPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiTextPart[];
    };
  }>;
};

const clarityLevels = new Set<AIProcessingResult["grauDeClareza"]>(["ALTO", "MEDIO", "BAIXO"]);

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function normalizeClarity(value: unknown): AIProcessingResult["grauDeClareza"] {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
  return clarityLevels.has(normalized as AIProcessingResult["grauDeClareza"])
    ? (normalized as AIProcessingResult["grauDeClareza"])
    : "BAIXO";
}

function parseGeminiJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Resposta da IA nao retornou um objeto JSON.");
  }
  return parsed as Record<string, unknown>;
}

export function isAIEnrichmentConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function processEmpenhoWithAI(historico: string, credor: string): Promise<AIProcessingResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY nao configurada.");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const categories = listCategories();
  const prompt = `
Analise o seguinte empenho de despesa publica municipal de Itanhandu.

Credor: ${truncateText(credor, 180)}
Historico da despesa: "${truncateText(historico, 1800)}"

Classifique a categoria principal usando exatamente uma destas opcoes: ${categories.join(", ")}.
Estime qual secretaria municipal provavelmente solicitou o gasto.
Faca uma breve analise critica dizendo se o historico e claro ou se omite detalhes importantes sobre o que foi comprado.
Responda em JSON conforme o schema solicitado.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              categoria: { type: "STRING", enum: categories },
              secretariaEstimada: { type: "STRING" },
              analiseCritica: { type: "STRING" },
              grauDeClareza: { type: "STRING", enum: ["ALTO", "MEDIO", "BAIXO"] }
            },
            required: ["categoria", "secretariaEstimada", "analiseCritica", "grauDeClareza"]
          }
        }
      })
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Gemini retornou HTTP ${response.status}: ${truncateText(details, 240)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const textResponse = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!textResponse) throw new Error("Gemini nao retornou texto analisavel.");

  const parsed = parseGeminiJson(textResponse);
  const categoria = String(parsed.categoria ?? "Outros");

  return {
    categoria: categories.includes(categoria) ? categoria : "Outros",
    secretariaEstimada: truncateText(String(parsed.secretariaEstimada ?? ""), 160) || "Nao estimada",
    analiseCritica: truncateText(String(parsed.analiseCritica ?? ""), 1200),
    grauDeClareza: normalizeClarity(parsed.grauDeClareza)
  };
}
