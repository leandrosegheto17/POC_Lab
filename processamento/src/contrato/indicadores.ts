import { z } from "zod";

/**
 * Linha de um bloco de indicador: rótulo descritivo e os operandos que
 * compõem o resultado (numerador/denominador), além do resultado já
 * calculado.
 *
 * `resultado` é `nullable` para cobrir o caso de `denominador: 0` (divisão
 * indefinida). O cálculo propriamente dito (garantir que `resultado` seja
 * `null` quando `denominador` é 0, ou a conta correta nos demais casos) é
 * responsabilidade do domínio — este esquema não impõe essa regra
 * aritmética via `.refine` (ver teste correspondente).
 */
export const EsquemaLinhaIndicador = z.object({
  rotulo: z.string(),
  numerador: z.number(),
  denominador: z.number(),
  resultado: z.number().nullable(),
});

/**
 * Bloco genérico de indicador: chave estável, título, fórmula textual e as
 * linhas que o compõem. `aParte` marca blocos exibidos separadamente dos
 * demais (opcional).
 *
 * A resposta de `indicadores` é uma lista desses blocos — um indicador novo
 * entra como item novo na lista, nunca como campo novo neste esquema.
 */
export const EsquemaBlocoIndicador = z.object({
  chave: z.string(),
  titulo: z.string(),
  formula: z.string(),
  linhas: z.array(EsquemaLinhaIndicador),
  aParte: z.boolean().optional(),
});

/**
 * Resposta v1 de `indicadores`: lista genérica de blocos.
 */
export const EsquemaRespostaIndicadores = z.array(EsquemaBlocoIndicador);

export type LinhaIndicador = z.infer<typeof EsquemaLinhaIndicador>;
export type BlocoIndicador = z.infer<typeof EsquemaBlocoIndicador>;
export type RespostaIndicadores = z.infer<typeof EsquemaRespostaIndicadores>;
