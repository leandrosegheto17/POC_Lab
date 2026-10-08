import { z } from "zod";
import type { TipoDivergencia } from "../dominio/modelo.js";

/**
 * Literais de `TipoDivergencia` (../dominio/modelo.ts), repetidos aqui
 * apenas como lista de valores para `z.enum` — o tipo nunca é
 * redeclarado, só os literais usados para validação em runtime.
 */
const TIPOS_DIVERGENCIA = [
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
] as const satisfies readonly TipoDivergencia[];

/**
 * Parâmetros de consulta aceitos pela listagem de divergências.
 *
 * Estrito: qualquer parâmetro fora de `tipo`, `pagina` e `tamanho` é
 * rejeitado. `pagina` e `tamanho` aceitam strings numéricas (query
 * string) via coerção.
 */
export const EsquemaConsultaDivergencias = z
  .object({
    tipo: z.enum(TIPOS_DIVERGENCIA).optional(),
    pagina: z.coerce.number().int().min(1).max(10_000).default(1),
    tamanho: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ConsultaDivergencias = z.infer<typeof EsquemaConsultaDivergencias>;
