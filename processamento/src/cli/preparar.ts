import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  baixarBase,
  descreverBaseBaixada,
  type OpcoesGarantirBaseLocal,
} from "../aplicacao/baixar-base.js";
import { gerarEEscrever } from "../aplicacao/gerar.js";
import { formatarRelatorioImportacao, importarDados } from "../aplicacao/importar.js";
import {
  publicarDados,
  type DependenciasPublicarDados,
} from "../aplicacao/publicar-dados.js";
import {
  decidirSugerir,
  executarSugerir,
  type DecisaoSugerir,
  type OpcoesExecutarSugerir,
} from "../aplicacao/sugerir.js";
import {
  CAMINHO_BANCO_PADRAO,
  CAMINHO_WEB_PADRAO,
  DIR_GERADO_PADRAO,
  DIR_PUBLICACAO_PADRAO,
  NOME_ARQUIVO_LEITURA_SQL,
} from "../config/caminhos.js";
import type { ProvedorSugestao } from "../ia/porta.js";
import { SEMENTE_PADRAO } from "../gerador/prng.js";
import type { RelatorioImportacao } from "../importacao/importar.js";

/**
 * CLI `preparar`: encadeia, nesta ordem estrita (cada passo espera o anterior
 * terminar, sem paralelismo, para não intercalar I/O e preservar o
 * determinismo):
 *
 *   1. baixar-base  (idempotente, confere SHA-256)
 *   2. gerar        (semente padrão `SEMENTE_PADRAO`)
 *   3. importar
 *   4. sugerir      (só consulta o provedor de IA com `OPENAI_API_KEY` no ambiente)
 *   5. publicar-dados
 *
 * Cada passo é uma função de `aplicacao/`, a mesma que a CLI individual usa;
 * este arquivo só encadeia e imprime.
 */

export type OpcoesPreparar = {
  /** Semente determinística para `gerar`/`publicar-dados`. Padrão: `SEMENTE_PADRAO`. */
  semente?: number;
  /** Overrides do passo 1 (baixar-base). */
  baixarBase?: Partial<OpcoesGarantirBaseLocal>;
  /** Diretório dos arquivos gerados. Padrão: `dados/gerado`. */
  dirGerado?: string;
  /** Caminho do event store SQLite. Padrão: `dados/poc_lab.sqlite`. */
  caminhoBanco?: string;
  /** Diretório de saída do `leitura.sql`. Padrão: `dados/publicacao`. */
  diretorioPublicacao?: string;
  /** Caminho do pacote `web` (onde o `wrangler` é invocado). Padrão: `../web`. */
  caminhoWeb?: string;
  /** Ambiente usado para decidir/parametrizar o passo de sugestão. Padrão: `process.env`. */
  ambiente?: NodeJS.ProcessEnv;
  /** Provedor de IA injetável para o passo 4 (testes nunca chamam a rede). */
  provedorSugestao?: ProvedorSugestao;
  /** Overrides adicionais do passo 4, repassados a `executarSugerir`. */
  opcoesSugerir?: OpcoesExecutarSugerir["opcoesSugerir"];
  /** Dependências injetáveis do passo 5, para teste sem `wrangler` real. */
  dependenciasPublicar?: Partial<DependenciasPublicarDados>;
};

export type ResumoPreparar = {
  /** Tempo total do pipeline (passo 1 ao 5), em segundos. Só para log. */
  tempoSegundos: number;
  resumoImportacao: RelatorioImportacao;
  sugestao: DecisaoSugerir;
  /** Se a base de origem já estava presente localmente (idempotência do passo 1). */
  baseJaExistia: boolean;
};

/**
 * Executa o pipeline completo (passos 1 a 5) em sequência estrita. Os
 * overrides existem para teste isolado (diretórios temporários, `fetch` e
 * `wrangler` falsos).
 */
export async function executarPreparar(opcoes: OpcoesPreparar = {}): Promise<ResumoPreparar> {
  const inicio = performance.now();
  const semente = opcoes.semente ?? SEMENTE_PADRAO;
  const dirGerado = opcoes.dirGerado ?? DIR_GERADO_PADRAO;
  const caminhoBanco = opcoes.caminhoBanco ?? CAMINHO_BANCO_PADRAO;
  const diretorioPublicacao = opcoes.diretorioPublicacao ?? DIR_PUBLICACAO_PADRAO;
  const caminhoWeb = opcoes.caminhoWeb ?? CAMINHO_WEB_PADRAO;
  const ambiente = opcoes.ambiente ?? process.env;

  const base = await baixarBase(opcoes.baixarBase);
  console.log(`[1/5] ${descreverBaseBaixada(base)}`);

  await gerarEEscrever(base.caminho, dirGerado, semente);
  console.log(`[2/5] Dados gerados com semente ${String(semente)} em "${dirGerado}".`);

  const resumoImportacao = importarDados({ caminhoBase: base.caminho, dirGerado, caminhoBanco });
  console.log(`[3/5] Importação concluída em "${caminhoBanco}".`);

  const resultadosSugestao = await executarSugerir(caminhoBanco, {
    ambiente,
    provedor: opcoes.provedorSugestao,
    opcoesSugerir: opcoes.opcoesSugerir,
  });
  const sugestao = decidirSugerir(ambiente, resultadosSugestao.length);
  console.log(`[4/5] ${sugestao.mensagem}`);

  publicarDados(
    { semente, caminhoBanco, diretorioPublicacao, caminhoWeb },
    opcoes.dependenciasPublicar,
  );
  console.log(
    `[5/5] Dados publicados em "${path.join(diretorioPublicacao, NOME_ARQUIVO_LEITURA_SQL)}".`,
  );

  const tempoSegundos = (performance.now() - inicio) / 1000;
  console.log(`Tempo total: ${tempoSegundos.toFixed(2)}s`);
  console.log("Resumo da importação:");
  for (const linha of formatarRelatorioImportacao(resumoImportacao)) {
    console.log(linha);
  }

  return { tempoSegundos, resumoImportacao, sugestao, baseJaExistia: base.jaExistia };
}

async function main(): Promise<void> {
  try {
    await executarPreparar();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao preparar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
