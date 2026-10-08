# ADR-006 — Versionamento aditivo do contrato de evento

- Status: Aceito
- Data: 2026-10-07

## Contexto
O contrato do evento vai evoluir. Um consumidor escrito para a v1 deve continuar funcionando quando a v2 aparecer (RF-09).

## Alternativas consideradas
1. Sem versão: muda o formato e migra tudo.
2. Versão em cada evento (`versao_schema`) e evolução só aditiva; mudança incompatível vira novo tipo de evento.
3. Versão + *upcasters* que convertem v1 em v2 na leitura.

## Decisão e motivo
Alternativa 2. Caso concreto: `pagamento` v2 adiciona `meio_pagamento`; o consumidor de saldo (v1) lê só `valor` e não muda. Um teste prova: o mesmo consumidor sobre uma mistura de v1 e v2 dá o mesmo saldo. É a regra mais simples que garante compatibilidade.

## Consequências
- Campos nunca são removidos nem renomeados dentro do mesmo tipo.
- Os tipos TypeScript são uma união discriminada por `tipo` e `versao_schema`.

## O que deliberadamente não foi feito
*Upcasters* e registro de schemas: só haveria uma mudança, e aditiva.
