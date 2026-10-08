import type { Evento } from "../evento.js";
import type { Divergencia } from "../modelo.js";

/**
 * RN-06: entrega atrasada.
 *
 * Se existir evento de `entrega` e seu `momentoFato` for estritamente
 * posterior à `dataLimite`, gera achado `entrega_atrasada`. Pedido sem
 * evento de entrega não gera achado (fora de escopo: indicador de
 * percentual no prazo e decisão sobre o que fazer com esses pedidos).
 */
export function detectarAtraso(
  dataLimite: string,
  eventoEntrega: Evento | undefined,
): Divergencia | undefined {
  if (eventoEntrega === undefined) {
    return undefined;
  }

  if (!(eventoEntrega.momentoFato > dataLimite)) {
    return undefined;
  }

  return {
    tipo: "entrega_atrasada",
    motivo: `Entrega em ${eventoEntrega.momentoFato} após a data limite ${dataLimite}`,
    idsEventos: [eventoEntrega.codigoEvento],
  };
}
