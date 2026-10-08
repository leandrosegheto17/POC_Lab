// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

/**
 * TP-0002 — ESLint 9 (flat config) com fronteiras de módulo e proibições.
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
 * `web/` ainda não tem conteúdo real (TP-0003 cria o esqueleto em paralelo);
 * as regras abaixo são escritas contra os caminhos esperados mesmo vazios —
 * glob sem arquivo correspondente simplesmente não ativa nenhuma regra.
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

const SELETOR_PREPARE =
  ':matches(CallExpression[callee.name="prepare"], CallExpression[callee.property.name="prepare"])';

const GRUPO_GABARITO = ["**/gabarito*", "*gabarito*"];

const SELETOR_LITERAL_GABARITO = "Literal[value=/gabarito/i]";

const SELETORES_PREPARE = [
  {
    selector: `${SELETOR_PREPARE} > TemplateLiteral.arguments[expressions.length > 0]`,
    message:
      "prepare() não pode receber template literal com expressão interpolada (risco de SQL injection).",
  },
  {
    selector: `${SELETOR_PREPARE} > BinaryExpression.arguments[operator="+"]`,
    message:
      "prepare() não pode receber concatenação de string (risco de SQL injection).",
  },
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/*.config.js",
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

  // ---------------------------------------------------------------------
  // G-02 — processamento/src/dominio: camada mais interna, sem dependência
  // nenhuma de infraestrutura, validação externa, runtime Node, ou do
  // gabarito.
  // ---------------------------------------------------------------------
  {
    files: ["processamento/src/dominio/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "zod", message: "dominio não pode depender de zod (G-02)." },
          ],
          patterns: [
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
              message:
                "dominio não importa nenhum outro módulo do projeto (G-02).",
            },
            {
              group: GRUPO_GABARITO,
              message: "só código em test/ pode citar o gabarito (G-04/RN-13).",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // G-03 — processamento/src/contrato: só dominio e zod.
  // ---------------------------------------------------------------------
  {
    files: ["processamento/src/contrato/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
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
            {
              group: GRUPO_GABARITO,
              message: "só código em test/ pode citar o gabarito (G-04/RN-13).",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // G-03 — web/worker: do `processamento` só dominio e contrato; node:*
  // proibido (fora de test/, ver nota de interpretação acima).
  // ---------------------------------------------------------------------
  {
    files: ["web/worker/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message: "web/worker não importa node:* fora de test/ (G-03).",
            },
            {
              group: [
                "**/processamento/**",
                "!**/processamento/src/dominio/**",
                "!**/processamento/src/contrato/**",
                "processamento",
                "processamento/*",
                "!processamento/dominio",
                "!processamento/dominio/**",
                "!processamento/contrato",
                "!processamento/contrato/**",
              ],
              message:
                "web/worker só importa dominio e contrato do processamento (G-03).",
            },
            {
              group: GRUPO_GABARITO,
              message: "só código em test/ pode citar o gabarito (G-04/RN-13).",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // G-03 — web/src: do `processamento` só dominio e contrato; node:*
  // proibido (fora de test/); não importa web/worker.
  // ---------------------------------------------------------------------
  {
    files: ["web/src/**/*.{ts,tsx}"],
    ignores: ["**/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message: "web/src não importa node:* fora de test/ (G-03).",
            },
            {
              group: [
                "**/processamento/**",
                "!**/processamento/src/dominio/**",
                "!**/processamento/src/contrato/**",
                "processamento",
                "processamento/*",
                "!processamento/dominio",
                "!processamento/dominio/**",
                "!processamento/contrato",
                "!processamento/contrato/**",
              ],
              message:
                "web/src só importa dominio e contrato do processamento (G-03).",
            },
            {
              group: ["**/web/worker/**", "web/worker", "web/worker/*"],
              message: "web/src não importa web/worker (G-03).",
            },
            {
              group: GRUPO_GABARITO,
              message: "só código em test/ pode citar o gabarito (G-04/RN-13).",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // G-04 (RN-13) — qualquer outro arquivo fora de test/ (ex.: fontes,
  // armazenamento, importacao, gerador, ia, cli, publicacao) também não
  // pode citar o gabarito por import.
  // ---------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "processamento/src/dominio/**",
      "processamento/src/contrato/**",
      "web/worker/**",
      "web/src/**",
      "**/test/**",
      "**/*.test.*",
      "**/*.spec.*",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: GRUPO_GABARITO,
              message: "só código em test/ pode citar o gabarito (G-04/RN-13).",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // G-04 (RN-13) + G-08 — fora de test/: nem citação ao gabarito por
  // string literal, nem prepare() inseguro.
  // ---------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: ["**/test/**", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: SELETOR_LITERAL_GABARITO,
          message: "só código em test/ pode citar o gabarito (G-04/RN-13).",
        },
        ...SELETORES_PREPARE,
      ],
    },
  },

  // ---------------------------------------------------------------------
  // G-08 — dentro de test/: prepare() inseguro continua proibido (citar o
  // gabarito, por sua vez, é permitido aqui).
  // ---------------------------------------------------------------------
  {
    files: ["**/test/**/*.{ts,tsx,js,jsx}", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "no-restricted-syntax": ["error", ...SELETORES_PREPARE],
    },
  },

  // ---------------------------------------------------------------------
  // G-12 — dangerouslySetInnerHTML proibido em qualquer elemento JSX.
  // ---------------------------------------------------------------------
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { react: reactPlugin },
    rules: {
      "react/no-danger": "error",
    },
  },
);
