# ADR-012 — CI no GitHub Actions e publicação manual

- Status: Superseded by ADR-015
- Data: 2026-10-07

## Contexto
RF-13 exige lint, tipos e testes em todo push e pull request. A publicação vai para o Cloudflare (conta do autor). Repositório público.

## Alternativas consideradas
1. CI com lint/tipos/testes + deploy automático no Cloudflare a cada push na `main`.
2. CI com lint/tipos/testes (incluindo testes de integração sobre a base real) + publicação manual por `pnpm publicar` (`preparar` + build + `wrangler deploy`).

## Decisão e motivo
Alternativa 2. Cumpre RF-13 sem gerenciar token do Cloudflare como segredo do repositório hoje. O CI (`ubuntu-latest`, ações fixadas por SHA, `permissions: contents: read`) roda: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; a base de vendas é baixada com conferência de SHA-256 e guardada em cache, para os testes de contagem (RF-04) e de gabarito (M1).

## Consequências
- Publicar depende do autor rodar 1 comando; como o processamento é determinístico, o resultado é o mesmo em qualquer máquina.
- O passo de deploy por CI é pequeno e fica como próximo passo no README.

## O que deliberadamente não foi feito
Deploy automático, ambientes de *preview*, gate de cobertura e runner self-hosted.
