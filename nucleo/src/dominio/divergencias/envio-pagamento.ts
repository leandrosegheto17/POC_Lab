import type { Evento } from "../evento.js";
import type { Divergencia } from "../modelo.js";
import { derivarEstado } from "../estado.js";
import { formatarDataCurta } from "../formatacao.js";

/**
 * RN-05: pago e não enviado / enviado e não pago, até a `dataCorte` (RN-14).
 *
 * Reaproveita `derivarEstado` (fonte única de verdade para quitação e
 * coleta) em vez de recalcular essas regras aqui. `dataCorte` já chega
 * pronta como parâmetro — o cálculo da data de corte global é de outra
 * camada, fora de escopo.
 *
 * - "pago e não enviado": quitado (`situacaoPagamento === "quitado"`) e sem
 *   `coleta` até o corte (`coletado === false`) → achado `pago_nao_enviado`.
 * - "enviado e não pago": há `coleta` até o corte (`coletado === true`) e
 *   nenhum pagamento vinculado (`situacaoPagamento === "sem_pagamento"`) →
 *   achado `enviado_nao_pago`.
 *
 * Pedido sem evento `venda` até o corte (`vendido === false`) nunca gera
 * achado: sem valor devido, não há o que avaliar como "pago" ou "não pago".
 * Situação `parcial`/`excedente` também não gera achado — RN-05 exige
 * exatamente "quitado" ou exatamente "sem_pagamento".
 *
 * Fora de escopo: cálculo da data de corte global; RN-06 (atraso).
 */
export function detectarEnvioPagamento(
  eventos: Evento[],
  dataCorte: string,
): Divergencia | undefined {
  const estado = derivarEstado(eventos, dataCorte);

  if (!estado.vendido) {
    return undefined;
  }

  const filtrados = eventos.filter((evento) => evento.momentoFato <= dataCorte);
  const eventoVenda = filtrados.find((evento) => evento.tipo === "venda");
  const eventosPagamento = filtrados.filter((evento) => evento.tipo === "pagamento");
  const eventoColeta = filtrados.find((evento) => evento.tipo === "coleta");

  if (estado.situacaoPagamento === "quitado" && !estado.coletado) {
    const ultimoPagamento = eventosPagamento.at(-1);

    return {
      tipo: "pago_nao_enviado",
      motivo: `Pedido quitado (pagamento até ${ultimoPagamento !== undefined ? formatarDataCurta(ultimoPagamento.momentoFato) : "data não identificada"}) mas sem coleta até a data de corte ${formatarDataCurta(dataCorte)} (data limite do pedido: ${eventoVenda !== undefined ? formatarDataCurta(eventoVenda.data_limite) : "não identificada"})`,
      idsEventos: [
        ...(eventoVenda !== undefined ? [eventoVenda.codigoEvento] : []),
        ...eventosPagamento.map((evento) => evento.codigoEvento),
      ],
    };
  }

  if (estado.coletado && estado.situacaoPagamento === "sem_pagamento") {
    return {
      tipo: "enviado_nao_pago",
      motivo: `Pedido coletado em ${eventoColeta !== undefined ? formatarDataCurta(eventoColeta.momentoFato) : "data não identificada"} (até a data de corte ${formatarDataCurta(dataCorte)}) sem nenhum pagamento vinculado até lá (data limite do pedido: ${eventoVenda !== undefined ? formatarDataCurta(eventoVenda.data_limite) : "não identificada"})`,
      idsEventos: [
        ...(eventoVenda !== undefined ? [eventoVenda.codigoEvento] : []),
        ...(eventoColeta !== undefined ? [eventoColeta.codigoEvento] : []),
      ],
    };
  }

  return undefined;
}
