-- CreateTable
CREATE TABLE IF NOT EXISTS "Licitacao" (
    "id" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "anoProcesso" INTEGER NOT NULL,
    "modalidade" TEXT,
    "modalidadeCodigo" TEXT,
    "numeroModalidade" TEXT,
    "anoModalidade" INTEGER,
    "abertura" TIMESTAMP(3),
    "devolucao" TIMESTAMP(3),
    "publicacao" TIMESTAMP(3),
    "situacao" TEXT,
    "objeto" TEXT,
    "criterio" TEXT,
    "tipo" TEXT,
    "localRealizacao" TEXT,
    "prazoEntrega" TEXT,
    "prazoExecucao" TEXT,
    "dataSituacao" TIMESTAMP(3),
    "justificativa" TEXT,
    "valorTotal" DECIMAL(16,2),
    "rawJson" JSONB,
    "documentoOrigemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LicitacaoFornecedor" (
    "id" TEXT NOT NULL,
    "licitacaoId" TEXT NOT NULL,
    "credorId" TEXT,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "resultado" TEXT,
    "contrato" TEXT,
    "ata" TEXT,
    "valor" DECIMAL(16,2),
    "origem" TEXT NOT NULL DEFAULT 'PORTAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicitacaoFornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LicitacaoEmpenho" (
    "id" TEXT NOT NULL,
    "licitacaoId" TEXT NOT NULL,
    "empenhoId" TEXT NOT NULL,
    "tipoRelacao" TEXT NOT NULL DEFAULT 'PROCESSO_LICITATORIO',
    "confianca" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicitacaoEmpenho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Licitacao_numeroProcesso_key" ON "Licitacao"("numeroProcesso");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Licitacao_anoProcesso_idx" ON "Licitacao"("anoProcesso");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Licitacao_modalidade_idx" ON "Licitacao"("modalidade");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Licitacao_situacao_idx" ON "Licitacao"("situacao");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Licitacao_publicacao_idx" ON "Licitacao"("publicacao");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LicitacaoFornecedor_licitacaoId_nome_documento_contrato_ata_key" ON "LicitacaoFornecedor"("licitacaoId", "nome", "documento", "contrato", "ata");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicitacaoFornecedor_credorId_idx" ON "LicitacaoFornecedor"("credorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicitacaoFornecedor_nome_idx" ON "LicitacaoFornecedor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LicitacaoEmpenho_licitacaoId_empenhoId_key" ON "LicitacaoEmpenho"("licitacaoId", "empenhoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicitacaoEmpenho_empenhoId_idx" ON "LicitacaoEmpenho"("empenhoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicitacaoEmpenho_tipoRelacao_idx" ON "LicitacaoEmpenho"("tipoRelacao");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Licitacao" ADD CONSTRAINT "Licitacao_documentoOrigemId_fkey" FOREIGN KEY ("documentoOrigemId") REFERENCES "DocumentoOrigem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "LicitacaoFornecedor" ADD CONSTRAINT "LicitacaoFornecedor_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "Licitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "LicitacaoFornecedor" ADD CONSTRAINT "LicitacaoFornecedor_credorId_fkey" FOREIGN KEY ("credorId") REFERENCES "Credor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "LicitacaoEmpenho" ADD CONSTRAINT "LicitacaoEmpenho_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "Licitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "LicitacaoEmpenho" ADD CONSTRAINT "LicitacaoEmpenho_empenhoId_fkey" FOREIGN KEY ("empenhoId") REFERENCES "Empenho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
