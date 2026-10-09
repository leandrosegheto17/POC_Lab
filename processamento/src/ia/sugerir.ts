import type { PagamentoSemIdentificacaoArmazenado } from "../armazenamento/consultas.js";
import type { Repositorio } from "../armazenamento/repositorio.js";
import { conferirSugestao } from "../dominio/conferencia-sugestao.js";
import { montarCandidatos, type Candidato, type ResumoPedido } from "./candidatos.js";
import { calcularChaveCache, RESPOSTA_CACHE_SEM_SUGESTAO } from "./chave-cache.js";
import type { ProvedorSugestao } from "./porta.js";

/**
 * Caso de uso `sugerir` (SDD §5, L-03).
 *
 * Para cada pagamento com achado `sem_identificacao` (RN-09), monta os
 * candidatos de pedido não quitado compatíveis e consulta `ProvedorSugestao`
 * para obter uma sugestão de vínculo, com cache e teto de chamadas
 * (`IA_TETO_CHAMADAS`). Nunca grava vínculo/evento — só devolve o resultado
 * em memória. O resumo dos pedidos vem do chamador (a projeção fica em
 * `publicacao/`, que `ia/` não importa).
 */

/** Modelo padrão usado na chave de cache quando `opcoes.modelo` não é informado. */
const MODELO_PADRAO = "falso";

/** Teto de chamadas efetivas ao provedor, padrão quando nada é configurado. */
const TETO_PADRAO = 20;

export type ResultadoSugestao = {
  pagamento: string;
  textoReferencia: string;
  pedidoSugerido: string | null;
  conferida: boolean;
  motivo: string;
};

export type OpcoesSugerir = {
  tetoChamadas?: number;
  modelo?: string;
  /**
   * Momento gravado em `cache_ia.criado_em` para toda entrada escrita nesta
   * execução. Determinístico por construção: nunca usa `Date.now()`. Se
   * omitido, usa o maior `momento_fato` já presente em `evento` (a "data de
   * corte" natural do event store nesta execução); se a tabela `evento`
   * estiver vazia, usa a época Unix (`1970-01-01T00:00:00.000Z`) como último
   * recurso determinístico.
   */
  dataCorte?: string;
};

/**
 * Lê `IA_TETO_CHAMADAS` do ambiente; se ausente/inválido (não numérico, ou
 * `0`/negativo tratado como "ausente" pelo `||`), usa `opcoes.tetoChamadas`;
 * na ausência de ambos, usa `TETO_PADRAO` (20).
 */
function resolverTetoChamadas(opcoes: OpcoesSugerir | undefined): number {
  return Number(process.env.IA_TETO_CHAMADAS) || opcoes?.tetoChamadas || TETO_PADRAO;
}

/**
 * Determina `criadoEm` para as entradas de cache gravadas nesta execução
 * (ver `OpcoesSugerir.dataCorte`).
 */
function resolverDataCorte(repositorio: Repositorio, opcoes: OpcoesSugerir | undefined): string {
  if (opcoes?.dataCorte !== undefined) {
    return opcoes.dataCorte;
  }
  return repositorio.obterMaiorMomentoFato() ?? "1970-01-01T00:00:00.000Z";
}

/**
 * Executa `conferirSugestao` (RN-11) para a sugestão `idPedidoSugerido`
 * contra os candidatos já montados para este pagamento. Se a identidade
 * devolvida pelo provedor não estiver entre os candidatos (implementação
 * malcomportada — o contrato da porta diz que isso não deveria acontecer),
 * trata defensivamente como "sem sugestão", sem lançar exceção.
 */
