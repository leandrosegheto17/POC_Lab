# ADR-005 — Um adaptador por fonte (quando não abstrair)

- Status: Aceito
- Data: 2026-10-07

## Contexto
Há 3 fontes conhecidas, de formatos diferentes (base SQLite, 2 CSV). O formato de cada uma não pode vazar para o domínio.

## Alternativas consideradas
1. Framework genérico de fontes (interface `Fonte`, registro de plugins, mapeamento configurável por arquivo).
2. Um módulo pequeno por fonte, com função própria que devolve o modelo comum; o caso de uso chama os 3 explicitamente.

## Decisão e motivo
Alternativa 2. Três implementações não justificam uma abstração: cada fonte tem regra própria (formatos de data, normalização de referência, ordem de chegada). O isolamento vem do tipo de saída comum (vínculos, eventos, achados), não de uma interface genérica.

## Consequências
- Adicionar uma 4ª fonte = um módulo novo + uma linha no caso de uso.
- Se surgir a 4ª e a 5ª fonte com o mesmo formato, aí sim extrair a abstração, com exemplos reais.

## O que deliberadamente não foi feito
Registro de plugins, mapeamento de colunas por configuração e detecção automática de formato.
