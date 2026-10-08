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

## TP-0004 — QA — 2026-10-08
APROVADA — 5/5 testes passam, aceite cumprido (idempotência, falha clara em hash divergente, sem artefato inválido), 0 críticos / 0 não críticos.

## TP-0009 — QA — 2026-10-08
APROVADA com ressalva; 0 críticos, 1 não crítico (fronteira exata R$ 0,01 falha por ponto flutuante: 100 vs [99.99] retorna parcial); 8/8 testes passam; RTP-0019.

## TP-0015 — QA — 2026-10-08
APROVADA — 5/5 testes, aceite RN-04 cumprido, G-02/G-04 ok; 0 críticos, 0 não críticos.

## TP-0021 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (aspas não fechadas abortam o parse inteiro em vez de gerar `linha_invalida`); 10/10 testes passam; RTP-0020.

## TP-0026 — QA — 2026-10-08
APROVADA — 32/32 em gerador.test.ts, 5 casos plantados com tipos exatos no gabarito, disjuntos de TP-0025 e determinísticos; 0 críticos, 0 não críticos.

## TP-0032 — QA — 2026-10-08
APROVADA, 0 críticos/0 não críticos; 7/7 testes verdes, DDL idempotente e consultas por código/pedido/tipo usam índice/PK.

## TP-0036 — QA — 2026-10-08
APROVADA — 5/5 testes passam, aceite cumprido (posição canônica, fora_de_ordem via RN-08, sem-identificação fora, dados como gravados, determinístico); 0 críticos, 0 não críticos.

## TP-0043 — QA — 2026-10-08
APROVADA — 8/8 testes, aceite cumprido, isolamento em web/test confirmado; 0 críticos, 0 não críticos.

## TP-0049 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (teste sem Cache-Control/HEAD 200 na app real, RTP-0022); 3/3 testes passam.

## TP-0054 — QA — 2026-10-08
APROVADA — 0 críticos/0 não críticos; 45/45 testes e axe ok, aceite de tabela, etiquetas e paginação confirmado.

## TP-0064 — QA — 2026-10-08
APROVADA — 21/21 testes de qualidade.test.tsx passando, 0 achados críticos, 0 não críticos; aceite (7 blocos em ordem fixa, contagem 0, IA não utilizada, 4 estados, axe) atendido.

## TP-0071 — QA — 2026-10-08
APROVADA — 25/25 testes de indicadores (axe com 4 seções ok, resultado nulo sem NaN), README sem pendência; 0 críticos, 0 não críticos.

## TP-0082 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (sem timeout no fetch, RTP-0021); 10/10 testes com fetch falso, aceite e G-01/G-09 verificados.

## TP-0005 — QA — 2026-10-08
TP-0005 APROVADA por revisão estática do ci.yml (todos os itens do aceite presentes, 0 críticos, 1 não crítico: execução real verde no GitHub ainda não comprovada; RTP-0023).

## TP-0010 — QA — 2026-10-08
APROVADA — 11/11 testes passando, aceite RN-09 cumprido, 0 achados críticos e 0 não críticos; evidência: vitest referencia.test.ts.

## TP-0016 — QA — 2026-10-08
APROVADA — 8/8 testes, aceite RN-05/RN-14 coberto, 0 críticos / 0 não críticos, função pura sem I/O.

## TP-0022 — QA — 2026-10-08
APROVADA, 0 críticos / 1 não crítico (linha com colunas faltando aborta o parse em vez de virar `linha_invalida`; RTP-0026); 9/9 testes passam.

## TP-0027 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; importar.test.ts 2/2 (idempotência e convergência), sem UPDATE/DELETE, transação com rollback.

## TP-0037 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (falta teste da ordenação secundária por tipo, RTP-0024); 4/4 testes passando, sem risco de segurança.

## TP-0044 — QA — 2026-10-08
APROVADA, 0 críticos e 0 não críticos; integracao/publicacao.test.ts 5/5, wrangler só `--local` com cwd em web, erro propagado com stdout/stderr.

## TP-0050 — QA — 2026-10-08
TP-0050 APROVADA — 3/3 testes OK, aceite (200 validado com 7 achados; ausente → 500) cumprido; 0 críticos, 1 não crítico (teste sem asserção de Cache-Control/HEAD sem corpo); RTP-0025.

## TP-0078 — QA — 2026-10-08
TP-0078 APROVADA; 0 críticos, 0 não críticos; contrato-v1-v2 3/3 e telas v1 (pedido, estado-em-data) 26/26 verdes, README com os 2 curl e sem pendência de v2.

## TP-0083 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (mensagem desatualizada "CLI sugerir ainda não existe" no passo 4 sem chave + ordem não asserida em teste; RTP-0027); evidência: preparar.test.ts 8/8 verde e `pnpm sugerir` sem chave exit 0.

## TP-0011 — QA — 2026-10-08
APROVADA — aceite RN-10 coberto, 15/15 testes passando, 0 críticos/0 não críticos.

