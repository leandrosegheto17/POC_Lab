// Copia o DDL de leitura do D1 (fonte: processamento) para a fixture do web,
// para os testes do web não importarem `processamento`.
//   node scripts/sincronizar-ddl-web.mjs          regrava a cópia
//   node scripts/sincronizar-ddl-web.mjs --check  só confere (sai com 1 se diferir)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ORIGEM = join(RAIZ, "processamento", "src", "publicacao", "leitura-d1.sql");
export const DESTINO = join(RAIZ, "web", "test", "apoio", "leitura-d1.sql");

export function copiaEstaAtual() {
  return readFileSync(ORIGEM, "utf8") === readFileSync(DESTINO, "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    if (!copiaEstaAtual()) {
      console.error("web/test/apoio/leitura-d1.sql desatualizado: rode `node scripts/sincronizar-ddl-web.mjs`.");
      process.exit(1);
    }
  } else {
    writeFileSync(DESTINO, readFileSync(ORIGEM, "utf8"));
  }
}
