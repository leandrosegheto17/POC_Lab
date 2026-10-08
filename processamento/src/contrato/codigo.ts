import { z } from "zod";

/**
 * Normaliza um código de pedido informado pelo usuário: remove todos os
 * espaços (nas extremidades e internos, incluindo sequências repetidas)
 * e converte para caixa alta, para bater com o código armazenado sem
 * espaços (ex.: "PED-000001").
 */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().replace(/\s+/g, "").toUpperCase();
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
