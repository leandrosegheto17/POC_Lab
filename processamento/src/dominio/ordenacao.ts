import type { Evento } from "./evento.js";

/**
 * Tipo de evento (discriminante `tipo` de `PayloadEvento`), usado apenas para
 * indexar a ordem canônica de desempate entre tipos.
 */
type TipoEvento = Evento["tipo"];

/**
 * Ordem canônica de desempate entre tipos de evento quando `momentoFato`
 * coincide: venda < pagamento < coleta < transporte < entrega.
 */
export const ORDEM_TIPO: Record<TipoEvento, number> = {
  venda: 0,
  pagamento: 1,
  coleta: 2,
  transporte: 3,
  entrega: 4,
};

/**
 * Ordena eventos pela ordenação canônica (RN-07):
 * 1. `momentoFato` (string ISO-8601 UTC, comparada lexicograficamente —
 *    equivalente à ordem temporal, dado o formato fixo).
 * 2. Empate: ordem fixa por `tipo` (`ORDEM_TIPO`).
 * 3. Empate residual: `codigoEvento`, comparação padrão de string.
 *
 * Função pura: não muta o array recebido; devolve sempre a mesma saída para
 * qualquer permutação de uma mesma entrada.
 */
export function ordenarEventos(eventos: Evento[]): Evento[] {
  return [...eventos].sort((a, b) => {
    if (a.momentoFato < b.momentoFato) return -1;
    if (a.momentoFato > b.momentoFato) return 1;

    const ordemA = ORDEM_TIPO[a.tipo];
    const ordemB = ORDEM_TIPO[b.tipo];
    if (ordemA !== ordemB) return ordemA - ordemB;

    if (a.codigoEvento < b.codigoEvento) return -1;
    if (a.codigoEvento > b.codigoEvento) return 1;
    return 0;
  });
}
