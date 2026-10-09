import { z } from "zod";

/**
 * Códigos de erro normalizados da API, usados no corpo RFC 9457.
 */
export const EsquemaCodigoErro = z.enum([
  "parametro_invalido",
  "pedido_nao_encontrado",
  "rota_nao_encontrada",
  "metodo_nao_permitido",
  "erro_interno",
]);

export type CodigoErro = z.infer<typeof EsquemaCodigoErro>;

/**
 * Corpo de erro no formato RFC 9457 (Problem Details).
 *
 * Quando `status` é 400, `erros` é obrigatório e não pode ser vazio
 * (um item por campo inválido). Para qualquer outro `status`, `erros`
 * não deve ser informado.
 */
export const EsquemaErro = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
    codigo: EsquemaCodigoErro,
    erros: z
      .array(
        z.object({
          campo: z.string(),
          mensagem: z.string(),
        }),
      )
      .optional(),
  })
  .refine(
    (valor) =>
      valor.status === 400
        ? Array.isArray(valor.erros) && valor.erros.length > 0
        : valor.erros === undefined,
    {
      message:
        "'erros' é obrigatório e não pode ser vazio quando status é 400; para qualquer outro status, 'erros' não deve ser informado",
      path: ["erros"],
    },
  );

export type Erro = z.infer<typeof EsquemaErro>;
