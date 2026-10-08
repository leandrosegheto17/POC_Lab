import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";

// TP-0055 — T3, placeholder. Os indicadores reais entram em tarefa futura.
export function Indicadores() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Indicadores");

  return (
    <h1 ref={refTitulo} tabIndex={-1}>
      Indicadores
    </h1>
  );
}
