/**
 * Devolve o valor se ele existir; senão falha o teste com uma mensagem clara.
 * Substitui o operador `!` (non-null assertion, proibido pelo lint) em testes:
 * além de satisfazer o tipo, o teste quebra com explicação se a premissa
 * (ex.: "a lista tem pelo menos um item") deixar de valer.
 */
export function obrigatorio<T>(valor: T | null | undefined, descricao = "valor"): T {
  if (valor === null || valor === undefined) {
    throw new Error(`${descricao} esperado(a), mas veio ausente`);
  }
  return valor;
}
