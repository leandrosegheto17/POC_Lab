import { useEffect } from "react";

// Define `document.title` por rota. Todas as páginas (T1-T5) chamam este
// hook com o nome da própria tela.
export function useTituloDocumento(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} — POC_Lab`;
  }, [titulo]);
}