function conferirContraCandidato(
  candidatos: Candidato[],
  idPedidoSugerido: string,
  pagamento: PagamentoSemIdentificacaoArmazenado,
): { conferida: boolean; motivo: string } {
  const candidato = candidatos.find((item) => item.idPedido === idPedidoSugerido);
  if (candidato === undefined) {
    return {
      conferida: false,
      motivo: `Sugestão rejeitada: o provedor devolveu "${idPedidoSugerido}", que não está entre os candidatos oferecidos.`,
    };
  }

  return conferirSugestao(
    { devido: candidato.devido, pago: candidato.pago, dataPedido: candidato.dataPedido },
    { valor: pagamento.valor, dataPagamento: pagamento.momentoFato },
  );
}

/**
 * Caso de uso principal: percorre os pagamentos sem identificação e produz
 * um `ResultadoSugestao` por pagamento (mesma ordem de leitura de
 * `achado_qualidade`).
 *
 * Quando `provedor` é `undefined` (sem chave de IA configurada — fora de
 * escopo desta tarefa como essa chave chega), TODOS os pagamentos viram "sem
 * sugestão" imediatamente: não há candidatos montados, não há consulta de
 * cache, nenhuma chamada é contada. Decisão simples e deliberada — sem
 * provedor não há nada que `sugerir` possa fazer além de devolver "sem
 * sugestão", então evita-se o trabalho de montar candidatos/consultar cache
 * para nada.
 */
export async function sugerir(
  repositorio: Repositorio,
  pedidoResumo: readonly ResumoPedido[],
  provedor: ProvedorSugestao | undefined,
  opcoes?: OpcoesSugerir,
): Promise<ResultadoSugestao[]> {
  const { completos, semEvento } = repositorio.listarPagamentosSemIdentificacao();

  const resultados: ResultadoSugestao[] = semEvento.map((codigoTransacao) => ({
    pagamento: codigoTransacao,
    textoReferencia: "",
    pedidoSugerido: null,
    conferida: false,
    motivo:
      "Sem sugestão: o evento de pagamento correspondente não foi encontrado no event store.",
  }));

  if (provedor === undefined) {
    for (const pagamento of completos) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: "Sem sugestão: nenhum provedor de IA configurado.",
      });
    }
    return resultados;
  }

  const modelo = opcoes?.modelo ?? MODELO_PADRAO;
  const tetoChamadas = resolverTetoChamadas(opcoes);
  const dataCorte = resolverDataCorte(repositorio, opcoes);

  let chamadasEfetivas = 0;

  for (const pagamento of completos) {
    const candidatos = montarCandidatos(pedidoResumo, pagamento);

    if (candidatos.length === 0) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: "Sem sugestão: nenhum candidato elegível encontrado para este pagamento.",
      });
      continue;
    }

    const candidatosOrdenados = candidatos.map((candidato) => candidato.idPedido);
    const chave = calcularChaveCache(pagamento.textoReferencia, candidatosOrdenados, modelo);

    const cache = repositorio.obterCache(chave);
    let respostaBruta: string;

    if (cache !== undefined) {
      respostaBruta = cache.resposta;
    } else if (chamadasEfetivas >= tetoChamadas) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: `Sem sugestão: teto de chamadas de IA (${String(tetoChamadas)}) atingido nesta execução.`,
      });
      continue;
    } else {
      const resposta = await provedor.sugerir(pagamento.textoReferencia, candidatosOrdenados, modelo);
      chamadasEfetivas += 1;
      respostaBruta = resposta ?? RESPOSTA_CACHE_SEM_SUGESTAO;
      repositorio.gravarCache(chave, respostaBruta, dataCorte, modelo);
    }

    if (respostaBruta === RESPOSTA_CACHE_SEM_SUGESTAO) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: "Sem sugestão: o provedor de IA não sugeriu nenhum pedido para este pagamento.",
      });
      continue;
    }

    const { conferida, motivo } = conferirContraCandidato(candidatos, respostaBruta, pagamento);
    resultados.push({
      pagamento: pagamento.codigoTransacao,
      textoReferencia: pagamento.textoReferencia,
      pedidoSugerido: respostaBruta,
      conferida,
      motivo,
    });
  }

  return resultados;
}
