import { z } from "zod";
import type { Fonte, TipoDivergencia } from "../dominio/modelo.js";

/**
 * Literais de `TipoDivergencia`/`Fonte` (../dominio/modelo.ts), repetidos
 * aqui apenas como lista de valores para `z.enum` — o tipo nunca é
 * redeclarado, só os literais usados para validação em runtime.
 */
const TIPOS_DIVERGENCIA = [
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
] as const satisfies readonly TipoDivergencia[];

const FONTES = [
  "vendas",
  "pagamentos",
  "rastreio",
] as const satisfies readonly Fonte[];

/**
 * Evento v1 da linha do tempo de um pedido.
 *
 * Mesmos campos de envelope/payload v1 de `dominio/evento.ts`, MENOS
 * `versao_schema` (não exposto na API v1) e MAIS `chegouForaDeOrdem`
 * (achado de qualidade de dados, RN-08).
 *
 * Cada variante usa `z.object()` simples (sem `.strict()`) de propósito:
 * um campo desconhecido (ex.: `meio_pagamento` de uma v2 futura de
 * pagamento) é descartado silenciosamente no `.parse()`, em vez de
 * rejeitar a resposta — ver teste dedicado em
 * `test/contrato/respostas-v1.test.ts`.
 */
const EsquemaEventoVendaV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("venda"),
  valor_devido: z.number(),
  data_limite: z.string(),
  transportadora: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoPagamentoV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("pagamento"),
  valor: z.number(),
  referencia_original: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoColetaV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("coleta"),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoTransporteV1 = z.object({
  fonte: z.enum(FONTES),
  codigoEvento: z.string(),
  momentoFato: z.string(),
  tipo: z.literal("transporte"),
  transportadora: z.string(),
  codigo_rastreio: z.string(),
  chegouForaDeOrdem: z.boolean(),
});

const EsquemaEventoEntregaV1 = z.object({
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
