import { pathToFileURL } from "node:url";

import { criarRepositorio } from "../armazenamento/repositorio.js";
import { criarProvedorOpenAI } from "../ia/provedor-openai.js";
import { sugerir, type OpcoesSugerir, type ResultadoSugestao } from "../ia/sugerir.js";
import type { ProvedorSugestao } from "../ia/porta.js";
import { montarPedidosEVinculos } from "../publicacao/pedidos.js";
import { CAMINHO_BANCO_PADRAO } from "./importar.js";

/**
 * TP-0083 — CLI `sugerir`: ponto de entrada que decide, a partir do
 * ambiente, se a porta de IA (TP-0081/TP-0082) deve ser chamada.
 *
 * Determinismo (crítico para `preparar`): sem `OPENAI_API_KEY`, esta função
 * NUNCA abre conexão de escrita nenhuma — nem `criarRepositorio` é chamado
 * nesse ramo — e só imprime a mensagem abaixo, terminando com sucesso (é o
 * caso normal do pipeline, não um erro).
 */

/** Modelo padrão usado quando `OPENAI_MODELO` não está definido no ambiente. */
export const MODELO_PADRAO = "gpt-4o-mini";

export type OpcoesExecutarSugerir = {
  /** Ambiente usado para ler `OPENAI_API_KEY`/`OPENAI_MODELO`. Padrão: `process.env`. */
  ambiente?: NodeJS.ProcessEnv;
  /**
   * Provedor injetável — usado pelos testes de integração (nunca o provedor
   * real contra rede verdadeira em teste). Padrão: `criarProvedorOpenAI()`.
   */
  provedor?: ProvedorSugestao;
  /** Overrides adicionais passados direto para `sugerir` (TP-0081). */
  opcoesSugerir?: OpcoesSugerir;
};

/**
 * Executa o caso de uso `sugerir` (TP-0081) contra o event store em
 * `caminhoBanco`, só quando há `OPENAI_API_KEY` no ambiente. `sugerir` já
 * persiste as respostas em `cache_ia` internamente — esta função não grava
 * nada por conta própria.
 */
export async function executarSugerir(
  caminhoBanco: string,
  opcoes: OpcoesExecutarSugerir = {},
): Promise<ResultadoSugestao[]> {
  const ambiente = opcoes.ambiente ?? process.env;

  if (!ambiente.OPENAI_API_KEY) {
    console.log("sem chave, nenhuma sugestão gerada");
    return [];
  }

  const repositorio = criarRepositorio(caminhoBanco);
  const provedor = opcoes.provedor ?? criarProvedorOpenAI();
  const modelo = ambiente.OPENAI_MODELO || MODELO_PADRAO;

  let resultados: ResultadoSugestao[];
  try {
    const { pedidoResumo } = montarPedidosEVinculos(repositorio);
    resultados = await sugerir(repositorio, pedidoResumo, provedor, {
      ...opcoes.opcoesSugerir,
      modelo: opcoes.opcoesSugerir?.modelo ?? modelo,
    });
  } finally {
    // Fecha a conexão aberta por esta função (nunca a de quem a chamou) —
    // em Windows, um handle aberto trava `rmSync` do diretório temporário
    // do banco (visto em teste de integração, TP-0083).
    repositorio.fechar();
  }

  console.log(
    `Sugestão concluída: ${String(resultados.length)} pagamento(s) sem identificação avaliado(s).`,
  );

  return resultados;
}

async function main(): Promise<void> {
  try {
    await executarSugerir(CAMINHO_BANCO_PADRAO);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao sugerir vínculos.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
