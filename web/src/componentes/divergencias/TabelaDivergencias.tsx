import type { RefObject } from "react";
import { Link } from "react-router";
import type { RespostaDivergencias } from "processamento/contrato/divergencias.js";
import { TabelaDados } from "../TabelaDados.tsx";
import { EtiquetaTipo } from "../EtiquetaTipo.tsx";
import { EventosDivergencia } from "./EventosDivergencia.tsx";

interface Props {
  resposta: RespostaDivergencias;
  rotuloFiltro: string;
  refCaption: RefObject<HTMLTableCaptionElement | null>;
}

/** PC: tabela. Colunas Devido/Pago do mockup ficam de fora: a API v1 não
 * entrega esses valores (ADR-016). */
export function TabelaDivergencias({ resposta, rotuloFiltro, refCaption }: Props) {
  const { pagina, totalPaginas } = resposta.paginacao;
  return (
    <div className="divergencias__tabela">
      <TabelaDados
        caption={`Filtro: ${rotuloFiltro} · página ${String(pagina)} de ${String(totalPaginas)}`}
        refCaption={refCaption}
        rotuloRegiao="Tabela de divergências"
        cabecalhos={["Pedido", "Tipo", "Motivo", "Eventos"]}
      >
        {resposta.dados.map((linha) => (
          <tr key={`${linha.pedido}-${linha.tipo}`}>
            <td>
              <Link to={`/pedido/${encodeURIComponent(linha.pedido)}`} className="mono">
                {linha.pedido}
              </Link>
            </td>
            <td>
              <EtiquetaTipo tipo={linha.tipo} />
            </td>
            <td>{linha.motivo}</td>
            <td>
              <EventosDivergencia eventos={linha.eventos} />
            </td>
          </tr>
        ))}
      </TabelaDados>
    </div>
  );
}
