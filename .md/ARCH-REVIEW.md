# POC_Lab — Revisões de arquitetura

Uma entrada por revisão (`/revisar`, skill `architecture-health-review`), a mais recente no topo.

## Revisão 2026-10-08 — sob demanda (projeto inteiro)

Números do saude.py: 20 arquivos acima do limite (6 código, 5 componentes, 8 testes, 1 estilo) · 23 blocos duplicados no código (98 com testes, 24 dentro do mesmo arquivo) · 409 IDs de tarefa no código, em 147 arquivos · 6 pastas com acesso a dados (só 1 permitida para o event store) · 3 imports entre aplicações (`web` → `processamento`: `contrato` em 17 arquivos, `dominio` em 3)

Observação de base: o `SDD.md` não tem as subseções `### Pacotes, pastas e fronteiras` (Seção 2) nem `### Troca de dados em produção` (Seção 6). A revisão usou a tabela de módulos e a regra de dependência da Seção 2 e a dívida "Republicação sem troca atômica" da Seção 6 como referência; escrever as duas subseções está nos BK dos achados 1 e 30.

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | O site e o Worker reaproveitam `dominio` e `contrato` importando o pacote da aplicação `processamento` (sem pacote compartilhado); o SDD não tem a subseção de fronteiras | 1 | Média | `web/package.json:15`; `processamento/package.json:6-11`; 20 arquivos de `web/` | BK (pacote compartilhado + subseção do SDD) |
| 2 | A tela T2 recalcula RN-03 (pagamento duplicado) no navegador com `detectarDuplicado`; o SDD §5 só autoriza o navegador a calcular o estado em uma data (RF-06), e a v1 não pode ganhar campo (G-21) | 2 | Média | `web/src/paginas/Pedido.tsx:10,67-80` | BK (onde roda a regra) |
| 3 | `Repositorio` expõe a conexão `db` no tipo público e o comentário diz que é o "único lugar" com SQL, mas há SQL do event store em `publicacao/` (5 arquivos), `importacao/` e `ia/` | 3 | Média | `processamento/src/armazenamento/repositorio.ts:9-14,45-47` | RTP-0050 |
| 4 | `publicacao/` consulta o event store direto com `db.prepare` | 3 | Média | `publicacao/divergencias.ts:109`, `linha-do-tempo.ts:91`, `qualidade.ts:133-168`, `pedidos.ts:211-227`, `publicar.ts:41-44` | RTP-0051 |
| 5 | `importacao/importar.ts` faz SQL e controla a transação (`BEGIN`/`COMMIT`) pelo `repositorio.db` | 3 | Média | `processamento/src/importacao/importar.ts:126-160,221-397` | RTP-0052 |
| 6 | `ia/sugerir.ts` consulta o event store pelo `repositorio.db` e depende de `publicacao/pedidos.ts` (fora do que o SDD §2 lista para `ia/`) | 3 | Média | `processamento/src/ia/sugerir.ts:113-128,218-220,296` | RTP-0053 |
| 7 | Conversão linha→`Evento` (`LinhaEvento`, `linhaParaEvento`, `agruparEventosPorPedido`) escrita 3-4 vezes em `publicacao/` | 4 | Média | `publicacao/divergencias.ts:21-78`, `qualidade.ts:78-124`, `linha-do-tempo.ts:40-48`, `pedidos.ts:53-68` | RTP-0051 |
| 8 | Leitura de pagamentos sem identificação, montagem de candidatos e chave de cache da IA copiadas de `ia/sugerir.ts` para `publicacao/qualidade.ts`, com comentário admitindo a cópia | 4 | Média | `publicacao/qualidade.ts:216-357,398-400`; `ia/sugerir.ts:110-199` | RTP-0053 |
| 9 | Listas de literais `TIPOS_DIVERGENCIA`/`FONTES` repetidas em 4 arquivos do contrato, em `dominio/indicadores.ts` e em 2 arquivos do site | 4 | Média | `contrato/divergencias.ts:10-22`, `linha-do-tempo-v1.ts:9-21`, `linha-do-tempo-v2.ts:13-17`, `resumo.ts:10`, `parametros.ts:10`, `qualidade.ts:11`; `dominio/indicadores.ts:103`; `web/src/paginas/Divergencias.tsx:79-85`; `web/src/componentes/Indicador.tsx:238` | RTP-0056 (contrato e domínio) e RTP-0058 (site) |
| 10 | Rota `/api/v2/.../linha-do-tempo` é cópia da v1 (validação, resolução, fontes, montagem do pedido), com `FontesPedido`/`CHAVES_FONTE` repetidos "porque a v1 não deve ser alterada" | 5 | Média | `web/worker/rotas/linha-do-tempo-v2.ts:25-83` × `linha-do-tempo.ts:21-87` | RTP-0057 |
| 11 | `EsquemaEventoV2` espelha `EsquemaEventoV1` variante por variante em vez de estender a v1 | 5 | Média | `processamento/src/contrato/linha-do-tempo-v2.ts:19-104` | RTP-0056 |
| 12 | `importar()` repete o mesmo corpo (gravar evento, gravar achados, contar novas/existentes) para cada uma das 3 fontes; arquivo com 400 linhas | 6 | Baixa | `processamento/src/importacao/importar.ts:227-387` | RTP-0052 |
| 13 | `plantarCasosPagamento` repete "remover linhas da referência" e "acrescentar transação" em 5 blocos; arquivo com 364 linhas | 6 | Baixa | `processamento/src/gerador/plantar-pagamentos.ts:211-313` | RTP-0055 |
| 14 | `eslint.config.js` repete o grupo de fronteira do `processamento` nos blocos do Worker e do site; arquivo com 427 linhas | 6 | Baixa | `eslint.config.js:231-243` × `278-290` | RTP-0068 |
| 15 | Os 7 ícones repetem o mesmo invólucro `<svg>` (9 linhas cada) | 6 | Baixa | `web/src/componentes/icones/*.tsx` | RTP-0063 |
| 16 | CLI importando CLI: `preparar` importa as 5 outras CLIs e refaz a escrita de `gerar.ts`; `sugerir` e `publicar-dados` importam constantes de outras CLIs; caminhos padrão (`CAMINHO_BASE_PADRAO`) repetidos em `gerar.ts` e `importar.ts` | 7 | Média | `processamento/src/cli/preparar.ts:5-32,58-63`; `cli/sugerir.ts:7`; `cli/publicar-dados.ts:8`; `cli/gerar.ts:15`; `cli/importar.ts:10` | RTP-0054 |
| 17 | `Indicador.tsx` com 570 linhas e 5 componentes exportados (4 blocos + o despachante) | 8 | Baixa | `web/src/componentes/Indicador.tsx:90,282,350,408,515` | RTP-0059 |
| 18 | Página T2 grossa: `Pedido.tsx` (366 linhas) com 4 subcomponentes, formatação de saldo e montagem de URL; `LinhaDoTempo.tsx` com 332 linhas | 8 | Baixa | `web/src/paginas/Pedido.tsx`; `web/src/componentes/LinhaDoTempo.tsx` | RTP-0060 |
| 19 | Página T1 grossa: `Divergencias.tsx` (417 linhas) com validação de URL, rótulos e subcomponente de eventos | 8 | Baixa | `web/src/paginas/Divergencias.tsx` | RTP-0061 |
| 20 | Página T4 acima do limite: `Qualidade.tsx` com 310 linhas | 8 | Baixa | `web/src/paginas/Qualidade.tsx` | RTP-0062 |
| 21 | Rótulos de tipo de divergência e de evento repetidos em 4 arquivos do site ("Pago duas vezes", "Em trânsito"...), com comentário admitindo a cópia | 8 | Baixa | `web/src/paginas/Divergencias.tsx:28-34,93-103`; `componentes/FiltroTipo.tsx:26`; `EtiquetaTipo.tsx:23`; `LinhaDoTempo.tsx:31-41`; `Indicador.tsx:395` | RTP-0058 |
| 22 | `casca.css` com 474 linhas (limite 300) | 8 | Baixa | `web/src/estilos/casca.css` | RTP-0063 |
| 23 | `publicacao/qualidade.ts` (471), `ia/sugerir.ts` (362) e `cli/preparar.ts` (301) acima de 300 linhas | 8 | Baixa | arquivos citados | RTP-0053 e RTP-0054 (caem abaixo do limite com a extração) |
| 24 | 7 testes do site acima de 400 linhas (até 891) e fixtures copiadas entre `divergencias.test`, `divergencias-paginacao.test` e `cartoes-filtro.test`; testes do Worker montam o D1 de teste à mão em vez de `test/apoio/fixture.ts` | 9 | Baixa | `web/test/qualidade.test.tsx`, `indicadores.test.tsx`, `divergencias-paginacao.test.tsx`, `divergencias.test.tsx`, `pedido.test.tsx`, `componentes.test.tsx`, `componente-linha-do-tempo.test.tsx`; `web/test/worker/linha-do-tempo*.test.ts` | RTP-0064 |
| 25 | `gerador.test.ts` com 737 linhas; dados de teste copiados entre `estado.test`/`envio-pagamento.test`, `ia/sugerir.test`/`publicacao/qualidade-ia.test` e `integracao/publicacao.test`/`publicacao/pedidos.test` | 9 | Baixa | `processamento/test/` (arquivos citados) | RTP-0065 |
| 26 | IDs de tarefa (`TP-`, `RTP-`) e narração de processo nos comentários do `processamento` | 10 | Baixa | `processamento/src/**` e `processamento/test/**` (ex.: `publicacao/qualidade.ts`, 12; `cli/preparar.ts`, 10) | RTP-0066 |
| 27 | IDs de tarefa e narração de processo nos comentários do `web` e do `eslint.config.js` | 10 | Baixa | `web/src/**`, `web/worker/**`, `web/test/**` (ex.: `worker/consultas.ts`, 9; `paginas/Pedido.tsx`, 8) | RTP-0067 |
| 28 | Comentários falsos: o Worker diz "nenhuma rota de negócio aqui" e as rotas dizem "não registrado em index.ts", mas as rotas estão registradas; o repositório diz ser o "único lugar" com SQL; `decidirSugerir` mantém um ramo "legado" que o pipeline não usa | 11 | Baixa | `web/worker/index.ts:1-3`; `web/worker/rotas/linha-do-tempo.ts:3-6`, `linha-do-tempo-v2.ts:9-10`; `armazenamento/repositorio.ts:11-13`; `cli/preparar.ts:116-128` | RTP-0057, RTP-0050, RTP-0054 |
| 29 | `as unknown as` convertendo `EventoV1` (contrato) em `Evento` (domínio) | 12 | Baixa | `web/src/paginas/Pedido.tsx:98-100` | RTP-0060 |
| 30 | Republicação do D1 faz `DROP`/`CREATE` + `INSERT` sem atomicidade nem volta atrás; falha no meio da carga deixa a API vazia ou parcial sem caminho documentado; o SDD §6 não tem a subseção de troca de dados | 14 | Média | `processamento/src/publicacao/leitura-d1.sql:10-55`; `package.json:15` | BK (troca de dados em produção) |
| 31 | Comandos SQL preparados a cada chamada nas inserções do repositório (chamadas ~150 mil vezes por importação) | 13 | Baixa | `processamento/src/armazenamento/repositorio.ts:88-154` | RTP-0050 |
| 32 | Consulta dentro de laço (N+1): um `SELECT` de evento por achado `sem_identificacao` (em `ia/` e `publicacao/`) e um `SELECT` de vínculo por achado de qualidade | 13 | Baixa | `ia/sugerir.ts:122-128`; `publicacao/qualidade.ts:153-177,298-304` | RTP-0053 (IA) e RTP-0051 (vínculo) |
| 33 | Cache do CI aponta para `dados/origem` na raiz, mas `pnpm baixar-base` roda com `--filter processamento` e grava em `processamento/dados/origem`: o cache nunca acerta | 15 | Média | `.github/workflows/ci.yml:26-30`; `package.json:10`; `processamento/src/cli/baixar-base.ts:21` | RTP-0069 |
| 34 | Publicação em cadeia de `&&` no `package.json` da raiz | 16 | Baixa | `package.json:15` | RTP-0069 |
| 35 | A forma de cada sugestão da IA está escrita 3 vezes (`SugestaoQualidade` em `publicacao/qualidade.ts`, `ResultadoSugestao` em `ia/sugerir.ts` e `EsquemaSugestaoIA` no site, que "espelha" a do servidor) e não está no contrato (`sugestoes: z.unknown()`) | 4 | Média | `processamento/src/publicacao/qualidade.ts:261-267`; `processamento/src/contrato/qualidade.ts:57`; `web/src/dados/esquema-sugestao-ia.ts:17-23` | RTP-0056 (esquema no contrato) e RTP-0062 (site usa o do contrato) |
| 36 | Guardrails com "Como verificar" só em prosa: G-05 (busca), G-17 (`package.json`), G-22 (`wrangler.jsonc`) poderiam ser teste; G-15, G-19 e G-20 ficam em revisão | 17 | Baixa | `.md/GUARDRAILS.md` | RTP-0070 |

