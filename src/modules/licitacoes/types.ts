export type LicitacaoFornecedorFonte = {
  nome: string;
  documento?: string | null;
  resultado?: string | null;
  contrato?: string | null;
  ata?: string | null;
  valor?: number | null;
  origem?: string;
};

export type PortalLicitacao = {
  numeroProcesso: string;
  anoProcesso: number;
  modalidade?: string | null;
  modalidadeCodigo?: string | null;
  numeroModalidade?: string | null;
  anoModalidade?: number | null;
  abertura?: Date | null;
  devolucao?: Date | null;
  publicacao?: Date | null;
  situacao?: string | null;
  objeto?: string | null;
  criterio?: string | null;
  tipo?: string | null;
  localRealizacao?: string | null;
  prazoEntrega?: string | null;
  prazoExecucao?: string | null;
  dataSituacao?: Date | null;
  justificativa?: string | null;
  valorTotal?: number | null;
  fornecedores?: LicitacaoFornecedorFonte[];
  rawJson?: Record<string, unknown>;
};

export type SyncLicitacoesYearResult = {
  ano: number;
  status: "PROCESSADO" | "ERRO";
  hashSha256?: string;
  totalLicitacoes: number;
  totalEmpenhosRelacionados: number;
  totalFornecedoresRelacionados: number;
  mensagem?: string;
};
