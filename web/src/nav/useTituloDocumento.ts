import { useEffect } from "react";

// TP-0055 — define `document.title` por rota. Todas as páginas (placeholders
// T1-T4 e a página "não encontrada" T5) chamam este hook com o nome da
// própria tela.
export function useTituloDocumento(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} — POC_Lab`;
  }, [titulo]);
}
