import type { Evento } from "./evento.js";
import { ordenarEventos } from "./ordenacao.js";
import { calcularQuitacao, type SituacaoPagamento } from "./quitacao.js";

/**
 * Estado derivado de um pedido a partir de seus eventos, até uma data de
 * corte opcional (RN-08, auditoria "como estava em tal data").
 *
 * `situacaoPagamento` é `null` quando não há evento `venda` dentro do
 * filtro de data — sem valor devido, não há o que quitar, então o pedido
 * simplesmente não é considerado "vendido" (ver `vendido: false`) e a
 * quitação não é calculada.
 */
export type EstadoPedido = {
  vendido: boolean;
  situacaoPagamento: SituacaoPagamento | null;
  coletado: boolean;
  emTransporte: boolean;
  entregue: boolean;
  frase: string;
};

const FRASES_SITUACAO: Record<SituacaoPagamento, string> = {
  sem_pagamento: "aguardando pagamento",
  parcial: "pagamento parcial",
  quitado: "pago",
  excedente: "pagamento excedente",
};

/**
 * Deriva o estado de um pedido a partir de seus eventos, considerando
 * apenas os eventos com `momentoFato <= dataCorte` quando informado.
 *
 * Função pura: ordena os eventos canonicamente (via `ordenarEventos`) antes
 * de processar, para que a saída seja idêntica independente da ordem de
 * entrada; não lê relógio do sistema (`dataCorte` é o único parâmetro de
 * referência temporal) e não depende de ambiente Node (`node:*`).
 */
export function derivarEstado(eventos: Evento[], dataCorte?: string): EstadoPedido {
  const ordenados = ordenarEventos(eventos);
  const filtrados =
    dataCorte === undefined
      ? ordenados
      : ordenados.filter((evento) => evento.momentoFato <= dataCorte);

  const eventoVenda = filtrados.find((evento) => evento.tipo === "venda");
  const vendido = eventoVenda !== undefined;

  let situacaoPagamento: SituacaoPagamento | null = null;
  if (eventoVenda !== undefined) {
    const pagamentos = filtrados
      .filter((evento) => evento.tipo === "pagamento")
      .map((evento) => evento.valor);
    situacaoPagamento = calcularQuitacao(eventoVenda.valor_devido, pagamentos).situacao;
  }

  const coletado = filtrados.some((evento) => evento.tipo === "coleta");
  const emTransporte = filtrados.some((evento) => evento.tipo === "transporte");
  const entregue = filtrados.some((evento) => evento.tipo === "entrega");

  const frase = montarFrase({ vendido, situacaoPagamento, coletado, emTransporte, entregue });

  return { vendido, situacaoPagamento, coletado, emTransporte, entregue, frase };
}

/**
 * Monta a frase em português concatenando os estados na ordem vendido →
 * pagamento → coleta → transporte → entrega. A partir do primeiro estágio
 * logístico ainda não alcançado, a frase para (ex.: "coletado" mas não
 * "em transporte" → frase termina em "ainda não em transporte", sem
 * mencionar entrega, que logicamente também ainda não ocorreu).
 */
function montarFrase(estado: Omit<EstadoPedido, "frase">): string {
  if (!estado.vendido) {
    return "não vendido";
  }

  const partes: string[] = ["vendido"];

  if (estado.situacaoPagamento !== null) {
    partes.push(FRASES_SITUACAO[estado.situacaoPagamento]);
  }

  const estagiosLogisticos: Array<{ alcancado: boolean; rotulo: string; rotuloPendente: string }> = [
    { alcancado: estado.coletado, rotulo: "coletado", rotuloPendente: "ainda não coletado" },
    { alcancado: estado.emTransporte, rotulo: "em transporte", rotuloPendente: "ainda não em transporte" },
    { alcancado: estado.entregue, rotulo: "entregue", rotuloPendente: "ainda não entregue" },
  ];

  for (const estagio of estagiosLogisticos) {
    if (estagio.alcancado) {
      partes.push(estagio.rotulo);
    } else {
      partes.push(estagio.rotuloPendente);
      break;
    }
  }

  return partes.join(", ");
}
