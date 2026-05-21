-- CreateTable
CREATE TABLE "FonteDadosPublicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "urlOrigem" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "modulo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FonteDadosPublicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoOrigem" (
    "id" TEXT NOT NULL,
    "fonteDadosPublicosId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "dataDownload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusProcessamento" TEXT NOT NULL DEFAULT 'PENDENTE',
    "metadados" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoOrigem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfArquivo" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "dataDownload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusProcessamento" TEXT NOT NULL DEFAULT 'PENDENTE',
    "documentoOrigemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfArquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessamentoLog" (
    "id" TEXT NOT NULL,
    "fonteDadosPublicosId" TEXT NOT NULL,
    "documentoOrigemId" TEXT,
    "modulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "mensagem" TEXT,
    "totalRegistros" INTEGER NOT NULL DEFAULT 0,
    "totalErros" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessamentoLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "nomeNormalizado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoCompra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "modalidade" TEXT,
    "processoLicitatorio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empenho" (
    "id" TEXT NOT NULL,
    "numeroEmpenho" TEXT NOT NULL,
    "tipoEmpenho" TEXT,
    "dataEmpenho" TIMESTAMP(3),
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "ficha" TEXT,
    "credor" TEXT NOT NULL,
    "credorId" TEXT,
    "fonte" TEXT,
    "codigoAplicacao" TEXT,
    "valorEmpenhado" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorAnulado" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorLiquidado" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorLiquidadoAnulado" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorPagoAnulado" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorALiquidar" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorLiquidadoAPagar" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "valorAPagar" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "historico" TEXT,
    "historicoMascarado" TEXT,
    "processoCompra" TEXT,
    "processoCompraId" TEXT,
    "modalidadeLicitacao" TEXT,
    "processoLicitatorio" TEXT,
    "numeroModalidade" TEXT,
    "pedidoCompra" TEXT,
    "contrato" TEXT,
    "aditamento" TEXT,
    "gestor" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'Outros',
    "secretariaEstimada" TEXT,
    "status" TEXT NOT NULL DEFAULT 'A liquidar',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'Baixo',
    "alertas" JSONB,
    "resumoFiscalizacao" JSONB,
    "documentoOrigemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empenho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoPagamento" (
    "id" TEXT NOT NULL,
    "empenhoId" TEXT NOT NULL,
    "tipo" TEXT,
    "numero" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "descricao" TEXT,
    "valor" DECIMAL(16,2) NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaFiscalizacao" (
    "id" TEXT NOT NULL,
    "empenhoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "sugestaoFiscalizacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertaFiscalizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "mensagem" TEXT,
    "ano" INTEGER,
    "mes" INTEGER,
    "totalEmpenhosExtraidos" INTEGER NOT NULL DEFAULT 0,
    "totalErros" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FonteDadosPublicos_tipo_modulo_urlOrigem_key" ON "FonteDadosPublicos"("tipo", "modulo", "urlOrigem");

-- CreateIndex
CREATE INDEX "DocumentoOrigem_ano_mes_idx" ON "DocumentoOrigem"("ano", "mes");

-- CreateIndex
CREATE INDEX "DocumentoOrigem_hashSha256_idx" ON "DocumentoOrigem"("hashSha256");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoOrigem_fonteDadosPublicosId_ano_mes_tipoDocumento_key" ON "DocumentoOrigem"("fonteDadosPublicosId", "ano", "mes", "tipoDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "PdfArquivo_documentoOrigemId_key" ON "PdfArquivo"("documentoOrigemId");

-- CreateIndex
CREATE UNIQUE INDEX "Credor_nomeNormalizado_key" ON "Credor"("nomeNormalizado");

-- CreateIndex
CREATE INDEX "Credor_nome_idx" ON "Credor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessoCompra_numero_key" ON "ProcessoCompra"("numero");

-- CreateIndex
CREATE INDEX "Empenho_ano_mes_idx" ON "Empenho"("ano", "mes");

-- CreateIndex
CREATE INDEX "Empenho_credor_idx" ON "Empenho"("credor");

-- CreateIndex
CREATE INDEX "Empenho_categoria_idx" ON "Empenho"("categoria");

-- CreateIndex
CREATE INDEX "Empenho_riskLevel_idx" ON "Empenho"("riskLevel");

-- CreateIndex
CREATE INDEX "Empenho_status_idx" ON "Empenho"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Empenho_numeroEmpenho_ano_mes_key" ON "Empenho"("numeroEmpenho", "ano", "mes");

-- AddForeignKey
ALTER TABLE "DocumentoOrigem" ADD CONSTRAINT "DocumentoOrigem_fonteDadosPublicosId_fkey" FOREIGN KEY ("fonteDadosPublicosId") REFERENCES "FonteDadosPublicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfArquivo" ADD CONSTRAINT "PdfArquivo_documentoOrigemId_fkey" FOREIGN KEY ("documentoOrigemId") REFERENCES "DocumentoOrigem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessamentoLog" ADD CONSTRAINT "ProcessamentoLog_fonteDadosPublicosId_fkey" FOREIGN KEY ("fonteDadosPublicosId") REFERENCES "FonteDadosPublicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessamentoLog" ADD CONSTRAINT "ProcessamentoLog_documentoOrigemId_fkey" FOREIGN KEY ("documentoOrigemId") REFERENCES "DocumentoOrigem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empenho" ADD CONSTRAINT "Empenho_documentoOrigemId_fkey" FOREIGN KEY ("documentoOrigemId") REFERENCES "DocumentoOrigem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empenho" ADD CONSTRAINT "Empenho_credorId_fkey" FOREIGN KEY ("credorId") REFERENCES "Credor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empenho" ADD CONSTRAINT "Empenho_processoCompraId_fkey" FOREIGN KEY ("processoCompraId") REFERENCES "ProcessoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoPagamento" ADD CONSTRAINT "DocumentoPagamento_empenhoId_fkey" FOREIGN KEY ("empenhoId") REFERENCES "Empenho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaFiscalizacao" ADD CONSTRAINT "AlertaFiscalizacao_empenhoId_fkey" FOREIGN KEY ("empenhoId") REFERENCES "Empenho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
