import { z } from "zod";

/**
 * Metadados de paginação retornados junto com uma listagem.
 */
export const EsquemaPaginacao = z.object({
  pagina: z.number().int().min(1),
  tamanho: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPaginas: z.number().int().min(0),
});

export type Paginacao = z.infer<typeof EsquemaPaginacao>;
