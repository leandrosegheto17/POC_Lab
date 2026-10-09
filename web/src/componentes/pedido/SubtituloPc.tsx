import { TOTAL_SISTEMAS, type PedidoV1 } from "./EtiquetasDoPedido.tsx";

/** Subtítulo do PC (oculto no celular, onde a mesma informação vai para a
 * linha das etiquetas). */
export function SubtituloPc({ pedido }: { pedido: PedidoV1 }) {
  const presenca = `${String(pedido.fontes.length)} de ${String(TOTAL_SISTEMAS)} sistemas`;

  return (
    <p className="so-pc pedido-subtitulo">
      {pedido.codigoBuscado !== pedido.identidade ? (
        <>
          Encontrado pelo código{" "}
          <span className="mono pedido-codigo-destaque">
            {pedido.codigoBuscado}
          </span>{" "}
          · presente em {presenca}
        </>
      ) : (
        `Presente em ${presenca}`
      )}
    </p>
  );
}