## TP-0017 — QA — 2026-10-08
APROVADA — 5/5 testes passam, aceite RN-06 atendido (estrito, sem entrega, motivo com as duas datas); 0 críticos, 0 não críticos.

## TP-0028 — QA — 2026-10-08
APROVADA — 2/2 testes de gabarito passam (100% dos casos plantados, 0 falso positivo, função pura e gabarito só em teste); 0 críticos, 1 não crítico (worker do vitest emite Unhandled Error "onTaskUpdate" e sai com código 1 apesar de passar; RTP-0030).

## TP-0038 — QA — 2026-10-08
APROVADA — 0 críticos, 1 não crítico (testes sem asserção determinística de tipo com 0 e do 830, e pipeline refeito 6 vezes causando Unhandled Error de RPC no vitest); 6/6 testes passam com a base real (formato_data 15.452, pedido_sem_envio 21, 7 tipos, ia vazia); RTP-0031.

## TP-0045 — QA — 2026-10-08
APROVADA — 4/4 testes de TP-0045 passam (pipeline 71–75s, leitura.sql idêntico byte a byte, resumo e tempo impressos); 0 críticos, 1 não crítico (mensagem "sugerir ainda não existe" desatualizada); RTP-0027.

## TP-0084 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (média: chave de cache usa modelo "falso" fixo, sugestões reais da CLI com gpt-4o-mini não aparecem em ia.sugestoes); 24 testes verdes (qualidade-ia, qualidade, documentos); RTP-0028.

## TP-0085 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (README sem menção explícita à IA entregue; RTP-0033); qualidade.test.tsx 21/21 verde, axe ok.

## RTP-0001 — QA — 2026-10-08
APROVADA; 0 críticos/0 não críticos; tsc sem erros em evento.test.ts e vitest 7/7.

## RTP-0002 — QA — 2026-10-08
APROVADA — escopo da RTP-0002 atendido (0 erros nos arquivos dela, noEmit seguro); typecheck global falha por TS2353 on_skip da RTP-0020 (1 não crítico, fora desta tarefa).

## RTP-0003 — QA — 2026-10-08
APROVADA; 0 achados; URL igual ao origin, rel/target/aria-label intactos, casca 31/31 passando.

## RTP-0004 — QA — 2026-10-08
APROVADA, 0 achados; resumo.test.ts afirma Cache-Control public, max-age=60 no 200; 13/13 passando.

## RTP-0005 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; 17/17 testes passando, texto "chegou fora de ordem" e valor mono na linha PC conferidos no diff e nos testes.

## RTP-0006 — QA — 2026-10-08
APROVADA; 0 achados; describe "validação: ordenação" presente (linha 61) e 7/7 testes passando.

## RTP-0007 — QA — 2026-10-08
APROVADA; 0 achados; 7/7 testes passando com a base real, asserções 830/15.452/0 e escrita em conexão somente leitura falhando.

## RTP-0008 — QA — 2026-10-08
RTP-0008 APROVADA; 32 testes do gerador passando, typecheck só com erro de RTP-0020; 0 críticos, 1 não crítico (rastreio.csv versionado não regerado).

## RTP-0009 — QA — 2026-10-08
APROVADA; 0 achados; 9/9 testes passando, bordas 0,01/0,011/0,02 e 0,30 vs 0,31 corretas.

## RTP-0010 — QA — 2026-10-08
APROVADA; aceite cumprido (zero erros de D1Database/TS5097/cloudflare()), esqueleto 1/1 e vite build verde; 0 críticos, 0 não críticos; 111 erros alheios de typecheck fora do escopo.

## RTP-0012 — QA — 2026-10-08
RTP-0012 APROVADA; 14/14 testes passam, 5xx sem RFC 9457 vira mensagem de indisponível, 4xx fora do esquema segue formato inesperado, sem vazamento; troca do teste de 502 legítima; 0 achados.

## RTP-0013 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (teste LinhaDoTempo:323 usa ISO completo na prop AAAA-MM-DD; RTP-0043); 41 testes passando, caso do mesmo dia coberto.

## RTP-0014 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; linha-do-tempo 33/33 passando, 3 casos novos devolvem 400 parametro_invalido com 0 consultas ao D1.

## RTP-0015 — QA — 2026-10-08
RTP-0015 APROVADA; foco no caption e anúncio "N de T divergências, página X de Y" atendidos (27/27 testes); 0 críticos, 1 não crítico (focoPendente não limpa em erro/troca de filtro).

## RTP-0016 — QA — 2026-10-08
APROVADA; 0 críticos e 0 não críticos; 19/19 testes passando, sem erro de tsc em respostas-v1.test.ts e casos negativos ainda rejeitados.

## RTP-0017 — QA — 2026-10-08
APROVADA; 0 achados; 29 testes passando, link só para os 5 tipos conhecidos e texto puro para rótulo desconhecido (tabela e celular).

