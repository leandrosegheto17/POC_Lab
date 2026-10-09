// Constantes e montadores das regras de fronteira usadas por eslint.config.js.

const SELETOR_PREPARE =
  ':matches(CallExpression[callee.name="prepare"], CallExpression[callee.property.name="prepare"])';

// O gabarito se chama `problemas-plantados.json` (o nome antigo `gabarito*`
// continua barrado). A regra trata de LER/CITAR o gabarito fora de test/; o
// gerador, o caso de uso `gerar` e a configuração de caminhos, que o
// ESCREVEM/nomeiam (GERACAO), são exceção só para o nome novo.
export const GRUPO_GABARITO_ANTIGO = ["**/gabarito*", "*gabarito*"];
const GRUPO_PLANTADOS = ["**/problemas-plantados*", "*problemas-plantados*"];
export const GRUPO_GABARITO = [...GRUPO_GABARITO_ANTIGO, ...GRUPO_PLANTADOS];

export const GERACAO = [
  "processamento/src/gerador/**",
  "processamento/src/aplicacao/gerar.ts",
  "processamento/src/config/caminhos.ts",
];

export const MSG_GABARITO = "só código em test/ pode citar o gabarito (G-04/RN-13).";

export const SELETOR_LITERAL_GABARITO = "Literal[value=/gabarito|problemas-plantados/i]";
export const SELETOR_LITERAL_GABARITO_ANTIGO = "Literal[value=/gabarito/i]";

export const SELETORES_PREPARE = [
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

// G-12 — `react/no-danger` só vê elementos DOM nativos; este seletor pega a
// prop também em componente JSX customizado (`<Foo dangerouslySetInnerHTML />`).
export const SELETOR_DANGER = {
  selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
  message: "dangerouslySetInnerHTML é proibido, mesmo em componente customizado (G-12).",
};

// Do `processamento`, só dominio e contrato. A entrada bare "processamento"
// não entra: o pacote `ignore` (semântica .gitignore) não deixa reincluir por
// negação um filho de ancestral ignorado, e isso quebraria as negações de
// `processamento/contrato/**` e `processamento/dominio/**`.
export const GRUPO_SO_DOMINIO_E_CONTRATO = [
  "**/processamento/src/*",
  "!**/processamento/src/dominio",
  "!**/processamento/src/dominio/**",
  "!**/processamento/src/contrato",
  "!**/processamento/src/contrato/**",
  "processamento/*",
  "!processamento/dominio",
  "!processamento/dominio/**",
  "!processamento/contrato",
  "!processamento/contrato/**",
];

export const padraoGabarito = () => ({ group: GRUPO_GABARITO, message: MSG_GABARITO });

/** Bloco de `no-restricted-imports` com os padrões (e paths) dados. */
export function bloqueioImports(patterns, paths) {
  return {
    "no-restricted-imports": ["error", { ...(paths ? { paths } : {}), patterns }],
  };
}

/** `no-restricted-syntax` com os seletores de SQL (G-08) e de dangerouslySetInnerHTML (G-12). */
export function bloqueioSintaxe(...antes) {
  return {
    "no-restricted-syntax": ["error", ...antes, ...SELETORES_PREPARE, SELETOR_DANGER],
  };
}
