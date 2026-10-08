import { useRef } from "react";

// Movimentação automática de foco para leitor de tela (TP-0055) desativada —
// POC não precisa desse suporte. Mantido como no-op para não exigir mudança
// nas páginas que já usam `refTitulo`/`tabIndex={-1}` no `<h1>`.
export function useFocoNoTitulo<T extends HTMLElement = HTMLHeadingElement>() {
  const refTitulo = useRef<T>(null);
  return refTitulo;
}
