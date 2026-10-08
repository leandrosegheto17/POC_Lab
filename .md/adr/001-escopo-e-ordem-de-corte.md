# ADR-001 — Escopo e ordem de corte

- Status: Aceito
- Data: 2026-10-07
- Tipo: decisão de negócio

## Contexto
A POC_Lab tem 1 dia de prazo e uma pessoa. O avaliador valoriza decisão rastreável mais que quantidade de funcionalidade. São 9 itens aprovados, de pesos diferentes.

## Alternativas consideradas
1. Construir tudo em profundidade parcial, em paralelo.
2. Priorizar por MoSCoW, com ordem de corte explícita e registro do que saiu.
3. Cortar a priori os Should e o Could.

## Decisão e motivo
Alternativa 2. Ordem de implementação: todos os Must (prontos, testados e publicados) → indicadores complementares → estado em uma data → contrato v2 → IA. Ordem de corte é a inversa. Mostra julgamento: o que entrega valor primeiro e o que pode esperar, com o porquê.

## Consequências
- O link público existe cedo, só com Must.
- Cada item não entregue vira uma entrada no README com o motivo.

## O que deliberadamente não foi feito
Microsserviços, mensageria, autenticação, front elaborado, tempo real, abstração para "qualquer fonte", escrita pela interface e IA decidindo sozinha (ver PRD §4).
