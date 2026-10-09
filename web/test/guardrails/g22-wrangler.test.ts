import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// G-22: custo adicional zero. O wrangler.jsonc só pode ter o binding D1 `DB`
// (mais as chaves de execução do Worker); nada de KV, R2, IA, vars etc.

const WRANGLER = path.resolve(import.meta.dirname, "../../wrangler.jsonc");

const CHAVES_PERMITIDAS = new Set([
  "$schema",
  "name",
  "main",
  "compatibility_date",
  "compatibility_flags",
  "assets",
  "d1_databases",
]);

// JSONC sem dependência nova: tira comentários (respeitando strings) e vírgulas finais.
function jsoncParaJson(texto: string): string {
  let saida = "";
  let i = 0;
  while (i < texto.length) {
    const c = texto[i] as string;
    const prox = texto[i + 1];
    if (c === '"') {
      let j = i + 1;
      while (j < texto.length && texto[j] !== '"') j += texto[j] === "\\" ? 2 : 1;
      saida += texto.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && prox === "/") {
      while (i < texto.length && texto[i] !== "\n") i++;
    } else if (c === "/" && prox === "*") {
      const fim = texto.indexOf("*/", i + 2);
      i = fim === -1 ? texto.length : fim + 2;
    } else {
      saida += c;
      i++;
    }
  }
  return saida.replace(/,(\s*[}\]])/g, "$1");
}

function violacoesG22(textoJsonc: string): string[] {
  const config = JSON.parse(jsoncParaJson(textoJsonc)) as Record<string, unknown>;
  const problemas = Object.keys(config)
    .filter((k) => !CHAVES_PERMITIDAS.has(k))
    .map((k) => `chave não permitida: ${k}`);
  const d1 = config.d1_databases;
  if (!Array.isArray(d1) || d1.length !== 1 || (d1[0] as { binding?: string }).binding !== "DB") {
    problemas.push("d1_databases deve ter exatamente um binding: DB");
  }
  return problemas;
}

describe("guardrail G-22 — custo adicional zero no wrangler.jsonc", () => {
  it("web/wrangler.jsonc só tem o binding DB e nenhum outro recurso", () => {
    expect(
      violacoesG22(readFileSync(WRANGLER, "utf8")),
      "G-22: nenhum binding, var ou serviço além do D1 `DB`",
    ).toEqual([]);
  });

  it.each(["kv_namespaces", "r2_buckets", "ai", "vars", "queues", "durable_objects"])(
    "acusa %s (caso negativo)",
    (chave) => {
      const texto = `{ "name": "x", "d1_databases": [{ "binding": "DB" }], "${chave}": {} }`;
      expect(violacoesG22(texto)).toEqual([`chave não permitida: ${chave}`]);
    },
  );

  it("acusa binding D1 diferente de DB ou D1 extra (caso negativo)", () => {
    expect(violacoesG22('{ "d1_databases": [{ "binding": "OUTRO" }] }')).not.toEqual([]);
    expect(violacoesG22('{ "d1_databases": [{ "binding": "DB" }, { "binding": "X" }] }')).not.toEqual([]);
  });

  it("lê JSONC com comentários e vírgula final", () => {
    const texto = '{ // c\n "d1_databases": [{ "binding": "DB", /* x */ "u": "http://a//b", },], }';
    expect(violacoesG22(texto)).toEqual([]);
  });
});
