import {
  EsquemaSugestaoIA,
  type SugestaoIA,
} from "nucleo/contrato/sugestao-ia.js";

export type { SugestaoIA };

/**
 * Valida cada item de `ia.sugestoes` (`unknown[]` no contrato v1) contra o
 * esquema do contrato; item inválido é descartado sem afetar os demais.
 */
export function filtrarSugestoesValidas(sugestoes: unknown[]): SugestaoIA[] {
  const validas: SugestaoIA[] = [];
  for (const item of sugestoes) {
    const resultado = EsquemaSugestaoIA.safeParse(item);
    if (resultado.success) {
      validas.push(resultado.data);
    }
  }
  return validas;
}
