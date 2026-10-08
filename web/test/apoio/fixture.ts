// TP-0043 — Fixture reutilizável: monta um `D1Teste` (ver `./d1-teste.ts`)
// já carregado com o DDL de `leitura-d1.sql` (TP-0032) + os dados de
// exemplo (`./dados-exemplo.ts`), via o mesmo escritor de SQL de publicação
// usado em produção (`escreverSqlPublicacao`, TP-0040) — para que o dataset
// de teste passe pelo mesmo caminho de serialização que os dados reais.
//
// `node:fs` só é lido aqui porque este arquivo vive em `web/test/` (mesma
// exceção documentada em `d1-teste.ts`/`eslint.config.js` para `node:*`
// dentro de `test/`).
//
// Import de módulo TS (`escreverSqlPublicacao`) via especificador de
// pacote (`processamento/publicacao/escritor-sql.js`), resolvido pelo
// campo `exports` de `processamento/package.json` através do symlink do
// workspace — não sujeito à checagem de `rootDir` do `web/tsconfig.json`.
// Já a leitura do `.sql` é feita via `node:fs` (não é um import de módulo
// TypeScript, então nunca esteve sujeita a `TS6059`); mantemos o caminho
// resolvido por `import.meta.resolve`, que também respeita o `exports` de
// `processamento/package.json`, em vez de caminho relativo entre pacotes —
// assim o caminho não depende de a estrutura de diretórios de `processamento`
// não mudar.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { escreverSqlPublicacao } from "processamento/publicacao/escritor-sql.js";

import { D1Teste } from "./d1-teste.js";
import { DADOS_EXEMPLO } from "./dados-exemplo.js";

function lerDdl(): string {
  const caminhoDdl = import.meta.resolve(
    "processamento/publicacao/leitura-d1.sql",
  );
  return readFileSync(new URL(caminhoDdl), "utf8");
}

/**
 * Cria um `D1Teste` pronto para ser injetado como `env.DB` nos testes das
 * rotas do Worker: DDL de `leitura-d1.sql` + `INSERT`s de `DADOS_EXEMPLO`,
 * gerados por `escreverSqlPublicacao` e carregados numa conexão
 * `node:sqlite` nova em memória via `db.exec(...)`.
 */
export function criarD1Teste(): D1Teste {
  const ddl = lerDdl();
  const sql = escreverSqlPublicacao(ddl, DADOS_EXEMPLO);

  const db = new DatabaseSync(":memory:");
  db.exec(sql);

  return new D1Teste(db);
}
