import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// G-17: nenhuma dependência fora do SDD §3 sem novo ADR.

const RAIZ = path.resolve(import.meta.dirname, "../../..");

const COMUM = ["zod", "typescript", "vitest"];

const PERMITIDAS_POR_PACOTE: Record<string, string[]> = {
  "package.json": ["eslint", "@eslint/js", "typescript-eslint", "eslint-plugin-react"],
  "processamento/package.json": ["csv-parse", "tsx"],
  "web/package.json": [
    "hono",
    "@hono/zod-validator",
    "@cloudflare/vite-plugin",
    "wrangler",
    "@cloudflare/workers-types",
    "react",
    "react-dom",
    "react-router",
    "vite",
    "@vitejs/plugin-react",
    "@testing-library/react",
    "@testing-library/jest-dom",
    "vitest-axe",
    "jsdom",
    "processamento",
  ],
};
const PERMITIDO_POR_PREFIXO = [/^@types\//];
const SECOES = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const;

type Pacote = Partial<Record<(typeof SECOES)[number], Record<string, string>>>;

function dependenciasNaoPermitidas(pacote: Pacote, arquivo: string): string[] {
  const permitidas = new Set([...COMUM, ...(PERMITIDAS_POR_PACOTE[arquivo] ?? [])]);
  const nomes = SECOES.flatMap((secao) => Object.keys(pacote[secao] ?? {}));
  return nomes.filter((n) => !permitidas.has(n) && !PERMITIDO_POR_PREFIXO.some((re) => re.test(n)));
}

const PACOTES = Object.keys(PERMITIDAS_POR_PACOTE);

describe("guardrail G-17 — dependências permitidas", () => {
  it.each(PACOTES)("%s só usa dependências da lista do SDD §3", (arquivo) => {
    const pacote = JSON.parse(readFileSync(path.join(RAIZ, arquivo), "utf8")) as Pacote;
    expect(
      dependenciasNaoPermitidas(pacote, arquivo),
      "G-17: dependência nova exige ADR e atualização da lista do SDD §3",
    ).toEqual([]);
  });

  it("acusa dependência fora da lista em dependencies (caso negativo)", () => {
    expect(dependenciasNaoPermitidas({ dependencies: { tailwindcss: "^4" } }, "web/package.json")).toEqual([
      "tailwindcss",
    ]);
  });

  it("acusa dependência fora da lista em devDependencies (caso negativo)", () => {
    expect(
      dependenciasNaoPermitidas({ devDependencies: { playwright: "^1", vitest: "^3" } }, "web/package.json"),
    ).toEqual(["playwright"]);
  });

  it.each(["optionalDependencies", "peerDependencies"] as const)(
    "acusa dependência fora da lista em %s (caso negativo)",
    (secao) => {
      expect(dependenciasNaoPermitidas({ [secao]: { lodash: "^4" } }, "web/package.json")).toEqual(["lodash"]);
    },
  );

  it.each([
    ["hono", "processamento/package.json"],
    ["wrangler", "package.json"],
    ["vite", "processamento/package.json"],
    ["csv-parse", "web/package.json"],
    ["csv-parse", "package.json"],
  ])("acusa %s fora do seu pacote: %s (caso negativo)", (nome, arquivo) => {
    expect(dependenciasNaoPermitidas({ dependencies: { [nome]: "^1" } }, arquivo)).toEqual([nome]);
  });

  it("aceita @types/* e as dependências do pacote", () => {
    expect(
      dependenciasNaoPermitidas(
        { dependencies: { hono: "^4" }, devDependencies: { "@types/node": "^24" } },
        "web/package.json",
      ),
    ).toEqual([]);
    expect(dependenciasNaoPermitidas({ dependencies: { "csv-parse": "^5" } }, "processamento/package.json")).toEqual([]);
  });
});
