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

## TP-0002 — QA — 2026-10-08
DEVOLVIDA — 2 críticos (web/src->web/worker relativo não barrado; lint sem ignore de `.claude/` e longe de verde: 672 problemas), 1 não crítico (RTP-0011: react/no-danger não cobre componente customizado); 12 das 13 proibições verificadas via eslint --stdin.

## TP-0007 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (nome do teste fora de `validação: ordenação` -> RTP-0006); vitest 7/7 PASS.

## TP-0013 — QA — 2026-10-08
APROVADA — 5/5 testes passam, aceite RN-08 atendido (por fonte, `fora_de_ordem` fora de Divergencia, marca por evento); 0 críticos, 0 não críticos.

## TP-0019 — QA — 2026-10-08
APROVADA — 7/7 testes e contagens reais confirmadas (16.282/609.283/830/15.452/21), somente leitura comprovado; 0 críticos, 1 não crítico (teste fraco, RTP-0007).

## TP-0024 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (transportadora com código cru em vez de `Transportadora N` -> RTP-0008); gerador.test.ts 32/32.

## TP-0030 — QA — 2026-10-08
APROVADA; 19/19 testes de `respostas-v1` passam, aceite coberto (cartões, divergências paginadas, linha do tempo v1 sem versao_schema com chegouForaDeOrdem, descarte de meio_pagamento); 0 críticos, 0 não críticos.

## TP-0034 — QA — 2026-10-08
APROVADA — 8/8 testes do totais passando, aceite (contagens, valor em aberto, pago a mais, entregas no prazo, arredondamento no fim, bloco com fórmula/numerador/denominador) cumprido; 0 achados; domínio puro sem I/O.

## TP-0041 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0010, typecheck do web falha por tsconfig sem tipos Cloudflare); teste esqueleto 1/1, build verde, `vite dev` serve site (200) e API (404 JSON) num processo.

## TP-0047 — QA — 2026-10-08
APROVADA — 6/6 testes passando, aceite (validação, bind, ordem L-11, paginação, página além da última, 400) cumprido; 0 críticos, 0 não críticos.

## TP-0052 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0012: 5xx sem corpo RFC 9457 vira "formato inesperado"); 15/15 testes passando.

## TP-0056 — QA — 2026-10-08
APROVADA; 0 críticos/0 não críticos; 10/10 testes de faixa-resumo, fetch único via contexto, estados carregando/erro silenciosos, axe limpo.

## TP-0059 — QA — 2026-10-08
APROVADA — 14/14 testes verdes, aceite atendido (consulta/filtro/tabela/caption/4 estados/400/axe), 0 achados críticos e 0 não críticos.

## TP-0062 — QA — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; pedido.test.tsx 19/19 passando (axe ok); aceite cumprido conforme UX-SPEC T2 revisado (texto "presente em N de 3 sistemas"), 404/400 como vazio anunciado.

## TP-0066 — QA — 2026-10-08
DEVOLVIDA — 1 crítico, 0 não críticos; README e links de ADR ok, mas `pnpm dev` na raiz falha (`Command "dev" not found`: falta script `dev` no package.json raiz), quebrando o aceite "3 comandos".

## TP-0069 — QA — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; 20/20 testes em indicadores.test.ts, bloco total + 4 situações com fórmula/numerador/denominador, null com denominador 0 e RN-11 coberta por teste negativo.

## TP-0073 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0013: eventos do próprio dia excluídos do estado); 7/7 testes de estado-em-data, fetch=1, axe ok.

## TP-0075 — QA — 2026-10-08
APROVADA — 44/44 testes da tarefa + repositorio 12/12 verdes; 0 críticos, 0 não críticos; gerador determinístico (PRNG) e adaptador v1/v2 conforme aceite, versão real propagada ao armazenamento.

## TP-0080 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (RTP-0009, tolerância 0,01 sensível a ponto flutuante); 8/8 testes de conferencia-sugestao passam.

## TP-0008 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; valores.test.ts 10/10 e RN-01 conferida no código (arredondamento só no fim, sem frete).

## TP-0014 — QA — 2026-10-08
APROVADA — 5/5 testes passam, aceite RN-03 atendido, 0 achados críticos / 0 não críticos.

## TP-0020 — QA — 2026-10-08
APROVADA; 7/7 testes passam, aceite cumprido (vínculo, evento venda v1, Transportadora N estável, 3 tipos de achado), 0 achados.

## TP-0025 — QA — 2026-10-08
APROVADA, 0 críticos/0 não críticos; 32/32 testes do gerador passando, 8 casos de pagamento com gabarito, disjuntos e determinísticos.

## TP-0031 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (erro de tipo TS nos casos negativos do teste, linhas 321/333); 19/19 testes passam e esquemas conformes ao aceite; RTP-0016.

## TP-0035 — QA — 2026-10-08
APROVADA — 6/6 testes de publicacao/pedidos passam, aceite (resumo, vínculos normalizados, colisão com erro, determinismo, sem nomes da base) atendido; 0 críticos, 0 não críticos.

## TP-0042 — QA — 2026-10-08
APROVADA - 7/7 testes de erros/cabeçalhos passam; 404/405(Allow)/400/500 e cabeçalhos de segurança/cache sem CORS conforme o aceite; 0 críticos, 0 não críticos.

## TP-0048 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (falta teste de rota com `%` e `;` do aceite); 7/7 testes passando; RTP-0014.

## TP-0053 — QA — 2026-10-08
DEVOLVIDA — 1 crítico (foco não devolvido à região no "Tentar de novo", desativado no código e sem teste de `toHaveFocus`), 0 não críticos; 15/15 testes passam, axe limpo.

## TP-0057 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (falta teste axe de CampoBusca dentro da Casca; RTP-0018); 12/12 testes `busca` passando, aceite RF-05/I-07 atendido.

## TP-0060 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (foco no caption e anúncio "50 de N, página X de Y" desativados/alterados); 12/12 testes passando; RTP-0015.

## TP-0063 — QA — 2026-10-08
APROVADA — 25/25 testes ok, 0 críticos, 1 não crítico (link de divergência sem validação contra enumeração de tipos); RTP-0017.

## TP-0067 — QA — 2026-10-08
APROVADA, 0 críticos e 0 não críticos; README (API, erro, paginação, versão, desligar, alerta) e AVISO-DE-LICENCA conferem com o worker real e G-11/G-01; sem RTP.

## TP-0070 — QA — 2026-10-08
APROVADA — 0 críticos/0 não críticos; 2 blocos novos na lista do documento indicadores em ordem fixa, esquema v1 intacto, documentos/integracao (59 testes) e contrato TP-0049 (3) verdes.

## TP-0076 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; 23/23 testes (v2 + v1) passam, v1 intocada (G-21), sem passthrough.

## TP-0081 — QA — 2026-10-08
APROVADA — 8/8 testes do `sugerir` verdes, aceite (L-03, cache SHA-256, teto, sem provedor, RN-11) atendido; 0 críticos, 0 não críticos.
