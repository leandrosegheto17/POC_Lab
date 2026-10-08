import { z } from "zod";
import type { Fonte } from "../dominio/modelo.js";
import { EsquemaLinhaDoTempoV1 } from "./linha-do-tempo-v1.js";

/**
 * Literais de `Fonte` (../dominio/modelo.ts), repetidos
 * aqui apenas como lista de valores para `z.enum` — o tipo nunca é
 * redeclarado, só os literais usados para validação em runtime.
 *
 * (Mesmos literais de `linha-do-tempo-v1.ts`; repetidos aqui porque aquele
 * módulo não os exporta e não deve ser alterado — G-21.)
 */
const FONTES = [
  "vendas",
  "pagamentos",
  "rastreio",
] as const satisfies readonly Fonte[];

/**
 * Evento v2 da linha do tempo de um pedido.
 *
 * Espelha `EsquemaEventoV1` (`linha-do-tempo-v1.ts`), mas MANTÉM
 * `versao_schema` explícito em cada variante (a v1 descarta esse campo; a
 * v2 expõe).
 *
 * Para `venda`/`coleta`/`transporte`/`entrega`, só existe a versão 1 do
 * payload (ver `dominio/evento.ts`), daí `versao_schema: z.literal(1)`.
 *
 * Para `pagamento`, existem as versões 1 e 2 do payload
 * (`PayloadPagamentoV1`/`PayloadPagamentoV2`): a variante é ela própria uma
 * união discriminada por `versao_schema`, aceitando a v1 (sem
 * `meioPagamento`) OU a v2 (com `meioPagamento` obrigatório).
 *
 * Cada variante usa `z.object()` simples (sem `.strict()` e sem
 * `.passthrough()`), de propósito, igual à v1.
 */
const EsquemaEventoVendaV2 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("venda"),
  versao_schema: z.literal(1),
  valor_devido: z.number(),
  data_limite: z.string(),
  transportadora: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoPagamentoV2 = z.discriminatedUnion("versao_schema", [
  z.object({
    fonte: z.enum(FONTES),
    codigoEvento: z.string(),
    momentoFato: z.string(),
    tipo: z.literal("pagamento"),
    versao_schema: z.literal(1),
    valor: z.number(),
    referencia_original: z.string(),
    chegouForaDeOrdem: z.boolean(),
  }),
  z.object({
    fonte: z.enum(FONTES),
    codigoEvento: z.string(),
    momentoFato: z.string(),
    tipo: z.literal("pagamento"),
    versao_schema: z.literal(2),
    valor: z.number(),
    referencia_original: z.string(),
    meio_pagamento: z.string(),
    chegouForaDeOrdem: z.boolean(),
  }),
]);

const EsquemaEventoColetaV2 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("coleta"),
  versao_schema: z.literal(1),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoTransporteV2 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("transporte"),
  versao_schema: z.literal(1),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoEntregaV2 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("entrega"),
  versao_schema: z.literal(1),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

export const EsquemaEventoV2 = z.discriminatedUnion("tipo", [
  EsquemaEventoVendaV2,
  EsquemaEventoPagamentoV2,
  EsquemaEventoColetaV2,
  EsquemaEventoTransporteV2,
  EsquemaEventoEntregaV2,
]);

/**
 * Resposta v2 da linha do tempo de um pedido: mesmo formato de `pedido` da
 * v1 (reaproveitado por import, não redeclarado — G-21), mas com a
 * sequência de eventos v2 (ver `EsquemaEventoV2`), que expõe
 * `versao_schema` e os campos específicos de cada versão de payload
 * (ex.: `meioPagamento` em `pagamento` v2).
 */
export const EsquemaLinhaDoTempoV2 = z.object({
  pedido: EsquemaLinhaDoTempoV1.shape.pedido,
  eventos: z.array(EsquemaEventoV2),
});

export type EventoV2 = z.infer<typeof EsquemaEventoV2>;
export type LinhaDoTempoV2 = z.infer<typeof EsquemaLinhaDoTempoV2>;
