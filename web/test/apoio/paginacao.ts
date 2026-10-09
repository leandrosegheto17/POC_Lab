import { within } from "@testing-library/react";

/** Escopa consultas de role ao bloco `.paginacao-completa` de `Paginacao`,
 * evitando ambiguidade com os botões duplicados em `.paginacao-compacta`
 * (alternados só por CSS). */
export function formaCompleta(container: HTMLElement) {
  const bloco = container.querySelector(".paginacao-completa");
  if (!bloco) {
    throw new Error("Bloco .paginacao-completa não encontrado");
  }
  return within(bloco as HTMLElement);
}
