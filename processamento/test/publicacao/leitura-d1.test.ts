import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TP-0032 — Testa o DDL das visões de leitura do D1.
 *
 * Mesmo padrão de armazenamento/repositorio.test.ts: lê o `.sql` do disco e
 * aplica via `db.exec(...)` numa conexão `node:sqlite` em memória.
 */

const CAMINHO_SQL = join(
  import.meta.dirname,
  "../../src/publicacao/leitura-d1.sql",
);

function lerSqlLeituraD1(): string {
  return readFileSync(CAMINHO_SQL, "utf8");
}

function listarTabelas(db: DatabaseSync): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((linha) => linha.name as string);
}

function planoDe(db: DatabaseSync, sql: string, parametro: string): string {
  const linhas = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(parametro);
  return linhas.map((linha) => String((linha as { detail: unknown }).detail)).join("\n");
}

describe("leitura-d1.sql (DDL das visões de leitura do D1)", () => {
  it("aplicado 1x cria as 5 tabelas, sem erro", () => {
    const db = new DatabaseSync(":memory:");
    const sql = lerSqlLeituraD1();

    expect(() => db.exec(sql)).not.toThrow();

    expect(listarTabelas(db)).toEqual([
      "divergencia",
      "documento",
      "linha_do_tempo",
      "pedido_resumo",
      "vinculo_codigo",
    ]);
  });

  it("aplicado 2x seguidas na mesma conexão não lança erro (DROP IF EXISTS + CREATE)", () => {
    const db = new DatabaseSync(":memory:");
    const sql = lerSqlLeituraD1();

    db.exec(sql);

    expect(() => db.exec(sql)).not.toThrow();
    expect(listarTabelas(db)).toEqual([
      "divergencia",
      "documento",
      "linha_do_tempo",
      "pedido_resumo",
      "vinculo_codigo",
    ]);
  });

  it("não contém BEGIN nem COMMIT", () => {
    const sql = lerSqlLeituraD1();

    expect(sql).not.toMatch(/\bBEGIN\b/i);
    expect(sql).not.toMatch(/\bCOMMIT\b/i);
  });

  describe("índices/PKs usados pelas consultas das visões", () => {
    function montarBancoComFixture(): DatabaseSync {
      const db = new DatabaseSync(":memory:");
      db.exec(lerSqlLeituraD1());

      db.prepare(
        `INSERT INTO pedido_resumo (id_pedido, valor_devido, valor_pago, data_limite, situacao_pagamento, fontes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run("PED-000001", 100, 100, "2026-01-01", "pago", "vendas,pagamentos");

      db.prepare(
        `INSERT INTO vinculo_codigo (codigo, fonte, id_pedido) VALUES (?, ?, ?)`,
      ).run("VENDA-001", "vendas", "PED-000001");

      db.prepare(
        `INSERT INTO linha_do_tempo (id_pedido, posicao, codigo_evento, fonte, tipo, momento_fato, versao_schema, dados, fora_de_ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run("PED-000001", 1, "EV-001", "vendas", "venda_criada", "2026-01-01T00:00:00Z", 1, "{}", 0);

      db.prepare(
        `INSERT INTO divergencia (tipo, id_pedido, motivo, eventos) VALUES (?, ?, ?, ?)`,
      ).run("atraso", "PED-000001", "pagamento após data limite", "EV-001");

      db.prepare(`INSERT INTO documento (chave, conteudo) VALUES (?, ?)`).run(
        "PED-000001",
        "{}",
      );

      return db;
    }

    it("consulta por código em vinculo_codigo usa a PK, não SCAN", () => {
      const db = montarBancoComFixture();

      const plano = planoDe(
        db,
        "SELECT * FROM vinculo_codigo WHERE codigo = ?",
        "VENDA-001",
      );

      expect(plano).not.toMatch(/SCAN TABLE vinculo_codigo/i);
      expect(plano).toMatch(/USING (PRIMARY KEY|INDEX)/i);
    });

    it("consulta por pedido em divergencia usa idx_divergencia_pedido_tipo, não SCAN", () => {
      const db = montarBancoComFixture();

      const plano = planoDe(
        db,
        "SELECT * FROM divergencia WHERE id_pedido = ?",
        "PED-000001",
      );

      expect(plano).not.toMatch(/SCAN TABLE divergencia/i);
      expect(plano).toMatch(/idx_divergencia_pedido_tipo/i);
    });

    it("consulta por tipo em divergencia usa a PK (tipo, id_pedido), não SCAN", () => {
      const db = montarBancoComFixture();

      const plano = planoDe(
        db,
        "SELECT * FROM divergencia WHERE tipo = ?",
        "atraso",
      );

      expect(plano).not.toMatch(/SCAN TABLE divergencia/i);
      expect(plano).toMatch(/USING (PRIMARY KEY|INDEX)/i);
    });

    it("consulta por pedido em linha_do_tempo usa a PK (id_pedido, posicao) como prefixo, não SCAN", () => {
      const db = montarBancoComFixture();

      const plano = planoDe(
        db,
        "SELECT * FROM linha_do_tempo WHERE id_pedido = ?",
        "PED-000001",
      );

      expect(plano).not.toMatch(/SCAN TABLE linha_do_tempo/i);
      expect(plano).toMatch(/USING (PRIMARY KEY|INDEX)/i);
    });
  });
});
