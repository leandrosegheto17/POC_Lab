import type { Consultas } from "../armazenamento/consultas.js";
import type { Evento } from "nucleo/dominio/evento.js";
import type { TipoDivergencia } from "nucleo/dominio/modelo.js";
import { calcularDivergencias } from "nucleo/dominio/divergencias/index.js";
import { agruparEventosPorPedido } from "./eventos-por-pedido.js";

/**
 * Projeção de `divergencia` (RF-07, §6 L-11).
 *
 * Lê os eventos do event store pelo repositório, agrupa por pedido, aplica
 * `calcularDivergencias` (a regra de divergência em si não é reimplementada
 * aqui) e monta uma linha por `(tipo, pedido)` com os eventos que sustentam a
 * divergência em JSON.
 *
 * `dataCorte` (RN-14) já chega pronta como parâmetro. Gerar o SQL multi-linha
 * final é de `escritor-sql.ts`.
 */

/** Um item do JSON de `eventos` da projeção, chaves em ordem fixa. */
type EventoSustentacao = {
  tipo: string;
  data: string;
  fonte: string;
  codigo: string;
};

/** Linha final da projeção `divergencia`. */
export type LinhaDivergenciaProjecao = {
  tipo: TipoDivergencia;
  id_pedido: string;
  motivo: string;
  eventos: string;
};

/**
 * Monta o JSON de `eventos` que sustentam uma divergência: resolve cada
 * `codigoEvento` de `idsEventos` para os dados completos entre os eventos já
 * carregados do pedido, preservando a ordem de `idsEventos` e as chaves em
 * ordem fixa (`tipo`, `data`, `fonte`, `codigo`).
 */
function montarEventosSustentacao(idsEventos: string[], eventosDoPedido: Evento[]): string {
  const porCodigo = new Map(eventosDoPedido.map((evento) => [evento.codigoEvento, evento]));
  const itens: EventoSustentacao[] = idsEventos.map((codigoEvento) => {
    const evento = porCodigo.get(codigoEvento);
    if (evento === undefined) {
      throw new Error(`Evento ${codigoEvento} não encontrado entre os eventos do pedido`);
    }
    return {
      tipo: evento.tipo,
      data: evento.momentoFato,
      fonte: evento.fonte,
      codigo: evento.codigoEvento,
    };
  });
  return JSON.stringify(itens);
}

/**
 * Monta a projeção `divergencia`: uma linha por `(tipo, pedido)`, ordenada
 * por `id_pedido` e depois `tipo` (§6 L-11).
 */
export function montarDivergencias(
  consultas: Pick<Consultas, "listarEventos">,
  dataCorte: string,
): LinhaDivergenciaProjecao[] {
  const eventosPorPedido = agruparEventosPorPedido(consultas.listarEventos());

  const projecao: LinhaDivergenciaProjecao[] = [];
  for (const [idPedido, armazenados] of eventosPorPedido) {
    const eventosDoPedido = armazenados.map((armazenado) => armazenado.evento);
    const divergencias = calcularDivergencias(eventosDoPedido, dataCorte);
    for (const divergencia of divergencias) {
      projecao.push({
        tipo: divergencia.tipo,
        id_pedido: idPedido,
        motivo: divergencia.motivo,
        eventos: montarEventosSustentacao(divergencia.idsEventos, eventosDoPedido),
      });
    }
  }

  projecao.sort((a, b) => {
    if (a.id_pedido !== b.id_pedido) {
      return a.id_pedido < b.id_pedido ? -1 : 1;
    }
    return a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : 0;
  });

  return projecao;
}
