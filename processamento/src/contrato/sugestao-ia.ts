import { z } from "zod";

/**
 * Forma de cada item de `ia.sugestoes` do documento de qualidade. O contrato
 * v1 (`EsquemaRespostaQualidade`) mantém `sugestoes` como `unknown[]`; este
 * esquema é a forma concreta que o projetor publica e que o site pode usar
 * para validar cada item.
 */
export const EsquemaSugestaoIA = z.object({
  pagamento: z.string(),
  textoReferencia: z.string(),
  pedidoSugerido: z.string(),
  conferida: z.boolean(),
  motivo: z.string(),
});

export type SugestaoIA = z.infer<typeof EsquemaSugestaoIA>;
