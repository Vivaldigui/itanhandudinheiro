# Modelo de dados

## Tabelas genéricas

- `FonteDadosPublicos`: descreve a origem pública e o módulo responsável.
- `DocumentoOrigem`: guarda PDF ou outro documento original, caminho, hash SHA256, período e metadados.
- `ProcessamentoLog`: registra execução de parser e ingestão por documento.

## Tabelas do MVP de Empenhos

- `Empenho`: dados orçamentários, financeiros, histórico, processo de compra, categoria, status, risco e alertas.
- `Credor`: normalização de nomes de credores.
- `ProcessoCompra`: chave futura para cruzar empenhos, licitações e contratos.
- `DocumentoPagamento`: documentos e notas fiscais extraídos quando aparecem no PDF.
- `AlertaFiscalizacao`: pontos de atenção vinculados ao empenho.
- `SyncLog`: log operacional dos jobs.

`Empenho` se relaciona com `DocumentoOrigem`, não com uma tabela exclusiva de PDF. Isso permite que outros módulos usem o mesmo padrão de ingestão no futuro.

