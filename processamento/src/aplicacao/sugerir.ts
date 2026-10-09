import { criarRepositorio } from "../armazenamento/repositorio.js";
import { criarProvedorOpenAI } from "../ia/provedor-openai.js";
import type { ProvedorSugestao } from "../ia/porta.js";
import { sugerir, type OpcoesSugerir, type ResultadoSugestao } from "../ia/sugerir.js";
import { montarPedidosEVinculos } from "../publicacao/pedidos.js";

/** Modelo padrão usado quando `OPENAI_MODELO` não está definido no ambiente. */
export const MODELO_PADRAO = "gpt-4o-mini";

/** Decisão/resultado do passo "sugerir", testável sem rodar o pipeline. */
export type DecisaoSugerir = {
  /** `true` quando o passo não consultou o provedor de IA (sem `OPENAI_API_KEY`). */
  pular: boolean;
  mensagem: string;
};

/**
 * Mensagem do passo "sugerir" conforme o ambiente: sem `OPENAI_API_KEY` o
 * passo é pulado (caso normal do pipeline, não um erro); com chave, informa
 * quantos pagamentos sem identificação foram avaliados.
 */
export function decidirSugerir(
  ambiente: NodeJS.ProcessEnv = process.env,
  avaliados = 0,
): DecisaoSugerir {
  if (!ambiente.OPENAI_API_KEY) {
    return {
      pular: true,
      mensagem: "Passo de sugestão pulado: sem sugestão (OPENAI_API_KEY não definida).",
    };
  }
  return {
    pular: false,
    mensagem: `Sugestão concluída: ${String(avaliados)} pagamento(s) sem identificação avaliado(s).`,
  };
}

export type OpcoesExecutarSugerir = {
  /** Ambiente usado para ler `OPENAI_API_KEY`/`OPENAI_MODELO`. Padrão: `process.env`. */
  ambiente?: NodeJS.ProcessEnv;
  /** Provedor injetável (testes nunca chamam o provedor real). Padrão: `criarProvedorOpenAI()`. */
  provedor?: ProvedorSugestao;
  /** Overrides adicionais passados direto para `sugerir`. */
  opcoesSugerir?: OpcoesSugerir;
};

/**
 * Executa o caso de uso `sugerir` contra o event store em `caminhoBanco`, só
 * quando há `OPENAI_API_KEY` no ambiente. Sem chave, NUNCA abre conexão com o
 * banco (determinismo do pipeline). `sugerir` já persiste as respostas em
 * `cache_ia`; esta função não grava nada por conta própria nem imprime: quem
 * chama mostra `decidirSugerir(...).mensagem`.
 */
export async function executarSugerir(
  caminhoBanco: string,
  opcoes: OpcoesExecutarSugerir = {},
): Promise<ResultadoSugestao[]> {
  const ambiente = opcoes.ambiente ?? process.env;

  if (!ambiente.OPENAI_API_KEY) {
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
    // Fecha só a conexão aberta aqui; em Windows um handle aberto trava o
    // `rmSync` do diretório temporário do banco nos testes.
    repositorio.fechar();
  }

  return resultados;
}
