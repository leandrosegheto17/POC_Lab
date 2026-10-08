# ADR-016 — Contrato da API de leitura: rotas, validação, erros, paginação e versão

- Status: Aceito
- Data: 2026-10-07
- Complementa: ADR-006 (versionamento do contrato de evento), ADR-013

## Contexto
O ADR-013 cria uma API REST somente leitura no Worker. O usuário pediu: contrato validado, erros padronizados, paginação, e o versionamento do evento (v1/v2, ADR-006) demonstrável na API: um consumidor da v1 continua funcionando depois da v2.

## Alternativas consideradas
- Versão da API: no caminho (`/api/v1`, `/api/v2`) / por cabeçalho (`Accept: application/vnd...;v=2`) / sem versão, só campos aditivos.
- Erros: formato próprio / **Problem Details (RFC 9457)**.
- Paginação: por página e tamanho (*offset*) / por cursor.

## Decisão e motivo
- **Versão no caminho.** É a forma mais visível para o avaliador e testável com um `curl`. `/api/v1` cobre tudo. `/api/v2` existe só onde há diferença: a linha do tempo, cujos eventos `pagamento` v2 trazem `meio_pagamento`. A v1 nunca muda de forma: o Worker passa cada evento pelo esquema zod v1, que descarta campos desconhecidos (evolução aditiva do ADR-006 — não é *upcaster*, é só projeção para a forma antiga). Na v1 os eventos não trazem `versao_schema` nem campos posteriores; na v2 trazem `versao_schema` e os campos da versão gravada. Teste `validação: contrato v1 e v2`: para o mesmo pedido, a resposta v1 é idêntica com os pagamentos gravados como v1 ou como v2, e continua passando no esquema v1; o site (consumidor v1) não muda.
- **Erros em RFC 9457** (`application/problem+json`): `type`, `title`, `status`, `detail` em português, mais `codigo` estável (`parametro_invalido`, `pedido_nao_encontrado`, `rota_nao_encontrada`, `metodo_nao_permitido`, `erro_interno`) e, no 400, `erros` (campo e motivo). Padrão conhecido, sem inventar formato. Nunca expõe pilha nem SQL.
- **Paginação por página** (`pagina` ≥ 1, `tamanho` 1–100, padrão 50), resposta `{ dados, paginacao: { pagina, tamanho, total, totalPaginas } }`. A tela usa "Página N de M"; os dados só mudam a cada publicação, então *offset* não perde nem repete item. Custo de *offset* no D1 é irrelevante para alguns milhares de linhas.
- **Somente GET/HEAD.** Outros métodos: 405 com `Allow: GET, HEAD`. Sem CORS (o site é da mesma origem).
- Entrada validada por zod antes de qualquer consulta; consultas sempre com `bind` (nunca SQL montado com texto do usuário); `codigo` aceito só com até 40 caracteres de `[A-Za-z0-9 _-]`, normalizado (espaços e caixa) pela mesma função do contrato que a publicação usou.

Rotas: ver SDD §2 (tabela "API de leitura").

## Consequências
- O contrato vive em `processamento/src/contrato/` (zod + tipos, sem `node:*`), importado pelo processamento, pelo Worker e pelo site.
- Mudança incompatível de resposta exige `/api/v3` (ou novo recurso), nunca alterar a v1.
- Página fora do intervalo devolve 200 com `dados` vazio e o total real (o site oferece voltar à página 1).

## O que deliberadamente não foi feito
Versão por cabeçalho, paginação por cursor, OpenAPI gerado, HATEOAS, busca parcial (`LIKE`), ordenação escolhida pelo cliente, `ETag`/cache condicional, limite de taxa e CORS.
