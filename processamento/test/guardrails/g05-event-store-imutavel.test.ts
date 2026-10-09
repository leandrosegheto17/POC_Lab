import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// G-05: o event store local é imutável. Nenhum UPDATE/DELETE em `pedido`,
// `vinculo_fonte` e `evento` fora de test/; correção é nova importação.

const SRC = path.resolve(import.meta.dirname, "../../src");
const ARQUIVO_DDL_LEITURA = "leitura-d1.sql";
// Nome da tabela do event store, com aspas/crases/colchetes e prefixo de schema opcionais.
const TABELA =
  "(?:[\"`\\[]?\\w+[\"`\\]]?\\s*\\.\\s*)?[\"`\\[]?(?:pedido|vinculo_fonte|evento)[\"`\\]]?(?!\\w)";
const ESCRITA_PROIBIDA = [
  new RegExp(`\\bUPDATE\\s+(?:OR\\s+\\w+\\s+)?${TABELA}`, "i"),
  new RegExp(`\\bDELETE\\s+FROM\\s+${TABELA}`, "i"),
  new RegExp(`\\b(?:INSERT\\s+OR\\s+REPLACE|REPLACE)\\s+INTO\\s+${TABELA}`, "i"),
  new RegExp(`\\bINSERT\\s+(?:OR\\s+\\w+\\s+)?INTO\\s+${TABELA}(?:'[^']*'|"[^"]*"|[^;])*?\\bDO\\s+UPDATE\\b`, "i"),
];
// DDL de tabela só no DDL de leitura do D1 (recriado a cada publicação); no armazenamento local
// só `CREATE TABLE IF NOT EXISTS`. ALTER TABLE (inclui RENAME) nas tabelas do event store e
// PRAGMA writable_schema também são proibidos.
// Limitação: a checagem é textual; SQL montado por template/concatenação não é visto.
const DDL_PROIBIDO = [
  /\bDROP\s+TABLE\b/i,
  /\bCREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/i,
  new RegExp(`\\bALTER\\s+TABLE\\s+${TABELA}`, "i"),
  /\bPRAGMA\s+(?:\w+\s*\.\s*)?writable_schema\b/i,
];

// Remove comentários de linha (`//`, `--`) e de bloco que ficam fora de strings ('', "", ``).
function semComentarios(texto: string): string {
  let saida = "";
  let aspa: string | null = null;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i);
    const par = texto.slice(i, i + 2);
    if (aspa) {
      saida += c;
      if (c === "\\" && i + 1 < texto.length) saida += texto.charAt(++i);
      else if (c === aspa) aspa = null;
      else if (c === "\n" && aspa !== "`") aspa = null;
    } else if (c === "'" || c === '"' || c === "`") {
      aspa = c;
      saida += c;
    } else if (par === "/*") {
      const fim = texto.indexOf("*/", i + 2);
      i = fim < 0 ? texto.length : fim + 1;
      saida += " ";
    } else if (par === "//" || (par === "--" && (i === 0 || /\s/.test(texto.charAt(i - 1))))) {
      while (i < texto.length && texto.charAt(i) !== "\n") i++;
      saida += "\n";
    } else {
      saida += c;
    }
  }
  return saida;
}

