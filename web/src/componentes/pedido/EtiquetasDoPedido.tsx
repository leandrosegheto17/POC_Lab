import type { LinhaDoTempoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import { EtiquetaEstado } from "../EtiquetaEstado.tsx";
import { EtiquetaTipo } from "../EtiquetaTipo.tsx";

export type PedidoV1 = LinhaDoTempoV1["pedido"];

/** Total de sistemas de origem (vendas, pagamentos, transportadora). */
export const TOTAL_SISTEMAS = 3;

/**
 * Etiquetas da situação, ao lado do h1 no PC. No celular elas descem para a
 * linha de baixo, junto de "3 de 3 sistemas" (+ "encontrado por …" quando a
 * busca foi por outro código — requisito mantido, o mockup não mostra).
 */
export function EtiquetasDoPedido({ pedido }: { pedido: PedidoV1 }) {
  const buscadoPorOutroCodigo = pedido.codigoBuscado !== pedido.identidade;

  return (
    <div className="pedido-etiquetas">
      {pedido.divergencias.length === 0 ? (
        <EtiquetaEstado variante="ok">Sem divergência</EtiquetaEstado>
      ) : (
        pedido.divergencias.map((divergencia, indice) => (
          <EtiquetaTipo
            key={`${divergencia.tipo}-${String(indice)}`}
            tipo={divergencia.tipo}
          />
        ))
      )}
      <span className="so-celular pedido-sistemas">
        {pedido.fontes.length} de {TOTAL_SISTEMAS} sistemas
        {buscadoPorOutroCodigo ? (
          <>
            {" · encontrado por "}
            <span className="mono">{pedido.codigoBuscado}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}
