import { z } from "zod";
import {
  EsquemaEventoColetaV1,
  EsquemaEventoEntregaV1,
  EsquemaEventoPagamentoV1,
  EsquemaEventoTransporteV1,
  EsquemaEventoVendaV1,
  EsquemaLinhaDoTempoV1,
} from "./linha-do-tempo-v1.js";

/**
 * Evento v2 da linha do tempo de um pedido.
 *
 * Cada variante é a da v1 mais `versao_schema` (a v1 descarta esse campo; a
 * v2 o expõe). Para `venda`/`coleta`/`transporte`/`entrega` só existe a
 * versão 1 do payload (ver `dominio/evento.ts`). Para `pagamento` existem as
 * versões 1 e 2: a variante é uma união discriminada por `versao_schema`, e a
 * v2 acrescenta `meio_pagamento`.
 *
 * Como na v1, cada variante é `z.object()` simples (sem `.strict()` nem
 * `.passthrough()`).
 */
const EsquemaEventoPagamentoV2 = z.discriminatedUnion("versao_schema", [
  EsquemaEventoPagamentoV1.extend({ versao_schema: z.literal(1) }),
  EsquemaEventoPagamentoV1.extend({
    versao_schema: z.literal(2),
    meio_pagamento: z.string(),
  }),
]);

export const EsquemaEventoV2 = z.discriminatedUnion("tipo", [
  EsquemaEventoVendaV1.extend({ versao_schema: z.literal(1) }),
  EsquemaEventoPagamentoV2,
  EsquemaEventoColetaV1.extend({ versao_schema: z.literal(1) }),
  EsquemaEventoTransporteV1.extend({ versao_schema: z.literal(1) }),
  EsquemaEventoEntregaV1.extend({ versao_schema: z.literal(1) }),
]);

/**
 * Resposta v2 da linha do tempo de um pedido: o `pedido` da v1 (reaproveitado
 * por import) e a sequência de eventos v2 (ver `EsquemaEventoV2`).
 */
export const EsquemaLinhaDoTempoV2 = z.object({
  pedido: EsquemaLinhaDoTempoV1.shape.pedido,
  eventos: z.array(EsquemaEventoV2),
});

export type EventoV2 = z.infer<typeof EsquemaEventoV2>;
export type LinhaDoTempoV2 = z.infer<typeof EsquemaLinhaDoTempoV2>;
