import { z } from "zod";

/**
 * Forma de cada item de `ia.sugestoes` do documento de qualidade. O contrato
 * v1 (`EsquemaRespostaQualidade`) mantém `sugestoes` como `unknown[]`; este
 * esquema é a forma concreta que o projetor publica e que o site pode usar
 * para validar cada item.
 */
export const LIMITE_TEXTO_CURTO_SUGESTAO = 200;
export const LIMITE_TEXTO_LONGO_SUGESTAO = 600;

export const EsquemaSugestaoIA = z.object({
  pagamento: z.string().max(LIMITE_TEXTO_CURTO_SUGESTAO),
  textoReferencia: z.string().max(LIMITE_TEXTO_LONGO_SUGESTAO),
  pedidoSugerido: z.string().max(LIMITE_TEXTO_CURTO_SUGESTAO),
  conferida: z.boolean(),
  motivo: z.string().max(LIMITE_TEXTO_LONGO_SUGESTAO),
});

export type SugestaoIA = z.infer<typeof EsquemaSugestaoIA>;
