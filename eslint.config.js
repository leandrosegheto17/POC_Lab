// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import {
  GERACAO,
  GRUPO_GABARITO_ANTIGO,
  GRUPO_SO_DOMINIO_E_CONTRATO,
  MSG_GABARITO,
  SELETOR_LITERAL_GABARITO,
  SELETOR_LITERAL_GABARITO_ANTIGO,
  bloqueioImports,
  bloqueioSintaxe,
  padraoGabarito,
} from "./eslint/fronteiras.js";


/**
 * ESLint 9 (flat config) com fronteiras de módulo e proibições.
 *
 * Fronteiras do SDD §2 (tabela de componentes + "Regra de dependência") e
 * GUARDRAILS G-02/G-03/G-04/G-12:
 *   - dominio    -> não importa nada do projeto, nem `zod`, nem `node:*`.
 *   - contrato   -> só `dominio` e `zod`.
 *   - web/worker -> só `dominio` e `contrato` do `processamento`;
 *                   `node:*` só em `test/`.
 *   - web/src    -> só `dominio` e `contrato` do `processamento`;
 *                   `node:*` só em `test/`; não importa `web/worker`.
 *   - gabarito   -> só pode ser citado (import ou string) em `test/`.
 *   - UI         -> `dangerouslySetInnerHTML` proibido (G-12).
 *   - SQL        -> `prepare(` nunca recebe template literal com expressão
 *                   nem concatenação (prevenção de SQL injection, G-08).
 *
 * Glob sem arquivo correspondente simplesmente não ativa nenhuma regra.
 *
 * Nota de interpretação (pequeno detalhe de implementação, não desvio de
 * escopo): o aceite diz "...importarem além de dominio e contrato ou
 * node:* fora de test/". Interpretamos que "fora de test/" qualifica a
 * frase inteira: dentro de qualquer pasta `test/` (de `web/worker` ou
 * `web/src`), nem a fronteira de módulo nem a proibição de `node:*` do
 * `no-restricted-imports` se aplicam — testes de integração costumam
 * precisar de acesso mais amplo (ex.: popular fixtures). Por isso os blocos
 * de `web/worker` e `web/src` abaixo usam `ignores: ["**\/test/**"]`.
 *
 * IMPORTANTE sobre ESLint flat config: quando dois blocos de configuração
 * combinam para o mesmo arquivo e definem a MESMA chave de regra (ex.:
 * `no-restricted-imports` duas vezes), o valor do bloco posterior
 * SUBSTITUI inteiramente o anterior (não há merge de arrays). Por isso
 * cada regra de fronteira abaixo é escrita em um único bloco por grupo de
 * arquivos mutuamente exclusivo — nunca dividida em blocos que se
 * sobrepõem para o mesmo arquivo.
 */

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/*.config.{js,mjs,cjs,ts,mts,cts}",
      "**/.wrangler/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/out/**",
      "eslint/**",
      ".claude/**",
      ".md/**",
      ".git/**",
      "processamento/dados/**",
      "**/*.d.ts",
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        // Resolve o tsconfig de cada arquivo automaticamente (monorepo),
        // sem precisar listar `processamento/tsconfig.json`,
        // `web/tsconfig.json` etc. um por um.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // G-02 — processamento/src/dominio: camada mais interna, sem dependência
  // de infraestrutura, validação externa, runtime Node ou gabarito.
  {
    files: ["processamento/src/dominio/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: bloqueioImports(
      [
        {
          group: ["node:*"],
          message: "dominio não pode importar módulos node:* (G-02).",
        },
        {
          group: [
            "**/contrato/**",
            "**/fontes/**",
            "**/armazenamento/**",
            "**/importacao/**",
            "**/gerador/**",
            "**/ia/**",
            "**/cli/**",
            "**/publicacao/**",
            "**/web/**",
          ],
          message: "dominio não importa nenhum outro módulo do projeto (G-02).",
        },
        padraoGabarito(),
      ],
      [{ name: "zod", message: "dominio não pode depender de zod (G-02)." }],
    ),
  },

  // G-03 — processamento/src/contrato: só dominio e zod.
  {
    files: ["processamento/src/contrato/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: bloqueioImports([
      {
        group: ["node:*"],
        message: "contrato não pode importar módulos node:* (G-03).",
      },
      {
        group: [
          "**/fontes/**",
          "**/armazenamento/**",
          "**/importacao/**",
          "**/gerador/**",
          "**/ia/**",
          "**/cli/**",
          "**/publicacao/**",
          "**/web/**",
        ],
        message: "contrato só pode importar dominio e zod (G-03).",
      },
      padraoGabarito(),
    ]),
  },

  // G-03 — web/worker: do `processamento` só dominio e contrato; node:*
  // proibido (fora de test/, ver nota de interpretação acima).
  {
    files: ["web/worker/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: bloqueioImports([
      {
        group: ["node:*"],
        message: "web/worker não importa node:* fora de test/ (G-03).",
      },
      {
        group: GRUPO_SO_DOMINIO_E_CONTRATO,
        message: "web/worker só importa dominio e contrato do processamento (G-03).",
      },
      padraoGabarito(),
    ]),
  },

  // G-03 — web/src: do `processamento` só dominio e contrato; node:*
  // proibido (fora de test/); não importa web/worker.
  {
    files: ["web/src/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: bloqueioImports([
      {
        group: ["node:*"],
        message: "web/src não importa node:* fora de test/ (G-03).",
      },
      {
        group: GRUPO_SO_DOMINIO_E_CONTRATO,
        message: "web/src só importa dominio e contrato do processamento (G-03).",
      },
      {
        // Imports relativos reais (`../worker/x.js`) não contêm "web/worker"
        // no texto; por isso o padrão `**/worker`.
        group: [
          "**/web/worker/**",
          "web/worker",
          "web/worker/*",
          "**/worker",
          "**/worker/**",
        ],
        message: "web/src não importa web/worker (G-03).",
      },
      padraoGabarito(),
    ]),
  },

  // G-04 (RN-13) — qualquer outro arquivo fora de test/ também não pode
  // citar o gabarito por import.
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "processamento/src/dominio/**",
      "processamento/src/contrato/**",
      "web/worker/**",
      "web/src/**",
      ...GERACAO,
      "**/test/**",
      "**/*.test.*",
      "**/*.spec.*",
    ],
    rules: bloqueioImports([padraoGabarito()]),
  },

  // G-04 (RN-13) — arquivos de GERAÇÃO (escrevem o problemas-plantados.json;
  // não o leem): podem importar `problemas-plantados`, mas o nome antigo
  // `gabarito*` segue barrado.
  {
    files: GERACAO,
    ignores: ["**/test/**", "**/*.test.*", "**/*.spec.*"],
    rules: bloqueioImports([{ group: GRUPO_GABARITO_ANTIGO, message: MSG_GABARITO }]),
  },

  // G-04 + G-08 — fora de test/: nem citação ao gabarito por string literal,
  // nem prepare() inseguro.
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [...GERACAO, "**/test/**", "**/*.test.*", "**/*.spec.*"],
    rules: bloqueioSintaxe({
      selector: SELETOR_LITERAL_GABARITO,
      message: MSG_GABARITO,
    }),
  },

  // G-04 + G-08 — arquivos de geração: o literal "problemas-plantados.json"
  // é permitido; o literal antigo não.
  {
    files: GERACAO,
    ignores: ["**/test/**", "**/*.test.*", "**/*.spec.*"],
    rules: bloqueioSintaxe({
      selector: SELETOR_LITERAL_GABARITO_ANTIGO,
      message: MSG_GABARITO,
    }),
  },

  // G-08 — dentro de test/: prepare() inseguro continua proibido (citar o
  // gabarito é permitido aqui).
  {
    files: ["**/test/**/*.{ts,tsx,js,jsx}", "**/*.test.*", "**/*.spec.*"],
    rules: bloqueioSintaxe(),
  },

  // G-12 — dangerouslySetInnerHTML proibido em qualquer elemento JSX.
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { react: reactPlugin },
    rules: {
      "react/no-danger": "error",
    },
  },
);
