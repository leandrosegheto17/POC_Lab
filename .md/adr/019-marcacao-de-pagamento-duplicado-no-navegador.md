# ADR-019 — Marcação de pagamento duplicado (RN-03) no navegador, ao lado do estado em uma data

- Status: Aceito
- Data: 2026-10-09
- Complementa: ADR-013, ADR-016
- Origem: BK-0004 (achado 2 do ARCH-REVIEW de 2026-10-08)

## Contexto
O SDD só permitia ao navegador calcular uma regra: o estado do pedido em uma data (RF-06). Na tela T2, `DetalheLinhaDoTempo.tsx` também chama `detectarDuplicado` do domínio para marcar quais pagamentos do pedido são os repetidos. A resposta v1 da API não pode ganhar campo (G-21), e `pedido.divergencias` traz só `tipo` e `motivo`, sem dizer quais pagamentos.

## Alternativas consideradas
- a) Expor a marcação na API (`/api/v2` ou recurso novo). Regra só no processamento, mas a T2 deixa de ser a consumidora da v1 que prova o RF-09; mexe em contrato, Worker, zod, testes e tela.
- b) **Registrar a exceção no SDD** e manter a função pura do domínio no navegador.
- c) Campo opcional na v1. Quebra o G-21.

## Decisão e motivo
Opção **b**. O navegador pode chamar `detectarDuplicado` (a mesma função do domínio, sem cópia) **só para escolher quais pagamentos marcar**, dentro de um pedido que o processamento já declarou com a divergência `duplicado`. Quem declara a divergência continua sendo o processamento; o navegador nunca decide se há divergência, nem altera estado, saldo ou indicador. Não muda código nem contrato; a v1 fica intacta.

## Consequências
- A regra do RN-03 tem dois pontos de execução (processamento e navegador), com o mesmo código do `dominio`.
- Teste: sem a divergência `duplicado` vinda da API, a tela não marca nada.
- **Condição de saída:** se a T2 ganhar uma versão v2 da API, a marcação passa a vir da API e esta exceção deixa de valer (novo ADR que substitui este).

## O que deliberadamente não foi feito
Campo novo na v1, recurso novo só para a marcação e migração da T2 para a v2 agora.
