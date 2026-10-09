import { z } from "zod";
import { FONTES, TIPOS_DIVERGENCIA } from "../dominio/modelo.js";
import { EsquemaPaginacao } from "./paginacao.js";

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