## RTP-0018 — QA — 2026-10-08
APROVADA; 0 críticos/0 não críticos; busca.test.tsx 14/14 passando, Casca+CampoBusca sem violações axe e role=search único.

## RTP-0019 — QA — 2026-10-08
APROVADA com ressalva - aceite RTP-0019 ok, 140 testes de domínio passando; 0 críticos, 1 não crítico (saldo 0,011 passa a quitado por arredondamento a centavo; RTP-0040).

## RTP-0020 — QA — 2026-10-08
DEVOLVIDA - teste funcional 11/11 e aceite ok, mas 1 crítico (TS2353 on_skip em pagamentos.ts(85) quebra typecheck, regressão da RTP-0002), 0 não críticos.

## RTP-0021 — QA — 2026-10-08
RTP-0021 APROVADA — timeout do provedor de IA devolve null no limite (11/11 testes, fetch falso), 0 achados; typecheck só com erro da RTP-0020.

## RTP-0022 — QA — 2026-10-08
APROVADA; 0 criticos/0 nao criticos; 3 testes de indicadores passando contra a app real (Cache-Control e HEAD 200 sem corpo).

## RTP-0024 — QA — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; 5 testes passando, par parcial+entrega_atrasada justificado por RN-03/RN-05 e exercita a ordenação por tipo.

## RTP-0025 — QA — 2026-10-08
APROVADA, 0 críticos/0 não críticos; 3 testes de worker/qualidade passam com app real (GET Cache-Control e HEAD sem corpo cobertos).

## RTP-0026 — QA — 2026-10-08
APROVADA — teste da tarefa 10/10, aceite RF-03 atendido; typecheck com 1 erro pré-existente em pagamentos.ts (RTP-0020), fora do escopo; 0 achados.

## RTP-0027 — QA — 2026-10-08
APROVADA — mensagem sem chave corrigida e ordem importar->sugerir->publicar-dados asserida; 10/10 testes passando, 0 achados críticos, 0 não críticos.

## RTP-0028 — QA — 2026-10-08
APROVADA, 0 críticos e 1 não crítico (modelo customizado fora da lista não aparece em ia.sugestoes, RTP-0041); 13 testes passando, caso gpt-4o-mini confere conferida/motivo.

## RTP-0030 — QA — 2026-10-08
APROVADA - gabarito (3/3) e qualidade (8/8) com exit 0 e sem Unhandled Error; asserções originais mantidas; 0 achados.

## RTP-0031 — QA — 2026-10-08
APROVADA — 8/8 testes (exit 0, sem Unhandled Error); 7 tipos com contagem 0 e exemplos [] em banco vazio; 830 curtos sem achado e formato_data = 15.452; 0 achados.

## RTP-0032 — QA — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (comentário JSDoc deslocado no teste); 7/7 em publicacao.test.ts, dataCorte = maior momento_fato (2026-01-02T10:00:00Z) = MAX do banco.

## RTP-0033 — QA — 2026-10-08
APROVADA, 0 críticos e 0 não críticos; grep -n -i sugest README.md acha a linha 55 e o texto está em português simples, sem nomes de empresas (G-11).

## RTP-0034 — QA — 2026-10-08
APROVADA, 0 achados; 3 variantes ignoradas e .env.example rastreado.

## RTP-0035 — QA — 2026-10-08
APROVADA; 0 críticos/0 não críticos; persist-credentials: false presente no Checkout (ci.yml:15), sem step que precise de credencial git.

## RTP-0036 — QA — 2026-10-08
RTP-0036 APROVADA; 34 testes passando (valores-fora-do-padrao + pagamentos); 0 achados; troca MAX_VALUE/2 da RTP-0020 não mascara regressão.

## RTP-0037 — QA — 2026-10-08
APROVADA; 0 críticos/0 não críticos; escritor-sql + integração de publicação 21/21 verdes, nenhum chamador passa Date/bigint.

## RTP-0038 — QA — 2026-10-08
RTP-0038 APROVADA; 0 achados; vitest publicacao.test.ts 7/7 com executor falso, sem shell:true, caminho com espaço e & intacto, bin do wrangler existe e a ausência falha com erro claro.

## TP-0002 — QA — 2026-10-08
APROVADA rodada 2 — achados 1 e 2 corrigidos (0 parsing errors, web/src->worker relativo barrado), 0 críticos, 1 não crítico novo (backlog de lint de outros lotes: 647 erros) + RTP-0011 existente.

## TP-0053 — QA — 2026-10-08
APROVADA rodada 2 — foco devolvido à região (própria ou `regiaoFoco`) com 2 testes `toHaveFocus`, 17/17 passando, axe limpo; reanúncio de "Carregando…" fica com as telas T1–T4; 0 críticos, 0 não críticos.

## TP-0066 — QA — 2026-10-08
APROVADA (rodada 2) — 0 críticos, 0 não críticos; `pnpm dev` na raiz sobe o site (GET / = 200, processo encerrado) e os 3 comandos do README batem com os scripts reais.
