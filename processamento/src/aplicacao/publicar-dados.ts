import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { criarRepositorio } from "../armazenamento/repositorio.js";
import { NOME_ARQUIVO_LEITURA_SQL } from "../config/caminhos.js";
import { montarSqlPublicacao } from "../publicacao/publicar.js";

/**
 * Passo "publicar-dados": monta as projeções, escreve `leitura.sql` e carrega o
 * resultado no D1 LOCAL do pacote `web` (`wrangler d1 execute poc-lab --local`),
 * sem conta nem credencial — nunca `--remote`, nunca lê variável de ambiente de
 * credencial.
 */

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
  escreverArquivo: (caminho, conteudo) => { writeFileSync(caminho, conteudo, "utf8"); },
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
    sql = montarSqlPublicacao(repositorio, { semente: args.semente });
  } finally {
    // Fecha a conexão assim que a leitura termina; em Windows, um handle
    // aberto no arquivo do banco trava o `rmSync` do diretório temporário.
    repositorio.fechar();
  }

  deps.criarDiretorio(args.diretorioPublicacao);
  const caminhoArquivo = path.join(args.diretorioPublicacao, NOME_ARQUIVO_LEITURA_SQL);
  deps.escreverArquivo(caminhoArquivo, sql);

  const resultado = deps.executarWrangler(caminhoArquivo, args.caminhoWeb);

  if (resultado.codigo !== 0) {
    throw new Error(
      `Falha ao carregar "${caminhoArquivo}" no D1 local (wrangler d1 execute poc-lab --local) ` +
        `— código de saída ${String(resultado.codigo)}.\n` +
        `--- stdout ---\n${resultado.stdout}\n` +
        `--- stderr ---\n${resultado.stderr}`,
    );
  }
}
