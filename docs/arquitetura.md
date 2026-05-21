# Arquitetura

O projeto "Onde vai o dinheiro de Itanhandu?" é uma plataforma modular de transparência pública municipal.

## Fontes públicas

A ingestão usa entidades genéricas para permitir novos módulos:

- `FonteDadosPublicos`: cadastro da fonte pública.
- `DocumentoOrigem`: documento preservado com caminho, tipo, mês, ano e SHA256.
- `ProcessamentoLog`: log de execução por fonte e módulo.

O módulo funcional principal é `src/modules/empenhos`. A visão de diárias fica em `src/modules/diarias` e é derivada dos empenhos, sem crawler próprio nesta etapa.

## Fluxo de empenhos

1. Playwright abre a URL pública do Portal Cidadão.
2. O crawler aguarda o iframe do relatório `report-analiticoempenho-ctp`.
3. Os filtros são configurados para PDF, período mensal, ano e mês.
4. O PDF é baixado e salvo em `data/raw-pdfs`.
5. O SHA256 é comparado com o documento já processado.
6. Se houver alteração, o parser extrai os empenhos.
7. Normalização, classificação, LGPD e motor de risco enriquecem os dados.
8. A API alimenta dashboard, tabela, detalhes, exportações e briefing.

## Diárias

Diárias, viagens e deslocamentos são identificados a partir dos campos de empenho. A análise procura termos como diária, viagem, hospedagem, passagem, deslocamento, estadia, ressarcimento e taxa de inscrição.

Essa escolha mantém rastreabilidade: cada item da tela de diárias aponta para o empenho original e seus documentos.

## Banco

PostgreSQL é usado por padrão com Prisma ORM. O modelo relacional é adequado porque há vínculos entre documentos, empenhos, credores, processos de compra, pagamentos e alertas. Campos `Json` ficam disponíveis para metadados e alertas estruturados.

## Módulos futuros

Os diretórios em `src/modules` reservam espaço para licitações, contratos, obras, receitas e fornecedores. Eles podem ganhar crawlers e parsers próprios sem mudar o contrato de `FonteDadosPublicos` e `DocumentoOrigem`.
