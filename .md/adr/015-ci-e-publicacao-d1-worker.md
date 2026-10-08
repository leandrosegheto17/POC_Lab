# ADR-015 — CI no GitHub Actions e publicação manual de D1 + Worker

- Status: Aceito
- Data: 2026-10-07
- Supersede: ADR-012

## Contexto
Histórico: o ADR-012 definiu CI (lint, tipos, testes) e publicação manual por `pnpm publicar` = `preparar` + build + `wrangler deploy` de arquivos estáticos. Com o ADR-013, publicar passa a ter 2 partes: carregar o D1 e publicar o Worker (API + site). RF-13 não mudou. Repositório público.

## Alternativas consideradas
1. CI + deploy automático (D1 e Worker) a cada push na `main`, com token do Cloudflare como segredo do repositório.
2. CI só com lint, tipos e testes; publicação manual pelo autor: `pnpm publicar` = `preparar` → `vite build` → `wrangler d1 execute <base> --remote --file` → `wrangler deploy`.

## Decisão e motivo
Alternativa 2, como antes. Continua sem segredo do Cloudflare no repositório. Ordem: **primeiro o D1, depois o Worker**, para o código novo nunca ler tabelas antigas. O `database_id` do D1 vai no `wrangler.jsonc` (é identificador, não credencial). A criação da base (`wrangler d1 create`) é feita uma vez pelo autor.

O CI (`ubuntu-latest`, ações fixadas por SHA, `permissions: contents: read`) roda `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; a base de vendas vem com SHA-256 conferido e cache. Os testes da API rodam em Node, com o D1 de teste sobre `node:sqlite` (ADR-014), sem conta e sem rede.

## Consequências
- Publicar depende do autor (`wrangler login` local e 1 comando). Resultado determinístico: o SQL publicado é o mesmo em qualquer máquina.
- Republicar recria as tabelas de leitura: janela curta de erro na API (ADR-013).
- `pnpm preparar` também carrega o D1 local (`--local`), para `pnpm dev` funcionar sem conta.

## O que deliberadamente não foi feito
Deploy automático, ambientes de *preview*, migrações versionadas do D1 (o D1 é projeção recriada, não fonte de verdade), gate de cobertura e runner self-hosted.
