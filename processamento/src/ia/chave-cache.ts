import { createHash } from "node:crypto";

/**
 * Convenção de serialização no `cache_ia.resposta`: como a tabela só guarda
 * `TEXT NOT NULL`, "sem sugestão" (`null`) é representado por string vazia;
 * qualquer outro valor é a identidade (`id_pedido`) do candidato escolhido.
 */
export const RESPOSTA_CACHE_SEM_SUGESTAO = "";

/**
 * Chave de `cache_ia`: SHA-256 de texto da referência + lista ordenada de
 * candidatos (JSON) + modelo. Não inclui credencial alguma.
 */
export function calcularChaveCache(
  textoReferencia: string,
  candidatos: readonly string[],
  modelo: string,
): string {
  return createHash("sha256")
    .update(textoReferencia + JSON.stringify(candidatos) + modelo)
    .digest("hex");
}
