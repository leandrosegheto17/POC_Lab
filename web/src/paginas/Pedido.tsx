import { useParams } from "react-router";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";

// TP-0055 — T2, placeholder. O detalhe real do pedido (busca pelo
// `:codigo`, chamada à API) entra em tarefa futura.
export function Pedido() {
  const { codigo } = useParams();
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Pedido");

  return (
    <>
      <h1 ref={refTitulo} tabIndex={-1}>
        Pedido
      </h1>
      {codigo ? <p>Código: {codigo}</p> : null}
    </>
  );
}
