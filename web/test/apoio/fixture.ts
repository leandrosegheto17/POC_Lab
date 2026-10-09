// Fixture reutilizável: monta um `D1Teste` (ver `./d1-teste.ts`)
// já carregado com o DDL de `leitura-d1.sql` + os dados de
// exemplo (`./dados-exemplo.ts`) ou um dataset próprio, via o mesmo escritor
// de SQL de publicação usado em produção (`escreverSqlPublicacao`) — para que o dataset
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
//
// Verificação (2026-10-08): sob o pool de testes do Vitest (transformado via
// `vite-node`/SSR), `import.meta.resolve` chega como `undefined` no módulo
// transformado (`__vite_ssr_import_meta__.resolve is not a function`) — Vite
// não implementa esse método no objeto `import.meta` sintético que injeta.
// `createRequire(import.meta.url).resolve(...)` faz a mesma resolução pelo
// campo `exports` de `processamento/package.json`, mas por `node:module`
// (não passa pela transformação de `import.meta` do Vite), e funciona tanto
// em teste quanto em execução Node direta.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

import {
  escreverSqlPublicacao,
  type TabelasParaPublicacao,
} from "processamento/publicacao/escritor-sql.js";

import { D1Teste } from "./d1-teste.js";
import { DADOS_EXEMPLO } from "./dados-exemplo.js";

function lerDdl(): string {
  const caminhoDdl = createRequire(import.meta.url).resolve(
    "processamento/publicacao/leitura-d1.sql",
  );
  return readFileSync(caminhoDdl, "utf8");
}

/**
 * Cria um `D1Teste` com o DDL de `leitura-d1.sql` + `INSERT`s das `tabelas`
 * informadas, gerados por `escreverSqlPublicacao` e carregados numa conexão
 * `node:sqlite` nova em memória. Serve aos testes que precisam de um dataset
 * próprio (ex.: eventos com payload válido contra o contrato).
 */
export function criarD1TesteComTabelas(tabelas: TabelasParaPublicacao): D1Teste {
  const ddl = lerDdl();
  const sql = escreverSqlPublicacao(ddl, tabelas);

  const db = new DatabaseSync(":memory:");
  db.exec(sql);

  return new D1Teste(db);
}

/**
 * Cria um `D1Teste` pronto para ser injetado como `env.DB` nos testes das
 * rotas do Worker, carregado com `DADOS_EXEMPLO`.
 */
export function criarD1Teste(): D1Teste {
  return criarD1TesteComTabelas(DADOS_EXEMPLO);
}