Descartados (falso positivo):
- §5 `processamento/src/fontes` (`leitura-vendas.ts`): lê a base de vendas externa em modo somente leitura, papel do adaptador no SDD §2; não é o event store.
- §5 `web/worker` (`consultas.ts`): é o único módulo de dados do Worker, com `prepare(CONSTANTE).bind(...)` (G-08).
- §5 parte de `processamento/src/publicacao` (`escritor-sql.ts`, `leitura-d1.sql`): geram o texto SQL do D1; não acessam banco.
- §6a `web` → `contrato` (17 arquivos), `derivarEstado` em `Pedido.tsx` e `import type TipoAchado` em `Qualidade.tsx`: permitidos pelo SDD §2/§5 (RF-06) e pelo G-03; a mudança de desenho vai no BK do achado 1.
- §4: 41 das 45 ocorrências são o termo de domínio "duplicado" (RN-03), escape de aspas no SQL, tokens CSS ou mapeamento de nome de campo, não cópia; as 4 reais estão nos achados 8, 11, 16 e 35.
- §7: 13 das 14 `as unknown as` tipam linhas do `node:sqlite` na fronteira do banco (não é contrato→domínio); saem de `publicacao/`, `ia/` e `importacao/` com RTP-0050 a RTP-0053.

Sem achado nos itens: nenhum (os 17 itens têm pelo menos um achado).
