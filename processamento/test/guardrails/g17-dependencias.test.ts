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

type Pacote = Partial<Record<(typeof SECOES)[number], Record<string, string>>> & {
  overrides?: Record<string, string>;
  resolutions?: Record<string, string>;
  pnpm?: { overrides?: Record<string, string> };
};

// Especificador aceito: workspace:* ou faixa semver (sem protocolo nem caminho: npm:, git+, github:, http(s):, file:, link:).
const ESPECIFICADOR_VALIDO = /^(workspace:[\w^~.*-]+|[\w\s.^~<>=|*+-]*)$/;

function dependenciasNaoPermitidas(pacote: Pacote, arquivo: string): string[] {
  const permitidas = new Set([...COMUM, ...(PERMITIDAS_POR_PACOTE[arquivo] ?? [])]);
  const nomes = SECOES.flatMap((secao) => Object.keys(pacote[secao] ?? {}));
  return nomes.filter((n) => !permitidas.has(n) && !PERMITIDO_POR_PREFIXO.some((re) => re.test(n)));
}

function especificadoresInvalidos(pacote: Pacote): string[] {
  return SECOES.flatMap((secao) => Object.entries(pacote[secao] ?? {}))
    .filter(([, versao]) => !ESPECIFICADOR_VALIDO.test(versao))
    .map(([nome, versao]) => `${nome}@${versao}`);
}

function overridesProibidos(pacote: Pacote): string[] {
  const grupos = { overrides: pacote.overrides, "pnpm.overrides": pacote.pnpm?.overrides, resolutions: pacote.resolutions };
  return Object.entries(grupos)
    .filter(([, mapa]) => mapa !== undefined && Object.keys(mapa).length > 0)
    .map(([campo]) => campo);
}

function pacotesDoWorkspaceSemLista(yaml: string): string[] {
  const dirs = [...yaml.matchAll(/^\s*-\s*["']?([^"'\s#]+)["']?\s*$/gm)].map((m) => `${m[1] ?? ""}/package.json`);
  return dirs.filter((arquivo) => !(arquivo in PERMITIDAS_POR_PACOTE));
}

const PACOTES = Object.keys(PERMITIDAS_POR_PACOTE);

function mensagemDeFalha(arquivo: string): string {
  return (
    `G-17: dependência fora da lista em ${arquivo}. Dependência nova exige ADR e atualização do SDD §3; ` +
    `inclua o nome na lista de PERMITIDAS_POR_PACOTE["${arquivo}"] (ou em COMUM, se for de todos os pacotes).`
  );
}

describe("guardrail G-17 — dependências permitidas", () => {
  it.each(PACOTES)("%s só usa dependências da lista do SDD §3", (arquivo) => {
    const pacote = JSON.parse(readFileSync(path.join(RAIZ, arquivo), "utf8")) as Pacote;
    expect(dependenciasNaoPermitidas(pacote, arquivo), mensagemDeFalha(arquivo)).toEqual([]);
  });

  it("a mensagem de falha cita o pacote, a lista a editar, o ADR e o SDD §3", () => {
    const mensagem = mensagemDeFalha("web/package.json");
    expect(mensagem).toContain("web/package.json");
    expect(mensagem).toContain('PERMITIDAS_POR_PACOTE["web/package.json"]');
    expect(mensagem).toContain("COMUM");
    expect(mensagem).toContain("ADR");
    expect(mensagem).toContain("SDD §3");
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

  it.each(PACOTES)("%s usa só especificadores semver/workspace, sem overrides", (arquivo) => {
    const pacote = JSON.parse(readFileSync(path.join(RAIZ, arquivo), "utf8")) as Pacote;
    expect(especificadoresInvalidos(pacote), `G-17: especificador fora de semver/workspace em ${arquivo}`).toEqual([]);
    expect(overridesProibidos(pacote), `G-17: overrides/resolutions não permitidos em ${arquivo}`).toEqual([]);
  });

  it("todo pacote do pnpm-workspace.yaml tem lista em PERMITIDAS_POR_PACOTE", () => {
    const yaml = readFileSync(path.join(RAIZ, "pnpm-workspace.yaml"), "utf8");
    expect(pacotesDoWorkspaceSemLista(yaml), "G-17: pacote novo no workspace exige ADR e entrada em PERMITIDAS_POR_PACOTE").toEqual(
      [],
    );
  });

  it.each([
    ["npm:pacote-malicioso"],
    ["npm:hono@4"],
    ["github:x/y"],
    ["x/y"],
    ["git+https://example.com/x.git"],
    ["git://example.com/x.git"],
    ["https://example.com/x.tgz"],
    ["http://example.com/x.tgz"],
    ["file:../x"],
    ["link:../x"],
  ])("acusa especificador %s em nome permitido (caso negativo)", (versao) => {
    expect(especificadoresInvalidos({ dependencies: { hono: versao } })).toEqual([`hono@${versao}`]);
  });

  it.each([["^4.0.0"], ["~1.2.3"], [">=1 <2"], ["1.x"], ["*"], ["workspace:*"], ["workspace:^"], ["1.0.0-rc.1"]])(
    "aceita especificador %s",
    (versao) => {
      expect(especificadoresInvalidos({ devDependencies: { zod: versao } })).toEqual([]);
    },
  );

  it.each([
    ["overrides", { overrides: { zod: "1.0.0" } }],
    ["pnpm.overrides", { pnpm: { overrides: { zod: "1.0.0" } } }],
    ["resolutions", { resolutions: { zod: "1.0.0" } }],
  ] as [string, Pacote][])("acusa %s no package.json (caso negativo)", (campo, pacote) => {
    expect(overridesProibidos(pacote)).toEqual([campo]);
  });

  it("não acusa overrides vazios nem ausentes", () => {
    expect(overridesProibidos({ overrides: {}, pnpm: {} })).toEqual([]);
  });

  it("acusa pacote do workspace sem lista (caso negativo) e aceita os listados", () => {
    expect(pacotesDoWorkspaceSemLista('packages:\n  - "processamento"\n  - web\n  - "novo"\nallowBuilds:\n  esbuild: true\n')).toEqual([
      "novo/package.json",
    ]);
    expect(pacotesDoWorkspaceSemLista('packages:\n  - "processamento"\n  - "web"\n')).toEqual([]);
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
