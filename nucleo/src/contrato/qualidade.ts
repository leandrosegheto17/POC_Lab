import { z } from "zod";
import { FONTES, TIPOS_ACHADO } from "../dominio/modelo.js";

/**
 * Exemplo concreto de um achado de qualidade: a fonte de origem, a
 * referência do registro, o detalhe textual e, opcionalmente, o pedido
 * relacionado.
 */
export const EsquemaExemploAchado = z.object({
  fonte: z.enum(FONTES),
  referencia: z.string(),
  detalhe: z.string(),
  pedido: z.string().optional(),
});

/**
 * Achado de qualidade: tipo, contagem total, a regra textual aplicada e até
 * 10 exemplos concretos com fonte.
 */
export const EsquemaAchado = z.object({
  tipo: z.enum(TIPOS_ACHADO),
  contagem: z.number().int().min(0),
  regra: z.string(),
  exemplos: z.array(EsquemaExemploAchado).max(10),
});

/**
 * Resposta v1 de `qualidade`: exatamente os 7 tipos de achado (um por
 * literal de `TipoAchado`) mais o bloco de IA (se foi utilizada e as
 * sugestões geradas — vazio na Must).
 */
export const EsquemaRespostaQualidade = z.object({
  achados: z.array(EsquemaAchado).length(7),
  ia: z.object({
    utilizada: z.boolean(),
    sugestoes: z.array(z.unknown()),
  }),
});

export type ExemploAchado = z.infer<typeof EsquemaExemploAchado>;
export type Achado = z.infer<typeof EsquemaAchado>;
export type RespostaQualidade = z.infer<typeof EsquemaRespostaQualidade>;
