import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

describe("ambiente de execução", () => {
  it("abre node:sqlite em memória e faz round-trip de dados sem build prévio", () => {
    const db = new DatabaseSync(":memory:");

    db.exec(`
      CREATE TABLE registro (
        id INTEGER PRIMARY KEY,
        valor TEXT NOT NULL
      )
    `);

    db.prepare("INSERT INTO registro (id, valor) VALUES (?, ?)").run(1, "ok");

    const linha = db
      .prepare("SELECT id, valor FROM registro WHERE id = ?")
      .get(1) as { id: number; valor: string } | undefined;

    expect(linha).toBeDefined();
    expect(linha?.id).toBe(1);
    expect(linha?.valor).toBe("ok");

    db.close();
  });
});
