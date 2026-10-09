import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { DDL, INSERCOES } from "./fixture.js";

describe("INSERCOES da fixture", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(DDL);

  for (const [tabela, { colunas }] of Object.entries(INSERCOES)) {
    it(`as colunas de ${tabela} coincidem com o DDL (nomes e ordem)`, () => {
      const doDdl = (db.prepare("SELECT name FROM pragma_table_info(?) ORDER BY cid").all(tabela) as { name: string }[]).map(
        (coluna) => coluna.name,
      );
      expect(colunas).toEqual(doDdl);
    });
  }
});
