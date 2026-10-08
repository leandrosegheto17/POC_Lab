import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

// TP-0055 — move o foco de teclado para o <h1> da página sempre que a rota
// muda (navegação via SPA não recarrega a página, então sem isso o foco
// ficaria "perdido" no item de nav que foi clicado). Cada página aplica a
// ref devolvida num elemento `<h1 tabIndex={-1} ref={refTitulo}>`.
export function useFocoNoTitulo<T extends HTMLElement = HTMLHeadingElement>() {
  const refTitulo = useRef<T>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    refTitulo.current?.focus();
  }, [pathname]);

  return refTitulo;
}
