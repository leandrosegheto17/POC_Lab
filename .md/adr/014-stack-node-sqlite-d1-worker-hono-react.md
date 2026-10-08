# ADR-014 — Stack: Node 24 e node:sqlite no processamento; Worker com Hono e zod sobre D1; Vite/React

- Status: Aceito
- Data: 2026-10-07
- Supersede: ADR-011

## Contexto
Histórico: o ADR-011 fixou Node 24 + `node:sqlite` + pnpm + Vite/React + Vitest para um desenho sem código na nuvem (ADR-007). Com o ADR-013 passa a existir um Worker com API de leitura sobre o D1, e o site passa a consumir essa API. Prazo continua de 1 dia: o critério é o mais simples que mostre bem o contrato.

## Alternativas consideradas
- Roteamento do Worker: **Hono** / roteamento manual (`switch` sobre `URL.pathname`) / itty-router.
- Validação do contrato: **zod** / validação manual / JSON Schema + Ajv.
- Desenvolvimento local do site + Worker: **`@cloudflare/vite-plugin`** (Vite roda o Worker no workerd, com D1 local) / `vite build` + `wrangler dev` / Vite com *proxy* para `wrangler dev` em 2 processos.
- Testes do Worker: `app.request()` do Hono com um D1 de teste sobre `node:sqlite` / `@cloudflare/vitest-pool-workers`.
- Onde fica o Worker: dentro do pacote `web` (mesma unidade de deploy) / 3º pacote `api`.

## Decisão e motivo
- **Processamento sem mudança**: Node 24 LTS, TypeScript `strict`, ESM, type stripping nativo, `node:sqlite`, `csv-parse`/`csv-stringify`.
- **Hono 4** no Worker. Roteamento manual para 6 rotas GET seria ~40 linhas, mas teria de reimplementar extração de parâmetro, 404/405 e tratador de erro central. Hono faz isso em poucas linhas, é o padrão de fato no Workers, não tem dependência transitiva e permite testar com `app.request()` sem subir nada.
- **zod 4 + `@hono/zod-validator`**: o mesmo esquema valida a entrada no Worker, gera os tipos (`z.infer`) e valida a resposta no site. Um único lugar descreve o contrato (`processamento/src/contrato/`).
- **Sem gerador de OpenAPI** (`@hono/zod-openapi`): o contrato já está explícito nos esquemas zod e no README; documentação gerada é mais uma peça hoje.
- **`@cloudflare/vite-plugin`**: `pnpm dev` sobe site e API juntos, com D1 local, sem conta; `vite build` gera o que o `wrangler deploy` publica. É o caminho oficial para SPA React + Worker.
- **Worker dentro do pacote `web`** (`web/worker/`), porque site e API são publicados juntos pelo mesmo `wrangler.jsonc`. Continua um pnpm workspace com 2 pacotes (ADR-008).
- **Testes do Worker em Vitest (Node)** com `app.request()` e um adaptador de teste que implementa o subconjunto usado da interface do D1 (`prepare`/`bind`/`all`/`first`) sobre `node:sqlite` em memória, carregado com o mesmo SQL que a publicação gera. D1 é SQLite, então o SQL testado é o mesmo que roda na nuvem.
- Vite + React 19 + React Router, CSS puro com tokens, Vitest + Testing Library + vitest-axe, ESLint 9 + typescript-eslint: sem mudança.

## Consequências
- Dependências novas: `hono`, `zod`, `@hono/zod-validator` (Worker e contrato), `@cloudflare/vite-plugin` e `wrangler` (dev), `@cloudflare/workers-types` (tipos).
- `zod` entra no bundle do site (~dezenas de KB); aceitável para 4 telas.
- O código do Worker não pode importar `node:*` nem os módulos de escrita do processamento (fronteira por lint).
- Plano B: se o plugin do Vite der problema, `pnpm dev` = `vite build --watch` + `wrangler dev` (mesma configuração).

## O que deliberadamente não foi feito
Roteamento manual, OpenAPI gerado, ORM ou *query builder* (Drizzle, Kysely), `@cloudflare/vitest-pool-workers`, TanStack Query, Tailwind, biblioteca de componentes, de gráficos, Prettier e Playwright.
