import { SEMENTE_PADRAO } from "../gerador/prng.js";

/**
 * Lê o argumento `--semente N` de uma lista de argumentos de linha de
 * comando (ex. `process.argv.slice(2)`). Devolve `SEMENTE_PADRAO` quando o
 * argumento não é informado ou não é um número válido.
 */
export function obterSemente(argv: string[]): number {
  const indice = argv.indexOf("--semente");
  if (indice === -1 || indice + 1 >= argv.length) {
    return SEMENTE_PADRAO;
  }
  const valor = Number(argv[indice + 1]);
  return Number.isFinite(valor) ? valor : SEMENTE_PADRAO;
}
