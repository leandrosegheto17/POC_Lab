import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import type { EntradaGabarito } from "./problemas-plantados.js";

/**
 * Verificação de 2026-10-08 (TP-0028): a base real tem pedidos cuja própria
 * combinação `dataEnvio`/`dataLimite` já é, por si só, divergente — sem
 * nenhum plantio envolvido:
 *
 * - Pedidos sem `dataEnvio` (21 na base real) recebem, da mesma forma que
 *   qualquer outro pedido "limpo", um pagamento integral/quitado
 *   (`gerarPagamentos`, TP-0023, não distingue por envio) mas nunca recebem
 *   rastreio (`gerarRastreio`, TP-0024, pula quem não tem `dataEnvio`) — ou
 *   seja, acabam "quitado e não coletado": RN-05 `pago_nao_enviado`.
 * - Pedidos com `dataEnvio` POSTERIOR à própria `dataLimite` (milhares na
 *   base real, um atraso real já presente nos dados de origem) tornam
 *   matematicamente impossível gerar uma `entrega` dentro da data limite
 *   (`gerarRastreio` interpola entre `dataEnvio` e `dataLimite`): a entrega
 *   sempre cai depois da `dataLimite` — RN-06 `entrega_atrasada`.
 *
 * Essas 2 divergências não são "plantadas" (não há sorteio por tipo
 * envolvido, não dependem de `plantarCasosPagamento`/`plantarCasosRastreio`)
 * — são consequência direta e determinística dos dados de origem reais mais
 * a forma como a base "limpa" é gerada. Por isso TP-0028 (teste de M1 contra
 * o gabarito, 100% cobertura e 0 falso positivo) as considera igualmente:
 * precisam estar no gabarito, senão aparecem como falso positivo no teste.
 *
 * Regras de exclusão (quando NÃO acrescentar), uma por tipo natural:
 * - `pago_nao_enviado` natural: só se aplica a pedido com `dataEnvio ===
 *   null`; esse pedido é estruturalmente inelegível ao plantio de rastreio
 *   (`plantarCasosRastreio` só considera `dataEnvio !== null`), então o
 *   único jeito de "escapar" dessa divergência é o plantio de PAGAMENTO
 *   tocar o pedido (ex. "enviado_nao_pago" remove o pagamento de propósito,
 *   deixando de ser "quitado") — por isso exclui quem está em
 *   `pedidosTocadosPagamento`.
 * - `entrega_atrasada` natural: independe de pagamento (RN-06 não olha
 *   pagamento). Só não se aplica quando o plantio de RASTREIO já alterou o
 *   resultado para esse pedido de um jeito que muda a resposta: removeu a
 *   entrega inteira (`pago_nao_enviado`, sem nenhum evento de rastreio) ou
 *   já é o PRÓPRIO caso "entrega_atrasada" (mesmo tipo, não duplicar). Os
 *   demais tipos de plantio de rastreio (`fora_de_ordem`, `linha_invalida`,
 *   `registro_repetido`) preservam o `momento_fato` original da entrega — se
 *   a condição valia antes do plantio, continua valendo depois.
 *
 * Função pura: não lê nem escreve nada em disco; não reimplementa RN-05/
 * RN-06 do domínio (`dominio/divergencias/`) — apenas antecipa, a partir
 * das mesmas 2 condições de entrada que o domínio usaria, qual o resultado
 * esperado, para registrar no gabarito.
 */
export function calcularDivergenciasNaturais(
  limpos: PedidoVendas[],
  pedidosTocadosPagamento: Set<string>,
  pedidosSemEntregaOuJaAtrasadaNoRastreio: Set<string>,
): EntradaGabarito[] {
  const entradas: EntradaGabarito[] = [];

  for (const pedido of limpos) {
    if (pedido.dataEnvio === null) {
      if (!pedidosTocadosPagamento.has(pedido.idPedido)) {
        entradas.push({ pedido_venda: pedido.idPedido, tipo: "pago_nao_enviado" });
      }
      continue;
    }

    if (pedidosSemEntregaOuJaAtrasadaNoRastreio.has(pedido.idPedido)) {
      continue;
    }

    if (Date.parse(pedido.dataEnvio) > Date.parse(pedido.dataLimite)) {
      entradas.push({ pedido_venda: pedido.idPedido, tipo: "entrega_atrasada" });
    }
  }

  return entradas;
}
