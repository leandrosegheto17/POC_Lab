// Publicação manual (nunca pelo CI): `dados` (D1 remoto), `site` (Worker) ou os dois.
// Uso: node scripts/publicar.mjs dados|site|tudo
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR_PROCESSAMENTO = path.join(RAIZ, "processamento");
const DIR_WEB = path.join(RAIZ, "web");
const CAMINHO_LEITURA_SQL = path.join(DIR_PROCESSAMENTO, "dados", "publicacao", "leitura.sql");
const CAMINHO_BOOKMARK = path.join(DIR_PROCESSAMENTO, "dados", "publicacao", "ultimo-bookmark.txt");
const NOME_BANCO = "poc-lab";

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

/**
 * Extrai o `version` do banco da saída de `wrangler d1 list --json` (lista de bancos);
 * undefined se o banco não aparece ou a saída é inválida. O `d1 info` não devolve o campo.
 */
export function lerVersaoBanco(saidaJson, nomeBanco = NOME_BANCO) {
  try {
    const banco = JSON.parse(saidaJson).find((b) => b?.name === nomeBanco);
    return typeof banco?.version === "string" && banco.version !== "" ? banco.version : undefined;
  } catch {
    return undefined;
  }
}

/** Extrai o bookmark da saída de `wrangler d1 time-travel info --json`; undefined se inválida. */
export function lerBookmark(saidaJson) {
  try {
    const bookmark = JSON.parse(saidaJson)?.bookmark;
    return typeof bookmark === "string" && bookmark !== "" ? bookmark : undefined;
  } catch {
    return undefined;
  }
}

function criarPassosDados({ executar, lerArquivo, escreverArquivo, log }) {
  const wrangler = (args) =>
    executar(process.execPath, [BIN_WRANGLER, ...args, "--config", "wrangler.jsonc"], {
      cwd: DIR_WEB,
      encoding: "utf8",
    });
  let idLocal;
  let pularCarga = false;
  let bookmark;
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
      nome: "conferir version production do D1",
      rodar: () => {
        if (pularCarga) return;
        const versao = lerVersaoBanco(wrangler(["d1", "list", "--json"]));
        if (versao !== "production") {
          throw new Error(
            `o banco ${NOME_BANCO} está com version "${String(versao)}" (esperado "production"); ` +
              "o Time Travel não funciona assim. Registre o desvio em BLOCKERS.md. A carga não rodou.",
          );
        }
      },
    },
    {
      nome: "guardar bookmark do Time Travel",
      rodar: () => {
        if (pularCarga) return;
        bookmark = lerBookmark(wrangler(["d1", "time-travel", "info", NOME_BANCO, "--json"]));
        if (bookmark === undefined) {
          throw new Error("bookmark do Time Travel não encontrado na saída do wrangler. A carga não rodou.");
        }
        escreverArquivo(CAMINHO_BOOKMARK, `${bookmark}\n`);
        log(`bookmark do Time Travel antes da carga: ${bookmark} (salvo em ${CAMINHO_BOOKMARK})`);
      },
    },
    {
      nome: "carregar leitura.sql no D1 remoto",
      rodar: () => {
        if (pularCarga) {
          log(`dados já publicados (idPublicacao ${idLocal})`);
          return;
        }
        try {
          wrangler(["d1", "execute", "poc-lab", "--remote", "--file", CAMINHO_LEITURA_SQL]);
        } catch (erro) {
          const detalhe = erro instanceof Error ? erro.message : String(erro);
          throw new Error(
            `${detalhe}\nBookmark anterior à carga: ${bookmark}\n` +
              `Para voltar: wrangler d1 time-travel restore ${NOME_BANCO} --bookmark ${bookmark}\n` +
              "Ou rode pnpm publicar de novo (a carga recria tudo).",
            { cause: erro },
          );
        }
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
    escreverArquivo:
      dependencias.escreverArquivo ??
      ((caminho, conteudo) => {
        mkdirSync(path.dirname(caminho), { recursive: true });
        writeFileSync(caminho, conteudo, "utf8");
      }),
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
