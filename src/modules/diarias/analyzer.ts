import type { EmpenhoFilters, PlainEmpenho, RiskLevel } from "@/modules/empenhos/types";

export type DiariaItem = {
  id: string;
  empenhoId: string;
  numeroEmpenho: string;
  dataEmpenho?: Date | null;
  dataEmpenhoIso?: string | null;
  ano: number;
  mes: number;
  credor: string;
  beneficiario: string;
  destino: string;
  tipoDespesa: string;
  secretariaEstimada?: string | null;
  valor: number;
  historico: string;
  processoCompra?: string | null;
  status: PlainEmpenho["status"];
  riskLevel: RiskLevel;
  alertas: PlainEmpenho["alertas"];
};

export type DiariasSummary = {
  totals: {
    valorTotal: number;
    quantidade: number;
    quantidadeCredores: number;
    quantidadeDestinos: number;
    empenhosComAlerta: number;
    maiorDespesa: DiariaItem | null;
  };
  porMes: Array<{ mes: string; valor: number; quantidade: number }>;
  topCredores: Array<{ name: string; value: number; count: number }>;
  topDestinos: Array<{ name: string; value: number; count: number }>;
  porSecretaria: Array<{ name: string; value: number; count: number }>;
  porTipo: Array<{ name: string; value: number; count: number }>;
};

const diariaPatterns = [
  /\bdi[aá]rias?\b/i,
  /\bviagem\b/i,
  /\bdeslocamento\b/i,
  /\bhospedagem\b/i,
  /\bpassagens?\b/i,
  /\bestadia\b/i,
  /\badiantamento\b/i,
  /\bressarcimento\b/i,
  /\balimenta[cç][aã]o\s+(?:em|durante)\s+viagem\b/i,
  /\btaxa\s+de\s+inscri[cç][aã]o\b/i
];

function clean(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function textOf(empenho: PlainEmpenho): string {
  return [
    empenho.historicoMascarado,
    empenho.historico,
    empenho.credor,
    empenho.processoCompra,
    empenho.modalidadeLicitacao,
    empenho.secretariaEstimada
  ]
    .filter(Boolean)
    .join(" ");
}

export function isDiariaEmpenho(empenho: PlainEmpenho): boolean {
  const text = textOf(empenho);
  if (!text) return false;
  return diariaPatterns.some((pattern) => pattern.test(text));
}

function extractWithPatterns(text: string, patterns: RegExp[], fallback: string): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = clean(match?.[1]);
    if (value && value.length >= 3) return value.replace(/[.;,]$/, "");
  }
  return fallback;
}

export function extractDestino(text: string): string {
  return extractWithPatterns(
    text,
    [
      /(?:destino|cidade|munic[ií]pio)\s*[:\-]\s*([A-ZÁ-Ú][A-ZÁ-Úa-zá-ú\s./-]{2,80})/i,
      /(?:viagem|deslocamento|passagem)\s+(?:a|ao|para|at[eé])\s+([A-ZÁ-Ú][A-ZÁ-Úa-zá-ú\s./-]{2,80}?)(?=,|\.|;|\s+(?:com|para|referente|conforme|no|na)\b|$)/i,
      /(?:em|na cidade de|no munic[ií]pio de)\s+([A-ZÁ-Ú][A-ZÁ-Úa-zá-ú\s./-]{2,60}?)(?=,|\.|;|$)/i
    ],
    "Nao identificado"
  );
}

export function extractBeneficiario(text: string, credor: string): string {
  const beneficiario = extractWithPatterns(
    text,
    [
      /(?:servidor(?:a)?|funcion[aá]rio(?:a)?|agente|motorista|secret[aá]rio(?:a)?|benefici[aá]rio(?:a)?)\s*[:\-]\s*([A-ZÁ-Ú][A-ZÁ-Úa-zá-ú\s]{3,80})/i,
      /(?:ao|a)\s+(?:servidor(?:a)?|funcion[aá]rio(?:a)?|motorista)\s+([A-ZÁ-Ú][A-ZÁ-Úa-zá-ú\s]{3,80})/i
    ],
    ""
  );
  return beneficiario || credor;
}

export function classifyTipoDespesa(text: string): string {
  if (/\bdi[aá]rias?\b/i.test(text)) return "Diaria";
  if (/\bhospedagem|estadia\b/i.test(text)) return "Hospedagem";
  if (/\bpassagens?\b/i.test(text)) return "Passagem";
  if (/\bdeslocamento|transporte|taxi|uber\b/i.test(text)) return "Deslocamento";
  if (/\btaxa\s+de\s+inscri[cç][aã]o\b/i.test(text)) return "Inscricao / evento";
  return "Outras despesas de viagem";
}

