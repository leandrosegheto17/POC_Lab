import assert from "node:assert/strict";
import { test } from "node:test";

import { copiaEstaAtual } from "./sincronizar-ddl-web.mjs";

test("a cópia do DDL na fixture do web é igual ao DDL de processamento", () => {
  assert.equal(copiaEstaAtual(), true);
});
