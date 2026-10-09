import { z } from "zod";
import { FONTES, TIPOS_DIVERGENCIA } from "../dominio/modelo.js";

/**
 * Evento v1 da linha do tempo de um pedido.
 *
 * Mesmos campos de envelope/payload v1 de `dominio/evento.ts`, MENOS
 * `versao_schema` (não exposto na API v1) e MAIS `chegouForaDeOrdem`
 * (achado de qualidade de dados, RN-08).
 *
 * Cada variante usa `z.object()` simples (sem `.strict()`) de propósito:
 * um campo desconhecido (ex.: `meio_pagamento` de um pagamento v2,
 * ver `linha-do-tempo-v2.ts`) é descartado silenciosamente no `.parse()`, em vez de
 * rejeitar a resposta — ver teste dedicado em
 * `test/contrato/respostas-v1.test.ts`.
 */
export const EsquemaEventoVendaV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("venda"),
  valor_devido: z.number(),
  data_limite: z.string(),
  transportadora: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

export const EsquemaEventoPagamentoV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("pagamento"),
  valor: z.number(),
  referencia_original: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

export const EsquemaEventoColetaV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("coleta"),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

export const EsquemaEventoTransporteV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("transporte"),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

export const EsquemaEventoEntregaV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("entrega"),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

export const EsquemaEventoV1 = z.discriminatedUnion("tipo", [
  EsquemaEventoVendaV1,
  EsquemaEventoPagamentoV1,
  EsquemaEventoColetaV1,
  EsquemaEventoTransporteV1,
  EsquemaEventoEntregaV1,
]);

/**
 * Resposta v1 da linha do tempo de um pedido: identidade/fontes vinculadas,
 * valores devido/pago, prazo, divergências já detectadas e a sequência de
 * eventos v1 (ver `EsquemaEventoV1`).
 */
export const EsquemaLinhaDoTempoV1 = z.object({
  pedido: z.object({
    identidade: z.string(),
    codigoBuscado: z.string(),
    fontes: z.array(
      z.object({
        fonte: z.enum(FONTES),
        codigo: z.string(),
      }),
    ),
    devido: z.number(),
    pago: z.number(),
    dataLimite: z.string(),
    divergencias: z.array(
      z.object({
        tipo: z.enum(TIPOS_DIVERGENCIA),
        motivo: z.string(),
      }),
    ),
  }),
  eventos: z.array(EsquemaEventoV1),
});

export type EventoV1 = z.infer<typeof EsquemaEventoV1>;
export type LinhaDoTempoV1 = z.infer<typeof EsquemaLinhaDoTempoV1>;