export function buildDiariaItem(empenho: PlainEmpenho): DiariaItem {
  const text = clean(textOf(empenho));
  return {
    id: `diaria-${empenho.id}`,
    empenhoId: empenho.id,
    numeroEmpenho: empenho.numeroEmpenho,
    dataEmpenho: empenho.dataEmpenho,
    dataEmpenhoIso: empenho.dataEmpenhoIso,
    ano: empenho.ano,
    mes: empenho.mes,
    credor: empenho.credor,
    beneficiario: extractBeneficiario(text, empenho.credor),
    destino: extractDestino(text),
    tipoDespesa: classifyTipoDespesa(text),
    secretariaEstimada: empenho.secretariaEstimada,
    valor: empenho.valorPago > 0 ? empenho.valorPago : empenho.valorEmpenhado,
    historico: clean(empenho.historicoMascarado ?? empenho.historico),
    processoCompra: empenho.processoCompra,
    status: empenho.status,
    riskLevel: empenho.riskLevel,
    alertas: empenho.alertas
  };
}

function addToMap(map: Map<string, { value: number; count: number }>, key: string, value: number) {
  const current = map.get(key) ?? { value: 0, count: 0 };
  map.set(key, { value: current.value + value, count: current.count + 1 });
}

function monthLabel(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

export function summarizeDiarias(items: DiariaItem[]): DiariasSummary {
  const monthly = new Map<string, { mes: string; valor: number; quantidade: number }>();
  const credores = new Map<string, { value: number; count: number }>();
  const destinos = new Map<string, { value: number; count: number }>();
  const secretarias = new Map<string, { value: number; count: number }>();
  const tipos = new Map<string, { value: number; count: number }>();

  for (const item of items) {
    const key = `${item.ano}-${String(item.mes).padStart(2, "0")}`;
    const row = monthly.get(key) ?? { mes: monthLabel(item.ano, item.mes), valor: 0, quantidade: 0 };
    row.valor += item.valor;
    row.quantidade += 1;
    monthly.set(key, row);
    addToMap(credores, item.credor, item.valor);
    addToMap(destinos, item.destino, item.valor);
    addToMap(secretarias, item.secretariaEstimada ?? "Nao estimada", item.valor);
    addToMap(tipos, item.tipoDespesa, item.valor);
  }

  const top = (map: Map<string, { value: number; count: number }>, limit = 10) =>
    [...map.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  return {
    totals: {
      valorTotal: items.reduce((sum, item) => sum + item.valor, 0),
      quantidade: items.length,
      quantidadeCredores: new Set(items.map((item) => item.credor)).size,
      quantidadeDestinos: new Set(items.map((item) => item.destino).filter((destino) => destino !== "Nao identificado")).size,
      empenhosComAlerta: items.filter((item) => item.alertas.length > 0).length,
      maiorDespesa: [...items].sort((a, b) => b.valor - a.valor)[0] ?? null
    },
    porMes: [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, row]) => row),
    topCredores: top(credores),
    topDestinos: top(destinos),
    porSecretaria: top(secretarias),
    porTipo: top(tipos)
  };
}

export function analyzeDiarias(empenhos: PlainEmpenho[]): { items: DiariaItem[]; summary: DiariasSummary } {
  const items = empenhos.filter(isDiariaEmpenho).map(buildDiariaItem);
  return { items, summary: summarizeDiarias(items) };
}

export function applyDiariasFilters(items: DiariaItem[], filters: EmpenhoFilters): DiariaItem[] {
  const busca = filters.busca?.toLocaleLowerCase("pt-BR");
  return items
    .filter((item) => !filters.ano || item.ano === filters.ano)
    .filter((item) => !filters.mes || item.mes === filters.mes)
    .filter((item) => !filters.credor || item.credor.toLocaleLowerCase("pt-BR").includes(filters.credor.toLocaleLowerCase("pt-BR")))
    .filter((item) => !filters.status || filters.status === "todos" || item.status === filters.status)
    .filter((item) => !filters.riskLevel || filters.riskLevel === "todos" || item.riskLevel === filters.riskLevel)
    .filter((item) => !filters.apenasAlertas || item.alertas.length > 0)
    .filter((item) => !busca || `${item.historico} ${item.credor} ${item.beneficiario} ${item.destino} ${item.numeroEmpenho}`.toLocaleLowerCase("pt-BR").includes(busca));
}
