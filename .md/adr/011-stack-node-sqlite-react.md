# ADR-011 — Stack: Node 24, node:sqlite, pnpm, Vite/React, Vitest

- Status: Superseded by ADR-014
- Data: 2026-10-07

## Contexto
Preferência do autor: SQLite e Node no backend, TypeScript. Prazo de 1 dia, ambiente Windows, CI em runner gratuito Linux, custo zero.

## Alternativas consideradas
- Banco: `node:sqlite` (embutido) / `better-sqlite3` (binário nativo) / D1 local via wrangler.
- Execução de TS: type stripping nativo do Node 24 / `tsx` / compilar com `tsc`.
- Frontend: Vite + React / HTML gerado no Node / Vite + React + Tailwind + biblioteca de componentes.
- Testes: Vitest + Testing Library + vitest-axe / + Playwright E2E.

## Decisão e motivo
- **Node 24 LTS + TypeScript `strict`, ESM, type stripping nativo**: zero etapa de build no processamento.
- **`node:sqlite`**: é SQLite, sem compilação nativa no Windows nem no CI.
- **`csv-parse`/`csv-stringify`**: CSV com texto livre exige parser correto.
- **pnpm workspace** (`processamento`, `web`), **Vite + React 19 + React Router**, CSS puro com tokens.
- **Vitest** nos 2 pacotes; **Testing Library + vitest-axe** no `web`; **ESLint 9 + typescript-eslint** (`strictTypeChecked`).
Mesmo padrão do projeto de referência do autor, menos o que não serve a 4 telas de leitura.

## Consequências
- `tsconfig` com `erasableSyntaxOnly` (sem `enum`, sem *parameter properties*).
- Plano B documentado: `better-sqlite3` e `tsx`, ambos trocáveis sem tocar o domínio.

## O que deliberadamente não foi feito
Tailwind, Radix, TanStack Query, biblioteca de gráficos, ORM, Prettier e Playwright.
