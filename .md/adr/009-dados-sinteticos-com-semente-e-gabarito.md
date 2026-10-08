# ADR-009 — Dados sintéticos com semente e gabarito

- Status: Aceito
- Data: 2026-10-07

## Contexto
Pagamentos e rastreio não existem: precisam ser gerados a partir dos pedidos de vendas, com problemas plantados que o app deve achar (M1), sem que as regras sejam escritas para "passar no gabarito".

## Alternativas consideradas
1. CSVs escritos à mão, versionados no repositório.
2. Gerador aleatório sem semente.
3. Gerador com PRNG de semente fixa (mulberry32, implementado no projeto), gabarito separado lido só pelos testes.

## Decisão e motivo
Alternativa 3. Mesma semente produz arquivos idênticos byte a byte (RF-01); as proporções de cada problema ficam como constantes nomeadas e documentadas; os casos plantados são sorteados só entre pedidos "limpos", para não colidir com divergências naturais. O gabarito nunca é importado pelo app (RN-13), regra verificada por lint e por teste.

## Consequências
- CSVs e gabarito não vão para o git; são regenerados por `pnpm preparar`.
- O teste de M1 compara a lista de divergências com o gabarito: 100% dos plantados, 0 falso positivo nos pedidos do gabarito.

## O que deliberadamente não foi feito
Bibliotecas de dados falsos e distribuição estatística "realista": regras explícitas são mais explicáveis.
