/**
 * Normalização e casamento da referência de pagamento (RN-09).
 *
 * A referência bruta de um pagamento (ex.: `"PV-000123"`) precisa ser
 * reduzida a um ou mais candidatos de código de pedido, para depois ser
 * confrontada com o conjunto de códigos de pedido conhecidos (já
 * normalizados, sem zeros à esquerda). Vínculo só é feito quando exatamente
 * 1 candidato bate com exatamente 1 código conhecido — qualquer outra
 * contagem (0 ou 2+) é tratada como "sem identificação", para não arriscar
 * vincular pagamento ao pedido errado.
 */

/**
 * Extrai candidato(s) de código de pedido de uma referência bruta.
 *
 * Remove o prefixo `PV-`, espaços (internos e nas pontas) e zeros à
 * esquerda do(s) número(s) restante(s). Quando a referência bruta contém
 * mais de um trecho numérico reconhecível (ex.: duas referências coladas na
 * mesma string), todos os candidatos são devolvidos — não só o primeiro —
 * para que `casarReferencia` possa detectar e rejeitar a ambiguidade.
 *
 * O regex `/\d+/g` é uma sequência simples de dígitos, sem grupos
 * alternativos nem quantificadores aninhados: não há caminho de
 * backtracking exponencial, logo não há risco de ReDoS.
 *
 * Texto livre sem nenhum dígito (ex.: "pagamento do pedido via boleto")
 * devolve lista vazia.
 */
export function normalizarReferencia(referencia: string): string[] {
  const numeros = referencia.match(/\d+/g) ?? [];

  return numeros.map((numero) => {
    const semZerosEsquerda = numero.replace(/^0+/, "");
    return semZerosEsquerda === "" ? "0" : semZerosEsquerda;
  });
}

export type ResultadoCasamento =
  | { idPedido: string }
  | { semIdentificacao: true };

/**
 * Casa uma referência de pagamento bruta com o conjunto de códigos de
 * pedido conhecidos (já normalizados, sem zeros à esquerda).
 *
 * Vincula (`{ idPedido }`) somente quando exatamente 1 candidato extraído de
 * `referencia` bate com `codigosConhecidos`. Zero candidatos batendo (texto
 * livre, ou candidato que não existe no conjunto) ou 2+ candidatos batendo
 * (referência ambígua, com múltiplos códigos) resultam em
 * `{ semIdentificacao: true }`.
 */
export function casarReferencia(
  referencia: string,
  codigosConhecidos: Set<string>,
): ResultadoCasamento {
  const candidatos = normalizarReferencia(referencia);
  const candidatosConhecidos = candidatos.filter((candidato) =>
    codigosConhecidos.has(candidato),
  );

  const [candidatoUnico] = candidatosConhecidos;
  if (candidatosConhecidos.length === 1 && candidatoUnico !== undefined) {
    return { idPedido: candidatoUnico };
  }

  return { semIdentificacao: true };
}
