import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// G-05: o event store local é imutável. Nenhum UPDATE/DELETE em `pedido`,
// `vinculo_fonte` e `evento` fora de test/; correção é nova importação.

const SRC = path.resolve(import.meta.dirname, "../../src");
const TABELAS = "(?:pedido|vinculo_fonte|evento)";
const ESCRITA_PROIBIDA = [
  new RegExp(`\\bUPDATE\\s+(?:OR\\s+\\w+\\s+)?${TABELAS}\\b`, "i"),
  new RegExp(`\\bDELETE\\s+FROM\\s+${TABELAS}\\b`, "i"),
];

function semComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)(\/\/|--).*$/gm, "$1");
}

function violacoesG05(texto: string): string[] {
  const codigo = semComentarios(texto);
  return ESCRITA_PROIBIDA.filter((re) => re.test(codigo)).map((re) => re.source);
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

describe("guardrail G-05 — event store imutável", () => {
  it("nenhum arquivo de processamento/src escreve UPDATE/DELETE nas tabelas do event store", () => {
    const violadores = arquivos(SRC)
      .filter((f) => /\.(ts|sql)$/.test(f))
      .filter((f) => violacoesG05(readFileSync(f, "utf8")).length > 0)
      .map((f) => path.relative(SRC, f));
    expect(violadores, "G-05: UPDATE/DELETE em tabela do event store; correção é nova importação").toEqual([]);
  });

  it("detecta UPDATE em pedido (caso negativo)", () => {
    expect(violacoesG05("db.prepare('UPDATE pedido SET x = 1')")).not.toEqual([]);
  });

  it("detecta DELETE FROM em evento e vinculo_fonte (caso negativo)", () => {
    expect(violacoesG05("DELETE FROM evento WHERE id = 1;")).not.toEqual([]);
    expect(violacoesG05("delete from vinculo_fonte")).not.toEqual([]);
  });

  it("ignora comentários e outros usos de update (hash.update)", () => {
    const ok = "// nunca UPDATE pedido\n/* DELETE FROM evento */\n-- UPDATE evento\nhash.update(x);";
    expect(violacoesG05(ok)).toEqual([]);
  });

  it("não acusa tabelas de leitura do D1", () => {
    expect(violacoesG05("DELETE FROM leitura_pedido")).toEqual([]);
  });
});
