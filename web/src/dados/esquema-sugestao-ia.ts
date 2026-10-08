import { z } from "zod";

/**
 * TP-0085 — Esquema LOCAL ao site para validar cada item de `ia.sugestoes`.
 *
 * O contrato v1 (`processamento/contrato/qualidade.ts`,
 * `EsquemaRespostaQualidade`) só garante `ia.sugestoes: unknown[]` — a forma
 * concreta de cada item (`SugestaoQualidade`, em
 * `processamento/src/publicacao/qualidade.ts`) nunca é validada em runtime
 * pelo lado do servidor. Este esquema espelha essa forma do lado do site,
 * só para a tela de Qualidade poder exibir os campos com segurança.
 *
 * Itens que falharem `safeParse` (ex.: campo ausente ou do tipo errado) são
 * DESCARTADOS silenciosamente por quem consome este esquema — nunca quebram
 * a renderização dos demais itens válidos.
 */
export const EsquemaSugestaoIA = z.object({
  pagamento: z.string(),
  textoReferencia: z.string(),
  pedidoSugerido: z.string(),
  conferida: z.boolean(),
  motivo: z.string(),
});

export type SugestaoIA = z.infer<typeof EsquemaSugestaoIA>;
