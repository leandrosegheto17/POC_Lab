import { z } from "zod";

/**
 * Normaliza um código de pedido informado pelo usuário: remove espaços
 * nas extremidades, colapsa espaços internos repetidos em um único
 * espaço e converte para caixa alta.
 */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Código de pedido aceito como parâmetro: até 40 caracteres, somente
 * letras, números, espaço, `_` e `-`.
 */
export const EsquemaParametroCodigo = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9 _-]+$/);
