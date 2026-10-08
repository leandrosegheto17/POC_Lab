import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";

// TP-0055 — T1, placeholder. A tabela/lista de divergências real entra em
// tarefa futura (ver TP-0054, em paralelo, para os componentes de tabela).
export function Divergencias() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Divergências");

  return (
    <h1 ref={refTitulo} tabIndex={-1}>
      Divergências
    </h1>
  );
}
