import { z } from "zod";
import type { Fonte, TipoDivergencia } from "../dominio/modelo.js";
import { EsquemaPaginacao } from "./paginacao.js";

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
 * Evento (resumido) associado a uma divergência, na listagem v1.
 */
export const EsquemaEventoDivergencia = z.object({
  tipo: z.string(),
  data: z.string(),
  fonte: z.enum(FONTES),
  codigo: z.string(),
});

/**
 * Resposta v1 da listagem paginada de divergências.
 */
export const EsquemaRespostaDivergencias = z.object({
  dados: z.array(
    z.object({
      pedido: z.string(),
      tipo: z.enum(TIPOS_DIVERGENCIA),
      motivo: z.string(),
      eventos: z.array(EsquemaEventoDivergencia),
    }),
  ),
  paginacao: EsquemaPaginacao,
});

export type EventoDivergencia = z.infer<typeof EsquemaEventoDivergencia>;
export type RespostaDivergencias = z.infer<typeof EsquemaRespostaDivergencias>;
