import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// G-17: nenhuma dependência fora do SDD §3 sem novo ADR.

const RAIZ = path.resolve(import.meta.dirname, "../../..");

const PERMITIDAS = new Set([
  "hono",
  "zod",
  "@hono/zod-validator",
  "@cloudflare/vite-plugin",
  "wrangler",
  "@cloudflare/workers-types",
  "csv-parse",
  "react",
  "react-dom",
  "react-router",
  "vite",
  "@vitejs/plugin-react",
  "vitest",
  "@testing-library/react",
  "@testing-library/jest-dom",
  "vitest-axe",
  "jsdom",
  "eslint",
  "@eslint/js",
  "typescript-eslint",
  "eslint-plugin-react",
  "typescript",
  "tsx",
  "processamento",
]);
const PERMITIDO_POR_PREFIXO = [/^@types\//];

interface Pacote {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function dependenciasNaoPermitidas(pacote: Pacote): string[] {
  const nomes = [...Object.keys(pacote.dependencies ?? {}), ...Object.keys(pacote.devDependencies ?? {})];
  return nomes.filter((n) => !PERMITIDAS.has(n) && !PERMITIDO_POR_PREFIXO.some((re) => re.test(n)));
}

const PACOTES = ["package.json", "processamento/package.json", "web/package.json"];

describe("guardrail G-17 — dependências permitidas", () => {
  it.each(PACOTES)("%s só usa dependências da lista do SDD §3", (arquivo) => {
    const pacote = JSON.parse(readFileSync(path.join(RAIZ, arquivo), "utf8")) as Pacote;
    expect(
      dependenciasNaoPermitidas(pacote),
      "G-17: dependência nova exige ADR e atualização da lista do SDD §3",
    ).toEqual([]);
  });

  it("acusa dependência fora da lista em dependencies (caso negativo)", () => {
    expect(dependenciasNaoPermitidas({ dependencies: { tailwindcss: "^4" } })).toEqual(["tailwindcss"]);
  });

  it("acusa dependência fora da lista em devDependencies (caso negativo)", () => {
    expect(
      dependenciasNaoPermitidas({ devDependencies: { playwright: "^1", vitest: "^3" } }),
    ).toEqual(["playwright"]);
  });

  it("aceita @types/* e as dependências da lista", () => {
    expect(
      dependenciasNaoPermitidas({ dependencies: { hono: "^4" }, devDependencies: { "@types/node": "^24" } }),
    ).toEqual([]);
  });
});
