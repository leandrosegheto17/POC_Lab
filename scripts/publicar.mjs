// Publicação manual (nunca pelo CI): `dados` (D1 remoto), `site` (Worker) ou os dois.
// Uso: node scripts/publicar.mjs dados|site|tudo
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR_PROCESSAMENTO = path.join(RAIZ, "processamento");
const DIR_WEB = path.join(RAIZ, "web");
const CAMINHO_LEITURA_SQL = path.join(DIR_PROCESSAMENTO, "dados", "publicacao", "leitura.sql");

const BIN_TSX = path.join(DIR_PROCESSAMENTO, "node_modules", "tsx", "dist", "cli.mjs");
const BIN_VITE = path.join(DIR_WEB, "node_modules", "vite", "bin", "vite.js");
const BIN_WRANGLER = path.join(DIR_WEB, "node_modules", "wrangler", "bin", "wrangler.js");

const CONSULTA_ID_REMOTO =
  "SELECT json_extract(conteudo,'$.idPublicacao') AS id FROM documento WHERE chave='resumo'";
const PADRAO_ID_LOCAL = /'resumo',\s*'\{[^\n]*?"idPublicacao":"([^"]+)"/;

/** Lê o idPublicacao do documento `resumo` no SQL de leitura local. */
export function lerIdLocal(conteudoSql) {
  const achado = PADRAO_ID_LOCAL.exec(conteudoSql);
  if (!achado) {
    throw new Error("idPublicacao do resumo não encontrado no leitura.sql local.");
  }
  return achado[1];
}

/** Extrai o idPublicacao da saída `--json` do wrangler; undefined se não houver resultado. */
export function lerIdRemoto(saidaJson) {
  try {
    const lista = JSON.parse(saidaJson);
    const id = lista?.[0]?.results?.[0]?.id;
    return typeof id === "string" && id !== "" ? id : undefined;
  } catch {
    return undefined;
  }
}

function criarPassosDados({ executar, lerArquivo, log }) {
  const wrangler = (args) =>
    executar(process.execPath, [BIN_WRANGLER, ...args, "--config", "wrangler.jsonc"], {
      cwd: DIR_WEB,
      encoding: "utf8",
    });
  let idLocal;
  let pularCarga = false;
  return [
    {
      nome: "preparar",
      rodar: () => {
        executar(process.execPath, [BIN_TSX, "src/cli/preparar.ts"], {
          cwd: DIR_PROCESSAMENTO,
          stdio: "inherit",
        });
      },
    },
    {
      nome: "ler idPublicacao local",
      rodar: () => {
        idLocal = lerIdLocal(lerArquivo(CAMINHO_LEITURA_SQL));
      },
    },
    {
      nome: "consultar idPublicacao remoto (somente leitura)",
      rodar: () => {
        let saida = "";
        try {
          saida = wrangler(["d1", "execute", "poc-lab", "--remote", "--json", "--command", CONSULTA_ID_REMOTO]);
        } catch {
          // Tabela/documento ainda inexistente no remoto: segue para a carga.
        }
        pularCarga = lerIdRemoto(saida) === idLocal;
      },
    },
    {
      nome: "carregar leitura.sql no D1 remoto",
      rodar: () => {
        if (pularCarga) {
          log(`dados já publicados (idPublicacao ${idLocal})`);
          return;
        }
        wrangler(["d1", "execute", "poc-lab", "--remote", "--file", CAMINHO_LEITURA_SQL]);
      },
    },
  ];
}

function criarPassosSite({ executar }) {
  return [
    {
      nome: "build do site",
      rodar: () => {
        executar(process.execPath, [BIN_VITE, "build"], { cwd: DIR_WEB, stdio: "inherit" });
      },
    },
    {
      nome: "wrangler deploy",
      rodar: () => {
        executar(process.execPath, [BIN_WRANGLER, "deploy", "--config", "wrangler.jsonc"], {
          cwd: DIR_WEB,
          stdio: "inherit",
        });
      },
    },
  ];
}

/** Monta os passos do alvo; no alvo `tudo` o D1 vem antes do Worker (ADR-015). */
export function montarPassos(alvo, ctx) {
  if (alvo === "dados") return criarPassosDados(ctx);
  if (alvo === "site") return criarPassosSite(ctx);
  if (alvo === "tudo") return [...criarPassosDados(ctx), ...criarPassosSite(ctx)];
  throw new Error(`Alvo inválido "${String(alvo)}". Use: dados, site ou tudo.`);
}

/** Roda os passos em ordem e para no primeiro erro, citando o passo. */
export function publicar(alvo, dependencias = {}) {
  const ctx = {
    executar: dependencias.executar ?? execFileSync,
    lerArquivo: dependencias.lerArquivo ?? ((caminho) => readFileSync(caminho, "utf8")),
    log: dependencias.log ?? console.log,
  };
  for (const passo of montarPassos(alvo, ctx)) {
    ctx.log(`> ${passo.nome}`);
    try {
      passo.rodar();
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      throw new Error(`Falha no passo "${passo.nome}": ${detalhe}`, { cause: erro });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    publicar(process.argv[2]);
  } catch (erro) {
    console.error(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  }
}
