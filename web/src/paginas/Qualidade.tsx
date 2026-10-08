import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";

// TP-0055 — T4, placeholder. O conteúdo real de qualidade entra em tarefa
// futura.
export function Qualidade() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Qualidade");

  return (
    <h1 ref={refTitulo} tabIndex={-1}>
      Qualidade
    </h1>
  );
}
