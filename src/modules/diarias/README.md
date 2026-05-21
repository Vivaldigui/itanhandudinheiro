# Módulo de Diárias

Nesta etapa, diárias não têm crawler próprio. A tela `/diarias` é uma análise derivada dos empenhos processados.

O módulo procura termos como diária, viagem, hospedagem, passagem, deslocamento, estadia, ressarcimento e taxa de inscrição nos históricos dos empenhos. Cada item encontrado mantém link para o empenho original.

Quando houver uma fonte pública específica para diárias, este módulo poderá ganhar:

- crawler público, sem login ou bypass;
- armazenamento do documento original em `DocumentoOrigem`;
- parser testável;
- normalização;
- alertas tratados como pontos de atenção;
- mascaramento de dados sensíveis quando aplicável.
