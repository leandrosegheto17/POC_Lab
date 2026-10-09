/**
 * PRNG determinístico, implementação própria do algoritmo
 * conhecido como `mulberry32`.
 *
 * Propositalmente não usa `Math.random()` em lugar nenhum: todo o gerador de
 * dados sintéticos (pedidos "limpos", pagamentos, rastreio e
 * plantio de problemas) precisa ser 100% reproduzível a partir de uma
 * semente, para que duas execuções com a mesma semente produzam arquivos
 * idênticos byte a byte.
 *
 * Semente padrão do gerador (usada pela CLI `gerar` quando `--semente` não é
 * informado). Arbitrária, só precisa ser estável entre execuções.
 */
export const SEMENTE_PADRAO = 20261007;

/**
 * Cria um gerador de números pseudoaleatórios determinístico a partir de uma
 * semente inteira (32 bits). Cada chamada da função devolvida produz o
 * próximo número da sequência, em `[0, 1)`.
 *
 * Implementação padrão conhecida do mulberry32: o estado interno (32 bits)
 * avança por uma soma constante e depois passa por uma mistura de
 * shifts/multiplicações (`Math.imul`) antes de ser normalizado para
 * `[0, 1)` por divisão por `2^32`.
 */
export function mulberry32(semente: number): () => number {
  let estado = semente >>> 0;

  return function proximo(): number {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let z = estado;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z = (z ^ (z + Math.imul(z ^ (z >>> 7), z | 61))) >>> 0;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
