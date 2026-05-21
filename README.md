# Onde vai o dinheiro de Itanhandu?

Plataforma cidadã para transformar dados públicos do Portal Cidadão da Prefeitura Municipal de Itanhandu em informação clara, pesquisável e fiscalizável.

O produto começa pelos empenhos públicos e já inclui uma visão derivada de diárias, viagens e deslocamentos encontrados nos históricos dos empenhos. A arquitetura continua preparada para receber outros módulos públicos no futuro, como contratos, licitações, obras, receitas, fornecedores, folha, convênios e compras diretas.

## Objetivo

Extrair relatórios públicos de Analítico de Empenhos, preservar os PDFs originais, transformar o conteúdo em dados estruturados e apresentar dashboard, filtros, pontos de atenção, exportações e briefing mensal.

## Fonte dos dados

Origem pública:

`PORTAL_CIDADAO_URL=https://sistema.itanhandu.mg.gov.br/portalcidadao/#7cdbac9d6b970bcac1eb7182601bbdd39ce81c1e7a425f395f02db2441891e65003360a585fa4bc53a4c1109e77abd4737eb89513b9081883439ea9aaabe7971f7b93aa6fdd%C4%B0eaf32705452dbba2ca029ec4158a935811d1311d5f918c6535fab24431121f7375ce97a08ff8160720437142e661473c0dca19c6ee5b54dd5dc04fcdc70c20891f4960b78b05c50aa18f078483309517d0855bb7be16048cdebe52cda38079400fdfdfc95363bbb2281eebe4887ed60f254be621d226c79fe3005569fdaad720a5eda3c862441fe6a445f944ea51f5817582d1bf559dee1967cb6042faaedddaba0ab3431ef361af7acf7f24295b14c375ed0efb8692de05b40195d07ac04391b55974cf4423e3277c84ba6ef6fa4222087e945afa88789e133b2109dcaaa6391df8`

O crawler usa apenas páginas públicas, sem login, senha, captcha bypass ou raspagem agressiva.

## Como rodar localmente

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npx prisma migrate dev
npm run dev
```

Abra `http://localhost:3000`.

No Windows PowerShell, se `npm` estiver bloqueado por política de execução, use `npm.cmd`.

## Banco de dados: SQL ou NoSQL?

Use PostgreSQL. Para este projeto, SQL é a escolha mais segura: empenhos se relacionam com credores, processos de compra, documentos de pagamento, documentos de origem e alertas. Também precisamos de filtros, somas por período, rankings e integridade de dados.

PostgreSQL ainda permite campos `JSON`/`JSONB` para metadados brutos quando necessário. Ou seja: temos relações fortes sem perder flexibilidade.

Veja o guia em `docs/deploy-banco.md`.

## Como baixar histórico

O período inicial configurado é janeiro de 2025 até maio de 2026:

```bash
npm run sync:historico
```

Os PDFs ficam preservados em:

`data/raw-pdfs/{ano}/{mes}/analitico-empenhos-{ano}-{mes}.pdf`

O parser também salva JSON processado em `data/processed-json`.

## Como atualizar automaticamente

Para sincronizar o mês atual:

```bash
npm run sync:mensal
```

Para manter o worker diário:

```bash
npm run sync:portal
```

O Docker Compose cria um serviço `worker` que respeita `CRON_EXPRESSION=0 6 * * *`. A rotina compara SHA256 dos PDFs: se o arquivo for novo ou alterado, reprocessa; se o hash for igual, ignora.

## Como funciona o parser

`src/modules/empenhos/pdfParser.ts` usa `pdf-parse`, separa os blocos de empenhos e trata dois formatos:

- texto com rótulos, útil para testes e variações do relatório;
- layout tabular real do Portal Cidadão, em que as colunas do PDF saem embaralhadas no texto extraído.

Campos extraídos incluem número, data, ficha, credor, fonte, valores, histórico, processo de compra, modalidade, processo licitatório, pedido de compra, gestor e documentos de pagamento/notas fiscais.

## Diárias

A tela `/diarias` não baixa um relatório separado. Ela filtra os empenhos já processados quando o histórico indica diária, viagem, hospedagem, passagem, deslocamento, estadia, ressarcimento ou taxa de inscrição.

Isso permite ver quem mais gastou, destinos citados, tipos de despesa e valores, sempre com link para o empenho original.

## Alertas e LGPD

O motor de risco gera pontos de atenção, nunca acusações. Use termos como conferir processo, verificar documentos e possível necessidade de esclarecimento.

`maskSensitiveData.ts` mascara CPF, RG, telefone, endereço residencial e nomes de pacientes/beneficiários quando o contexto indica saúde, TFD, medicamento, consulta ou assistência social.

## APIs principais

- `GET /api/dashboard/summary`
- `GET /api/empenhos`
- `GET /api/empenhos/:id`
- `GET /api/diarias`
- `GET /api/diarias/summary`
- `GET /api/alertas`
- `POST /api/sync/run`
- `GET /api/sync/status`
- `GET /api/export/csv`
- `GET /api/export/json`
- `GET /api/export/pdf`
- `GET /api/briefing/mensal`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run sync:historico
npm run sync:mensal
npm run sync:portal
npm run prisma:migrate
npm run prisma:studio
```

## Aviso

Os dados usados são públicos. Os pontos de atenção são indicativos para fiscalização e conferência documental. Eles não representam conclusão de irregularidade.
