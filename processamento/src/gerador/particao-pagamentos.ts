import type { PedidoVendas } from "../fontes/leitura-vendas.js";

/**
 * Cada constante abaixo é a fração do total de pedidos recebidos que recebe
 * aquele tipo de caso de pagamento — os subconjuntos sorteados são sempre
 * DISJUNTOS entre si (cada pedido recebe no máximo 1 caso), particionados na
 * mesma ordem fixa listada em `ORDEM_TIPOS_PARTICAO` para que o determinismo
 * do PRNG não dependa da ordem de iteração de um objeto.
 *
 * Valores de exemplo, escolhidos para somar uma fração minoritária do total
 * (32%), deixando a maior parte dos pedidos "limpos" sem nenhum caso
 * plantado.
 */
export const PROPORCAO_DUPLICADO = 0.05;
export const PROPORCAO_PARCIAL = 0.05;
export const PROPORCAO_ENVIADO_NAO_PAGO = 0.05;
export const PROPORCAO_TEXTO_LIVRE = 0.03;
export const PROPORCAO_DOIS_CODIGOS = 0.03;
export const PROPORCAO_REPETIDO = 0.03;
export const PROPORCAO_LINHA_INVALIDA = 0.03;
export const PROPORCAO_FORA_DO_PADRAO = 0.05;

export const ORDEM_TIPOS_PARTICAO = [
  "duplicado",
  "parcial",
  "enviado_nao_pago",
  "texto_livre",
  "dois_codigos",
  "repetido",
  "linha_invalida",
  "fora_padrao",
] as const;

export type TipoParticao = (typeof ORDEM_TIPOS_PARTICAO)[number];

const PROPORCOES_POR_TIPO: Record<TipoParticao, number> = {
  duplicado: PROPORCAO_DUPLICADO,
  parcial: PROPORCAO_PARCIAL,
  enviado_nao_pago: PROPORCAO_ENVIADO_NAO_PAGO,
  texto_livre: PROPORCAO_TEXTO_LIVRE,
  dois_codigos: PROPORCAO_DOIS_CODIGOS,
  repetido: PROPORCAO_REPETIDO,
  linha_invalida: PROPORCAO_LINHA_INVALIDA,
  fora_padrao: PROPORCAO_FORA_DO_PADRAO,
};

/** Embaralha uma lista de forma determinística (Fisher-Yates) a partir do PRNG recebido, sem mutar a lista original. */
function embaralhar<T>(itens: T[], prng: () => number): T[] {
  const copia = itens.slice();
  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const sorteado = Math.floor(prng() * (indice + 1));
    const temporario = copia[indice] as T;
    copia[indice] = copia[sorteado] as T;
    copia[sorteado] = temporario;
  }
  return copia;
}

/**
 * Particiona os pedidos recebidos em subconjuntos DISJUNTOS, um por tipo de
 * caso, sempre na ordem fixa recebida em `ordem`: a cada tipo, embaralha o
 * que resta do "pool" (via PRNG) e retira do início a quantidade
 * correspondente à proporção daquele tipo (sobre o total original de
 * pedidos recebidos); o restante do pool segue para o próximo tipo. Como
 * cada pedido só pode ser retirado do pool uma vez, nenhum pedido recebe
 * mais de 1 tipo de caso.
 */
export function particionarPorProporcao<Tipo extends string>(
  pedidos: PedidoVendas[],
  prng: () => number,
  ordem: readonly Tipo[],
  proporcoes: Record<Tipo, number>,
): Record<Tipo, PedidoVendas[]> {
  const total = pedidos.length;
  let pool = pedidos.slice();
  const grupos = {} as Record<Tipo, PedidoVendas[]>;

  for (const tipo of ordem) {
    const quantidade = Math.floor(proporcoes[tipo] * total);
    const embaralhado = embaralhar(pool, prng);
    grupos[tipo] = embaralhado.slice(0, quantidade);
    pool = embaralhado.slice(quantidade);
  }

  return grupos;
}

/** Partição dos casos de pagamento: ordem e proporções de `ORDEM_TIPOS_PARTICAO`. */
export function particionarPedidos(
  pedidos: PedidoVendas[],
  prng: () => number,
): Record<TipoParticao, PedidoVendas[]> {
  return particionarPorProporcao(pedidos, prng, ORDEM_TIPOS_PARTICAO, PROPORCOES_POR_TIPO);
}
