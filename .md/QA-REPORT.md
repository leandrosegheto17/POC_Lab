# QA-REPORT

## TP-0001 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0002: `pnpm typecheck` global vermelho por arquivos de outras tarefas e falta de `allowImportingTsExtensions`); ambiente.test.ts passa (node:sqlite em memória, Node 24) e config/.gitignore/.env.example conferem.

## TP-0006 — QA — 2026-10-08
APROVADA — 7/7 testes passando, aceite atendido (união v1 + tipos do modelo comum, sem I/O), 0 achados críticos e 0 não críticos.

## TP-0012 — QA — 2026-10-08
APROVADA — 8/8 testes passam, critério de aceite atendido (função pura, filtro por data, determinismo, sem node:*), 0 achados críticos e 0 não críticos.

## TP-0018 — QA — 2026-10-08
APROVADA — 12/12 testes passam, critério de aceite atendido (4 tabelas, UNIQUEs, ON CONFLICT DO NOTHING, sem UPDATE/DELETE, SQL parametrizado); 0 achados.

## TP-0023 — QA — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; gerador.test.ts 32/32, PRNG mulberry32 próprio, determinismo e formato de CSV/gabarito confirmados.

## TP-0029 — QA — 2026-10-08
APROVADA, 0 críticos e 0 não críticos; 20/20 testes de contrato passando (parametros, erro, codigo, paginacao), zod 4 e sem node:* conferidos.

## TP-0033 — QA — 2026-10-08
APROVADA — 0 achados críticos, 0 não críticos; 11 testes da TP-0033 passando (20/20 no arquivo), aceite do bloco de entregas no prazo e do bloco de divergências por tipo cumprido, função pura (G-02).

## TP-0040 — QA — 2026-10-08
APROVADA — 8/8 testes OK, colunas batem com o DDL, limite de 100 KB, escape de aspas, NULL, determinismo e ida e volta no node:sqlite validados; 0 achados críticos e 0 não críticos.

## TP-0046 — QA — 2026-10-08
APROVADA — 3/3 testes passando, aceite cumprido; 0 críticos, 1 não crítico (falta asserção de Cache-Control no teste, RTP-0004).

## TP-0051 — QA — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; contraste.test.ts 27/27, tokens/fontes woff2 locais/OFL/base.css conferem com UX-SPEC §3 (desvio de borda de controle aceito pelo usuário).

## TP-0055 — QA — 2026-10-08
APROVADA — 31/31 testes de casca passam, aceite atendido (visual responsivo só por CSS/estrutura); 0 críticos, 1 não crítico (URL placeholder do link "Como foi feito") -> RTP-0003.

## TP-0058 — QA — 2026-10-08
APROVADA — 13/13 testes passando, axe sem violação, 0 achados críticos e 0 não críticos; desvios de ✓/layout cobertos por decisão do usuário no UX-SPEC (A4).

## TP-0061 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0005: "fora de ordem" vs "chegou fora de ordem" e valor PC sem mono); 17/17 testes e axe sem violação.

## TP-0065 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; script/config/_headers conferem e o link publicado responde 200/404/405 com os cabeçalhos esperados; T1-T4 visual pendente do autor.

## TP-0068 — QA — 2026-10-08
APROVADA — 20/20 testes passando, bloco com fórmula/soma/contagem/média e denominadores corretos; 0 achados.

## TP-0072 — QA — 2026-10-08
APROVADA — 10/10 testes e axe sem violação, aceite cumprido; 0 críticos, 0 não críticos (obs.: contorno/Tab sem teste automatizado, verificados por leitura).

## TP-0074 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0001: erros de typecheck em evento.test.ts); vitest evento 7/7, v2 aditiva e lista mista v1/v2 dá a mesma quitação.

## TP-0079 — QA — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; 12/12 testes de repositorio.test.ts verdes, cache_ia aditiva e idempotente conforme aceite.
