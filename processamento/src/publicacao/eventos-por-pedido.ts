import type { EventoArmazenado } from "../armazenamento/consultas.js";

/**
 * Agrupa os eventos lidos do event store por `idPedido`, mantendo a ordem de
 * leitura dentro de cada pedido e descartando os ainda sem pedido vinculado
 * (`idPedido === null`) — estes não entram em nenhuma projeção por pedido.
 */
export function agruparEventosPorPedido(
  eventos: EventoArmazenado[],
): Map<string, EventoArmazenado[]> {
  const porPedido = new Map<string, EventoArmazenado[]>();
  for (const armazenado of eventos) {
    if (armazenado.idPedido === null) {
      continue;
    }
    const lista = porPedido.get(armazenado.idPedido) ?? [];
    lista.push(armazenado);
    porPedido.set(armazenado.idPedido, lista);
  }
  return porPedido;
}
