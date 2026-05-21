# Deploy do banco de dados

## Banco recomendado

Use PostgreSQL, não NoSQL.

Motivo: o app cruza empenhos, credores, processos de compra, documentos de pagamento, documentos originais, logs e alertas. Esse tipo de dado precisa de relacionamento, integridade, filtros por período e agregações. PostgreSQL resolve isso bem e ainda permite `JSONB` para metadados flexíveis.

## Local com Docker

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

String local padrão:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/itanhandu_transparencia?schema=public
```

## Produção

1. Crie um banco PostgreSQL em um provedor de sua escolha.
2. Copie a string de conexão para `DATABASE_URL`.
3. Configure as demais variáveis do `.env.example`.
4. Rode as migrações:

```bash
npx prisma generate
npx prisma migrate deploy
```

5. Inicie o app:

```bash
npm run build
npm run start
```

6. Rode o histórico:

```bash
npm run sync:historico
```

7. Ative o worker diário:

```bash
npm run sync:portal
```

## Dados originais

Mesmo com banco, mantenha os PDFs originais. Eles ficam em:

`data/raw-pdfs/{ano}/{mes}/analitico-empenhos-{ano}-{mes}.pdf`

Em produção, monte esse diretório em volume persistente ou armazenamento de arquivos. O banco guarda o caminho e o hash SHA256.

## Atualização futura

O app compara o hash SHA256 do PDF. Se o Portal publicar um mês novo ou alterar um PDF anterior, o documento é baixado, reprocessado e substitui os registros daquele documento de origem. Se o hash for igual, nada é duplicado.
