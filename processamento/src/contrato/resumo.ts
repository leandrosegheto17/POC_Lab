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
 * Cartão de indicador do resumo: título, fórmula textual e os operandos
 * que a compõem (numerador/denominador), além do resultado já calculado.
 *
 * `resultado` é `nullable` para cobrir o caso de `denominador: 0` (divisão
 * indefinida), em que o cálculo não é realizado e o cartão expõe apenas os
 * operandos.
 *
 * Definido localmente: mesma forma do cartão usado em
 * `contrato/indicadores.ts`, mas sem import cruzado entre os dois arquivos
 * (tarefas paralelas/sequenciais distintas).
 */
export const EsquemaCartao = z.object({
  titulo: z.string(),
  formula: z.string(),
  numerador: z.number(),
  denominador: z.number(),
  resultado: z.number().nullable(),
});

/**
 * Totais do resumo: contagens de pedidos, detalhamento por tipo de
 * divergência e os cartões financeiros/operacionais agregados.
 */
export const EsquemaTotais = z.object({
  pedidos: EsquemaCartao,
  pedidosComDivergencia: EsquemaCartao,
  porTipo: z.array(
    z.object({
      tipo: z.enum(TIPOS_DIVERGENCIA),
      cartao: EsquemaCartao,
    }),
  ),
  valorEmAberto: EsquemaCartao,
  pagoAMais: EsquemaCartao,
  entregasNoPrazo: EsquemaCartao,
});

/**
 * Resposta v1 do resumo: metadados da publicação/execução (data de corte,
 * semente, versão do contrato, identificador da publicação) e os totais
 * calculados.
 */
export const EsquemaResumo = z.object({
  dataCorte: z.string(),
  semente: z.number().int(),
  versaoContrato: z.string(),
  idPublicacao: z.string(),
  totais: EsquemaTotais,
});

export type Cartao = z.infer<typeof EsquemaCartao>;
export type Totais = z.infer<typeof EsquemaTotais>;
export type Resumo = z.infer<typeof EsquemaResumo>;
