export type RiskLevel = "Baixo" | "Médio" | "Alto" | "Crítico";

export type EmpenhoStatus = "Pago" | "A pagar" | "A liquidar" | "Anulado" | "Parcial";

export type DocumentoPagamentoInput = {
  tipo?: string | null;
  numero?: string | null;
  dataEmissao?: Date | null;
  dataVencimento?: Date | null;
  descricao?: string | null;
  valor: number;
};

export type FiscalizacaoAlert = {
  tipo: string;
  nivel: RiskLevel;
  descricao: string;
  sugestaoFiscalizacao: string;
};

export type FiscalizacaoResumo = {
  resumo: string;
  motivoPontoAtencao: string;
  documentosSolicitar: string[];
  perguntasSugeridas: string[];
  oQueVerificar: string[];
};

export type RawEmpenho = {
  numeroEmpenho?: string | null;
  tipoEmpenho?: string | null;
  dataEmpenho?: string | Date | null;
  ano: number;
  mes: number;
  ficha?: string | null;
  credor?: string | null;
  fonte?: string | null;
  codigoAplicacao?: string | null;
  valorEmpenhado?: string | number | null;
  valorAnulado?: string | number | null;
  valorLiquidado?: string | number | null;
  valorLiquidadoAnulado?: string | number | null;
  valorPago?: string | number | null;
  valorPagoAnulado?: string | number | null;
  valorALiquidar?: string | number | null;
  valorLiquidadoAPagar?: string | number | null;
  valorAPagar?: string | number | null;
  historico?: string | null;
  processoCompra?: string | null;
  modalidadeLicitacao?: string | null;
  processoLicitatorio?: string | null;
  numeroModalidade?: string | null;
  pedidoCompra?: string | null;
  contrato?: string | null;
  aditamento?: string | null;
  gestor?: string | null;
  documentosPagamento?: DocumentoPagamentoInput[];
};

export type NormalizedEmpenho = {
  id?: string;
  numeroEmpenho: string;
  tipoEmpenho?: string | null;
  dataEmpenho?: Date | null;
  ano: number;
  mes: number;
  ficha?: string | null;
  credor: string;
  fonte?: string | null;
  codigoAplicacao?: string | null;
  valorEmpenhado: number;
  valorAnulado: number;
  valorLiquidado: number;
  valorLiquidadoAnulado: number;
  valorPago: number;
  valorPagoAnulado: number;
  valorALiquidar: number;
  valorLiquidadoAPagar: number;
  valorAPagar: number;
  historico?: string | null;
  historicoMascarado?: string | null;
  processoCompra?: string | null;
  modalidadeLicitacao?: string | null;
  processoLicitatorio?: string | null;
  numeroModalidade?: string | null;
  pedidoCompra?: string | null;
  contrato?: string | null;
  aditamento?: string | null;
  gestor?: string | null;
  categoria: string;
  secretariaEstimada?: string | null;
  status: EmpenhoStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  alertas: FiscalizacaoAlert[];
  resumoFiscalizacao?: FiscalizacaoResumo;
  aiAnalise?: string | null;
  clarezaHistorico?: "ALTO" | "MEDIO" | "BAIXO" | null;
  documentosPagamento: DocumentoPagamentoInput[];
};

export type PlainEmpenho = NormalizedEmpenho & {
  id: string;
  dataEmpenhoIso?: string | null;
  documentoOrigemId?: string;
};

export type EmpenhoFilters = {
  ano?: number;
  mes?: number;
  periodoInicio?: string;
  periodoFim?: string;
  categoria?: string;
  secretariaEstimada?: string;
  credor?: string;
  processoCompra?: string;
  modalidade?: string;
  status?: string;
  riskLevel?: string;
  apenasAlertas?: boolean;
  busca?: string;
  sortBy?: "valorEmpenhado" | "dataEmpenho" | "credor" | "riskScore";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type DashboardSummary = {
  totals: {
    valorEmpenhado: number;
    valorLiquidado: number;
    valorPago: number;
    valorALiquidar: number;
    valorAPagar: number;
    quantidadeEmpenhos: number;
    quantidadeCredores: number;
    quantidadeProcessosCompra: number;
    empenhosComAlerta: number;
    maiorEmpenho: PlainEmpenho | null;
  };
  seriesMensal: Array<{
    mes: string;
    valorEmpenhado: number;
    valorLiquidado: number;
    valorPago: number;
    valorALiquidar: number;
    valorAPagar: number;
  }>;
  porCategoria: Array<{ name: string; value: number }>;
  topCredores: Array<{ name: string; value: number; count: number }>;
  topProcessos: Array<{ name: string; value: number; count: number }>;
  porRisco: Array<{ name: RiskLevel; value: number }>;
};
