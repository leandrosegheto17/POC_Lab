import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { criarRepositorio } from "../armazenamento/repositorio.js";
import { montarSqlPublicacao } from "../publicacao/publicar.js";
import { obterSemente } from "./gerar.js";

/**
 * TP-0044 — CLI `publicar-dados`: monta as projeções do Lote 7, escreve
 * `dados/publicacao/leitura.sql` e carrega o resultado no D1 LOCAL do
 * pacote `web` (`wrangler d1 execute poc-lab --local`), sem conta nem
 * credencial — nunca `--remote`, nunca lê variável de ambiente de
 * credencial.
 *
 * Script interno (não exposto como comando de primeiro nível ao usuário
 * final): roda depois de `pnpm importar` já ter populado
 * `dados/poc_lab.sqlite`, e antes de `pnpm dev` no pacote `web` (mesma
 * pasta `.wrangler/state` é usada pelo `--local`, então os dados ficam
 * visíveis para o `dev` seguinte sem nenhum passo extra).
 */

/** Caminho padrão do event store já populado por `pnpm importar`. */
export const CAMINHO_BANCO_PADRAO = path.join("dados", "poc_lab.sqlite");

/** Diretório/arquivo padrão de saída do SQL de publicação. */
export const DIR_PUBLICACAO_PADRAO = path.join("dados", "publicacao");
export const NOME_ARQUIVO_LEITURA_SQL = "leitura.sql";

/**
 * Caminho padrão do pacote `web`, onde `wrangler` é invocado — relativo à
 * raiz do pacote `processamento` (não à raiz do monorepo), já que é este o
 * cwd real do processo quando rodado via `pnpm --filter processamento run
 * preparar`.
 */
export const CAMINHO_WEB_PADRAO = path.join("..", "web");

/** Resultado de rodar o `wrangler d1 execute` (ou qualquer função que o substitua em teste). */
export type ResultadoExecucaoWrangler = {
  codigo: number;
  stdout: string;
  stderr: string;
};

/**
 * Roda `wrangler d1 execute poc-lab --local --file <caminhoArquivo>` com
 * `cwd` em `cwdWeb` (pacote `web`, onde `wrangler.jsonc` define o binding
 * `poc-lab`). NUNCA usa `--remote` nem lê nenhuma variável de ambiente de
 * credencial — só opera sobre o D1 local (`.wrangler/state`).
 *
 * Extraída como função própria (em vez de inline no fluxo principal) para
 * que o teste automatizado possa substituí-la por uma versão fake, sem
 * depender do `wrangler` real instalado/configurado.
 */
export function executarWrangler(
  caminhoArquivo: string,
  cwdWeb: string,
  executar: typeof execFileSync = execFileSync,
): ResultadoExecucaoWrangler {
  try {
    // Sem shell: o bin do wrangler (instalado em `web`) roda via o próprio
    // Node, então caminho com espaço ou `&` chega intacto como argumento.
    const binWrangler = path.resolve(cwdWeb, "node_modules", "wrangler", "bin", "wrangler.js");
    const stdout = executar(
      process.execPath,
      [binWrangler, "d1", "execute", "poc-lab", "--local", "--file", path.resolve(caminhoArquivo)],
      { cwd: cwdWeb, encoding: "utf8" },
    );
    return { codigo: 0, stdout, stderr: "" };
  } catch (erro) {
    const erroProcesso = erro as {
      status?: number | null;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    return {
      codigo: erroProcesso.status ?? 1,
      stdout: erroProcesso.stdout?.toString() ?? "",
      stderr: erroProcesso.stderr?.toString() ?? erroProcesso.message ?? "",
    };
  }
}

/** Dependências injetáveis de `publicarDados` — permite substituir I/O real em teste. */
export type DependenciasPublicarDados = {
  criarRepositorio: typeof criarRepositorio;
  escreverArquivo: (caminho: string, conteudo: string) => void;
  criarDiretorio: (caminho: string) => void;
  executarWrangler: (caminhoArquivo: string, cwdWeb: string) => ResultadoExecucaoWrangler;
};

const DEPENDENCIAS_PADRAO: DependenciasPublicarDados = {
  criarRepositorio,
  escreverArquivo: (caminho, conteudo) => writeFileSync(caminho, conteudo, "utf8"),
  criarDiretorio: (caminho) => mkdirSync(caminho, { recursive: true }),
  executarWrangler,
};

export type ArgsPublicarDados = {
  semente: number;
  caminhoBanco: string;
  diretorioPublicacao: string;
  caminhoWeb: string;
};

/**
 * Executa o fluxo completo: abre o repositório, monta o SQL de publicação,
 * escreve `leitura.sql` em disco e carrega no D1 local via `wrangler d1
 * execute --local`. Lança erro (nunca falha silenciosamente) com mensagem
 * clara — incluindo stdout/stderr do `wrangler` — quando a carga falha.
 *
 * `dependencias` é injetável para que o teste automatizado substitua
 * `executarWrangler` (e, se necessário, os demais pontos de I/O) sem rodar
 * processo externo real.
 */
export function publicarDados(
  args: ArgsPublicarDados,
  dependencias: Partial<DependenciasPublicarDados> = {},
): void {
  const deps = { ...DEPENDENCIAS_PADRAO, ...dependencias };

  const repositorio = deps.criarRepositorio(args.caminhoBanco);
  let sql: string;
  try {
    sql = montarSqlPublicacao(repositorio.db, { semente: args.semente });
  } finally {
    // Fecha esta conexão assim que a leitura termina — em Windows, um
    // handle aberto no arquivo do banco trava o `rmSync` do diretório
    // temporário nos testes de integração que encadeiam este passo dentro
    // de `executarPreparar` (TP-0045/TP-0083, `test/integracao/preparar.test.ts`),
    // mesma convenção já aplicada ao passo 3 (`criarRepositorio`/`importar`)
    // e ao passo 4 (`executarSugerir`).
    repositorio.db.close();
  }

  deps.criarDiretorio(args.diretorioPublicacao);
  const caminhoArquivo = path.join(args.diretorioPublicacao, NOME_ARQUIVO_LEITURA_SQL);
  deps.escreverArquivo(caminhoArquivo, sql);

  const resultado = deps.executarWrangler(caminhoArquivo, args.caminhoWeb);

  if (resultado.codigo !== 0) {
    throw new Error(
      `Falha ao carregar "${caminhoArquivo}" no D1 local (wrangler d1 execute poc-lab --local) ` +
        `— código de saída ${resultado.codigo}.\n` +
        `--- stdout ---\n${resultado.stdout}\n` +
        `--- stderr ---\n${resultado.stderr}`,
    );
  }
}

async function main(): Promise<void> {
  try {
    const semente = obterSemente(process.argv.slice(2));

    publicarDados({
      semente,
      caminhoBanco: CAMINHO_BANCO_PADRAO,
      diretorioPublicacao: DIR_PUBLICACAO_PADRAO,
      caminhoWeb: CAMINHO_WEB_PADRAO,
    });

    console.log(
      `Dados publicados com semente ${semente}: ` +
        `"${path.join(DIR_PUBLICACAO_PADRAO, NOME_ARQUIVO_LEITURA_SQL)}" gerado e carregado no D1 local (poc-lab).`,
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao publicar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
