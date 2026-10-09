import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import { particionarPorProporcao } from "./particao-pagamentos.js";
import type { EntradaGabarito } from "./problemas-plantados.js";

/**
 * Plantio de casos de problema de rastreio, feito SOMENTE sobre
 * pedidos "limpos" que têm linhas de rastreio geradas por `gerarRastreio`
 * — ou seja, pedidos com `dataEnvio !== null`. Pedidos sem envio já
 * não produzem nenhuma linha em `rastreio.csv` (ausência "natural"); este
 * módulo planta a ausência/inconsistência DELIBERADA sobre pedidos que, sem
 * o plantio, teriam rastreio normal.
 *
 * Particionamento disjunto por PRNG (`particionarPorProporcao`): embaralha o
 * pool de pedidos elegíveis e retira, por tipo e em ordem fixa
 * (`ORDEM_TIPOS_PARTICAO`), a fração correspondente — nenhum pedido recebe
 * mais de 1 tipo de caso de rastreio.
 *
 * Coerência com o plantio de pagamento (verificação de 2026-10-08):
 * `pedidosExcluidos` (4º parâmetro) recebe os ids dos pedidos já usados por
 * `plantarCasosPagamento`, para que nenhum pedido receba simultaneamente um
 * caso de pagamento (que altera sua `situacaoPagamento`) e um caso de
 * rastreio que pressupõe outra situação (ex. "pago_nao_enviado" pressupõe
 * pedido quitado) — sem essa exclusão, a base real produzia falso negativo
 * na comparação com o gabarito.
 */
export const PROPORCAO_PAGO_NAO_ENVIADO = 0.05;
export const PROPORCAO_ENTREGA_ATRASADA = 0.05;
export const PROPORCAO_FORA_DE_ORDEM = 0.05;
export const PROPORCAO_LINHA_INVALIDA = 0.03;
export const PROPORCAO_REGISTRO_REPETIDO = 0.03;

/** Quantidade de dias usada para calcular o novo `momento_fato` da entrega atrasada, sempre estritamente posterior à `dataLimite` do pedido. */
const DIAS_ATRASO_ENTREGA = 3;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Valor de `tipo` fora do enum `coleta`/`transporte`/`entrega`, usado para corromper a linha do caso "linha inválida". */
const VALOR_TIPO_INVALIDO = "desconhecido";

const ORDEM_TIPOS_PARTICAO = [
  "pago_nao_enviado",
  "entrega_atrasada",
  "fora_de_ordem",
  "linha_invalida",
  "registro_repetido",
] as const;

type TipoParticao = (typeof ORDEM_TIPOS_PARTICAO)[number];

const PROPORCOES_POR_TIPO: Record<TipoParticao, number> = {
  pago_nao_enviado: PROPORCAO_PAGO_NAO_ENVIADO,
  entrega_atrasada: PROPORCAO_ENTREGA_ATRASADA,
  fora_de_ordem: PROPORCAO_FORA_DE_ORDEM,
  linha_invalida: PROPORCAO_LINHA_INVALIDA,
  registro_repetido: PROPORCAO_REGISTRO_REPETIDO,
};

export type ResultadoPlantioRastreio = {
  linhasCsv: string[];
  gabarito: EntradaGabarito[];
};

/**
 * Pedidos elegíveis a receber caso de rastreio: só os que têm `dataEnvio`
 * (e, portanto, linhas em `rastreio.csv`) e que NÃO foram usados por
 * `plantarCasosPagamento` — `pedidosExcluidos` chega com os ids dos
 * pedidos já reservados para algum caso de pagamento. Sem essa exclusão, um
 * pedido poderia receber simultaneamente um caso de pagamento que altera sua
 * `situacaoPagamento` (ex. "enviado_nao_pago"/"duplicado"/"parcial") E um
 * caso de rastreio que pressupõe outra situação (ex. "pago_nao_enviado"
 * pressupõe pedido quitado) — produzindo falso negativo na divergência
 * calculada (RN-05) contra o gabarito, já observado na base real.
 */
function pedidosElegiveis(
  pedidos: PedidoVendas[],
  pedidosExcluidos: Set<string>,
): PedidoVendas[] {
  return pedidos.filter(
    (pedido) => pedido.dataEnvio !== null && !pedidosExcluidos.has(pedido.idPedido),
  );
}

/** Devolve o índice, em `linhas`, da primeira linha do pedido que satisfaz o predicado sobre as partes da linha (ou -1). */
function encontrarIndiceLinha(
  linhas: string[],
  idPedido: string,
  predicado?: (partes: string[]) => boolean,
): number {
  return linhas.findIndex((linha) => {
    const partes = linha.split(",");
    if (partes[2] !== idPedido) {
      return false;
    }
    return predicado ? predicado(partes) : true;
  });
}

