import type { BlocoIndicador, LinhaIndicador } from "./indicadores.js";
import { indicadorDivergenciasPorTipo } from "./indicadores.js";
import type { Divergencia } from "./modelo.js";
import { arredondarMoeda } from "./valores.js";
import type { SituacaoPagamento } from "./quitacao.js";

/**
 * Pedido com os dados mínimos necessários para os totais do resumo: valor
 * devido, valor pago e a situação de pagamento já calculada (RN-02).
 */
export type PedidoParaTotais = {
  idPedido: string;
  devido: number;
  pago: number;
  situacao: SituacaoPagamento;
};

/**
 * `Divergencia` (./modelo.ts) não carrega `idPedido` — é calculada por
 * pedido (ver `calcularDivergencias`) e o vínculo com o pedido é feito só na
 * camada de publicação (`publicacao/divergencias.ts`). Como esta função
 * precisa contar pedidos distintos com divergência e somar "pago a mais" por
 * pedido duplicado, ela espera a divergência já enriquecida com `idPedido`
 * pelo chamador (que é quem conhece esse vínculo). Interpretação pontual,
 * documentada aqui; não altera `Divergencia` em `./modelo.ts`.
 */
export type DivergenciaComPedido = Divergencia & { idPedido: string };

/**
 * Totais do resumo (cartões da T1): cada campo é um `BlocoIndicador`, com
 * fórmula, numerador e denominador explícitos — mesmo quando o total é uma
 * soma simples (denominador `1`, por não haver razão natural).
 */
export type Totais = {
  pedidos: BlocoIndicador;
  pedidosComDivergencia: BlocoIndicador;
  porTipo: BlocoIndicador;
  valorEmAberto: BlocoIndicador;
  pagoAMais: BlocoIndicador;
  entregasNoPrazoTotal: BlocoIndicador;
};

/**
 * Monta um bloco "simples" (contagem/soma absoluta), sem quebra por grupo:
 * uma única linha, denominador `1` quando não há razão natural, resultado
 * igual ao próprio numerador.
 */
function blocoSimples(
  chave: string,
  titulo: string,
  formula: string,
  numerador: number,
): BlocoIndicador {
  const linha: LinhaIndicador = {
    rotulos: [],
    numerador,
    denominador: 1,
    resultado: numerador,
  };

  return { chave, titulo, formula, linhas: [linha] };
}

/**
 * Totais do resumo (cartões da T1):
 *
 *   - `pedidos`: contagem total de pedidos.
 *   - `pedidosComDivergencia`: contagem de pedidos distintos com ao menos
 *     uma divergência, sobre o total de pedidos.
 *   - `porTipo`: reaproveita `indicadorDivergenciasPorTipo` sobre a mesma
 *     lista de divergências.
 *   - `valorEmAberto`: Σ (devido − pago) dos pedidos cuja `situacao`
 *     (RN-02, `SituacaoPagamento`) é `parcial`, OU cujo `idPedido` aparece em
 *     `divergencias` com `tipo === 'enviado_nao_pago'`. `'enviado_nao_pago'`
 *     não é um valor de `SituacaoPagamento` (que só conhece
 *     `sem_pagamento`/`parcial`/`quitado`/`excedente`) — é um
 *     `TipoDivergencia` (./modelo.ts); por isso esse caso é identificado via
 *     a lista de divergências, não via `situacao`. Arredondado só no fim da
 *     soma.
 *   - `pagoAMais`: Σ (pago − devido) dos pedidos com divergência
 *     `duplicado`, arredondado só no fim da soma.
 *   - `entregasNoPrazoTotal`: soma de numeradores/denominadores das linhas
 *     de `blocoEntregasNoPrazo` (já calculado por `indicadorEntregasNoPrazo`
 *     — não recalculado aqui a partir dos pedidos).
 */
export function totaisResumo(
  pedidos: PedidoParaTotais[],
  divergencias: DivergenciaComPedido[],
  blocoEntregasNoPrazo: BlocoIndicador,
): Totais {
  const totalPedidos = pedidos.length;

  const idsComDivergencia = new Set(divergencias.map((divergencia) => divergencia.idPedido));

  const linhaPedidos: LinhaIndicador = {
    rotulos: [],
    numerador: totalPedidos,
    denominador: 1,
    resultado: totalPedidos,
  };
  const pedidosBloco: BlocoIndicador = {
    chave: "pedidos",
    titulo: "Pedidos",
    formula: "contagem total de pedidos",
    linhas: [linhaPedidos],
  };

  const pedidosComDivergenciaBloco: BlocoIndicador = {
    chave: "pedidos_com_divergencia",
    titulo: "Pedidos com divergência",
    formula: "numero de pedidos distintos com ao menos uma divergencia / total de pedidos",
    linhas: [
      {
        rotulos: [],
        numerador: idsComDivergencia.size,
        denominador: totalPedidos,
        resultado: totalPedidos === 0 ? null : idsComDivergencia.size / totalPedidos,
      },
    ],
  };

  const porTipoBloco = indicadorDivergenciasPorTipo(divergencias);

  const idsEnviadosNaoPagos = new Set(
    divergencias
      .filter((divergencia) => divergencia.tipo === "enviado_nao_pago")
      .map((divergencia) => divergencia.idPedido),
  );

  const somaEmAbertoBruta = pedidos
    .filter(
      (pedido) => pedido.situacao === "parcial" || idsEnviadosNaoPagos.has(pedido.idPedido),
    )
    .reduce((acumulado, pedido) => acumulado + (pedido.devido - pedido.pago), 0);

  const valorEmAbertoBloco = blocoSimples(
    "valor_em_aberto",
    "Valor em aberto",
    "soma de (devido - pago) dos pedidos parcial ou enviado_nao_pago",
    arredondarMoeda(somaEmAbertoBruta),
  );

  const idsDuplicados = new Set(
    divergencias
      .filter((divergencia) => divergencia.tipo === "duplicado")
      .map((divergencia) => divergencia.idPedido),
  );

  const somaPagoAMaisBruta = pedidos
    .filter((pedido) => idsDuplicados.has(pedido.idPedido))
    .reduce((acumulado, pedido) => acumulado + (pedido.pago - pedido.devido), 0);

  const pagoAMaisBloco = blocoSimples(
    "pago_a_mais",
    "Pago a mais",
    "soma de (pago - devido) dos pedidos com divergencia duplicado",
    arredondarMoeda(somaPagoAMaisBruta),
  );

  const somaNumeradores = blocoEntregasNoPrazo.linhas.reduce(
    (acumulado, linha) => acumulado + linha.numerador,
    0,
  );
  const somaDenominadores = blocoEntregasNoPrazo.linhas.reduce(
    (acumulado, linha) => acumulado + linha.denominador,
    0,
  );

  const entregasNoPrazoTotalBloco: BlocoIndicador = {
    chave: "entregas_no_prazo_total",
    titulo: "Entregas no prazo (total)",
    formula: "soma dos numeradores / soma dos denominadores das linhas de entregas_no_prazo",
    linhas: [
      {
        rotulos: [],
        numerador: somaNumeradores,
        denominador: somaDenominadores,
        resultado: somaDenominadores === 0 ? null : somaNumeradores / somaDenominadores,
      },
    ],
  };

  return {
    pedidos: pedidosBloco,
    pedidosComDivergencia: pedidosComDivergenciaBloco,
    porTipo: porTipoBloco,
    valorEmAberto: valorEmAbertoBloco,
    pagoAMais: pagoAMaisBloco,
    entregasNoPrazoTotal: entregasNoPrazoTotalBloco,
  };
}