function violacoesG05(texto: string, arquivo = ""): string[] {
  const codigo = semComentarios(texto);
  const regras = path.basename(arquivo) === ARQUIVO_DDL_LEITURA ? ESCRITA_PROIBIDA : [...ESCRITA_PROIBIDA, ...DDL_PROIBIDO];
  return regras.filter((re) => re.test(codigo)).map((re) => re.source);
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
      .filter((f) => violacoesG05(readFileSync(f, "utf8"), f).length > 0)
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
    expect(violacoesG05("UPDATE pedido_resumo SET x = 1")).toEqual([]);
  });

  it.each([
    'UPDATE "pedido" SET x = 1',
    "UPDATE `evento` SET x = 1",
    "UPDATE [vinculo_fonte] SET x = 1",
    "UPDATE main.pedido SET x = 1",
    'DELETE FROM "main"."evento"',
    "DELETE FROM `pedido`",
    "DELETE FROM [vinculo_fonte]",
    "DELETE FROM main.evento",
  ])("detecta nome entre aspas/qualificado: %s (caso negativo)", (sql) => {
    expect(violacoesG05(sql)).not.toEqual([]);
  });

  it.each([
    "INSERT OR REPLACE INTO pedido (id_pedido) VALUES (1)",
    "REPLACE INTO vinculo_fonte (a) VALUES (1)",
    'replace into "evento" (a) values (1)',
    "INSERT INTO pedido (id_pedido) VALUES (1) ON CONFLICT DO UPDATE SET id_pedido = 2",
    "INSERT INTO vinculo_fonte (a) VALUES (1) ON CONFLICT(a) DO UPDATE SET a = 2",
    "INSERT INTO evento (a) VALUES (1)\n ON CONFLICT (a)\n DO UPDATE SET a = 2",
  ])("detecta REPLACE e DO UPDATE: %s (caso negativo)", (sql) => {
    expect(violacoesG05(sql)).not.toEqual([]);
  });

  it("não acusa ON CONFLICT DO NOTHING nem INSERT comum", () => {
    expect(violacoesG05("INSERT INTO pedido (a) VALUES (1) ON CONFLICT DO NOTHING")).toEqual([]);
    expect(violacoesG05("INSERT INTO evento (a) VALUES (1); UPDATE cache_ia SET x = 1")).toEqual([]);
  });

  it("detecta DROP/CREATE de tabela fora de leitura-d1.sql (caso negativo)", () => {
    expect(violacoesG05("DROP TABLE IF EXISTS pedido;", "src/armazenamento/schema.sql")).not.toEqual([]);
    expect(violacoesG05("CREATE TABLE evento (id INT);", "src/armazenamento/schema.sql")).not.toEqual([]);
    expect(violacoesG05("db.exec('DROP TABLE x')", "src/a.ts")).not.toEqual([]);
  });

  it("aceita CREATE TABLE IF NOT EXISTS e o DDL de leitura-d1.sql", () => {
    expect(violacoesG05("CREATE TABLE IF NOT EXISTS pedido (id INT);", "src/armazenamento/schema.sql")).toEqual([]);
    const ddl = "DROP TABLE IF EXISTS pedido_resumo;\nCREATE TABLE pedido_resumo (id INT);";
    expect(violacoesG05(ddl, "src/publicacao/leitura-d1.sql")).toEqual([]);
  });

  it.each([
    "ALTER TABLE pedido ADD COLUMN x TEXT",
    "alter table evento rename to evento_old",
    'ALTER TABLE "main"."vinculo_fonte" RENAME COLUMN a TO b',
    "ALTER TABLE [pedido] DROP COLUMN x",
  ])("detecta ALTER TABLE: %s (caso negativo)", (sql) => {
    expect(violacoesG05(sql, "src/armazenamento/schema.sql")).not.toEqual([]);
  });

  it.each(["PRAGMA writable_schema = 1", "pragma main.writable_schema=ON", "PRAGMA writable_schema;"])(
    "detecta PRAGMA writable_schema: %s (caso negativo)",
    (sql) => {
      expect(violacoesG05(sql, "src/a.ts")).not.toEqual([]);
    },
  );

  it("não acusa ALTER TABLE em tabela de leitura nem PRAGMA comum", () => {
    expect(violacoesG05("ALTER TABLE pedido_resumo ADD COLUMN x TEXT", "src/a.ts")).toEqual([]);
    expect(violacoesG05("PRAGMA foreign_keys = ON", "src/a.ts")).toEqual([]);
  });

  it("detecta DO UPDATE mesmo com ponto e vírgula em string do VALUES (caso negativo)", () => {
    expect(violacoesG05(`INSERT INTO pedido (a) VALUES ('x;y') ON CONFLICT(a) DO UPDATE SET a = 2`)).not.toEqual([]);
    expect(violacoesG05(`db.run("INSERT INTO evento (a) VALUES ('x;y') ON CONFLICT DO UPDATE SET a = 2")`)).not.toEqual([]);
  });

  it("detecta DO UPDATE com aspas escapadas por barra ou desbalanceadas (caso negativo)", () => {
    expect(violacoesG05(`'INSERT INTO evento (a) VALUES ('it's') ON CONFLICT(a) DO UPDATE SET a = 2'`)).not.toEqual([]);
    expect(violacoesG05(`INSERT INTO pedido (a) VALUES ('it\\'s') ON CONFLICT(a) DO UPDATE SET a = 2`)).not.toEqual([]);
    expect(violacoesG05(`INSERT INTO evento (a) VALUES ('x) ON CONFLICT(a) DO UPDATE SET a = 2`)).not.toEqual([]);
    expect(violacoesG05(`INSERT INTO evento (a) VALUES ("x) ON CONFLICT(a) DO UPDATE SET a = 2`)).not.toEqual([]);
  });

  it("não atravessa instrução: DO UPDATE em outra tabela não acusa", () => {
    expect(violacoesG05("INSERT INTO pedido (a) VALUES ('x;y'); INSERT INTO cache_ia (a) VALUES (1) ON CONFLICT DO UPDATE SET a = 2")).toEqual([]);
  });

  it("detecta violação após // ou -- dentro de string na mesma linha (caso negativo)", () => {
    expect(violacoesG05(`const u = "http://x"; db.run("UPDATE pedido SET a = 1");`)).not.toEqual([]);
    expect(violacoesG05(`const s = "-- "; db.run("DELETE FROM evento");`)).not.toEqual([]);
    expect(violacoesG05(`const s = '//'; db.run('UPDATE evento SET a = 1');`)).not.toEqual([]);
  });

  it("continua ignorando comentário real com apóstrofo e comentário de bloco", () => {
    expect(violacoesG05("// não faça UPDATE pedido\nconst x = 1;")).toEqual([]);
    expect(violacoesG05("x = 1; // DELETE FROM evento\n-- don't UPDATE pedido\n/* REPLACE INTO evento */")).toEqual([]);
  });
});