/**
 * Planta, de forma determinística, casos de problema de rastreio SOMENTE
 * sobre os pedidos elegíveis (com `dataEnvio`) recebidos.
 *
 * Recebe as linhas de `rastreio.csv` já geradas por `gerarRastreio`
 * e devolve uma nova lista de linhas (substituindo/removendo/
 * reordenando conforme o caso) junto com as entradas de gabarito
 * correspondentes.
 *
 * Função pura: não lê nem escreve nada em disco.
 */
export function plantarCasosRastreio(
  pedidos: PedidoVendas[],
  linhasCsvBase: string[],
  prng: () => number,
  pedidosExcluidos: Set<string> = new Set(),
): ResultadoPlantioRastreio {
  const elegiveis = pedidosElegiveis(pedidos, pedidosExcluidos);
  const grupos = particionarPorProporcao(elegiveis, prng, ORDEM_TIPOS_PARTICAO, PROPORCOES_POR_TIPO);
  let linhas = linhasCsvBase.slice();
  const gabarito: EntradaGabarito[] = [];

  function registrarGabarito(idPedido: string, tipo: TipoParticao): void {
    gabarito.push({ pedido_venda: idPedido, tipo });
  }

  // Pago e não enviado (sem coleta): remove as 3 linhas de rastreio desse
  // pedido — a ausência deliberada é o próprio caso.
  for (const pedido of grupos.pago_nao_enviado) {
    linhas = linhas.filter((linha) => linha.split(",")[2] !== pedido.idPedido);
    registrarGabarito(pedido.idPedido, "pago_nao_enviado");
  }

  // Entrega atrasada: altera o momento_fato da linha "entrega" desse pedido
  // para um instante estritamente posterior à dataLimite, calculado de
  // forma determinística (dataLimite + N dias fixos), sem Date.now().
  for (const pedido of grupos.entrega_atrasada) {
    const indice = encontrarIndiceLinha(
      linhas,
      pedido.idPedido,
      (partes) => partes[3] === "entrega",
    );
    if (indice !== -1) {
      const partes = (linhas[indice] as string).split(",");
      const novoTimestamp = Date.parse(pedido.dataLimite) + DIAS_ATRASO_ENTREGA * MS_POR_DIA;
      partes[4] = new Date(novoTimestamp).toISOString();
      linhas[indice] = partes.join(",");
    }
    registrarGabarito(pedido.idPedido, "entrega_atrasada");
  }

  // Eventos fora de ordem: troca a POSIÇÃO FÍSICA das linhas "entrega" e
  // "transporte" desse pedido no array (a linha "entrega" passa a aparecer
  // antes da "transporte" no arquivo), mantendo os valores de momento_fato
  // de cada linha inalterados — a divergência é de posição, não de data.
  for (const pedido of grupos.fora_de_ordem) {
    const indiceTransporte = encontrarIndiceLinha(
      linhas,
      pedido.idPedido,
      (partes) => partes[3] === "transporte",
    );
    const indiceEntrega = encontrarIndiceLinha(
      linhas,
      pedido.idPedido,
      (partes) => partes[3] === "entrega",
    );
    if (indiceTransporte !== -1 && indiceEntrega !== -1) {
      const temporario = linhas[indiceTransporte] as string;
      linhas[indiceTransporte] = linhas[indiceEntrega] as string;
      linhas[indiceEntrega] = temporario;
    }
    registrarGabarito(pedido.idPedido, "fora_de_ordem");
  }

  // Linha inválida: corrompe a linha de `transporte` do pedido (nunca a de
  // `coleta`) colocando um `tipo` fora do enum coleta/transporte/entrega —
  // corromper a de `coleta` faria essa linha ser rejeitada na importação,
  // apagando o `coletado` do pedido e produzindo uma divergência RN-05
  // "pago_nao_enviado" não plantada (verificação de 2026-10-08).
  // `transporte` não é lido por nenhuma regra de divergência, então
  // corrompê-la é seguro.
  for (const pedido of grupos.linha_invalida) {
    const indice = encontrarIndiceLinha(linhas, pedido.idPedido, (partes) => partes[3] === "transporte");
    if (indice !== -1) {
      const partes = (linhas[indice] as string).split(",");
      partes[3] = VALOR_TIPO_INVALIDO;
      linhas[indice] = partes.join(",");
    }
    registrarGabarito(pedido.idPedido, "linha_invalida");
  }

  // Registro repetido: duplica a primeira linha do pedido (mesmo
  // codigo_evento, 2 ocorrências).
  for (const pedido of grupos.registro_repetido) {
    const indice = encontrarIndiceLinha(linhas, pedido.idPedido);
    if (indice !== -1) {
      linhas = [
        ...linhas.slice(0, indice + 1),
        linhas[indice] as string,
        ...linhas.slice(indice + 1),
      ];
    }
    registrarGabarito(pedido.idPedido, "registro_repetido");
  }

  return { linhasCsv: linhas, gabarito };
}
