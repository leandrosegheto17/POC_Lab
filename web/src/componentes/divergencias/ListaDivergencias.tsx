import { Link } from "react-router";
import type { RespostaDivergencias } from "nucleo/contrato/divergencias.js";
import { EtiquetaTipo } from "../EtiquetaTipo.tsx";
import { EventosDivergencia } from "./EventosDivergencia.tsx";

/** Celular: lista de cartões no lugar da tabela. O cartão não é um link
 * inteiro — o link fica só no código do pedido (evita interativo aninhado
 * com o `<details>`). */
export function ListaDivergencias({ resposta }: { resposta: RespostaDivergencias }) {
  return (
    <ul className="divergencias__lista" aria-label="Lista de divergências">
      {resposta.dados.map((linha) => (
        <li key={`${linha.pedido}-${linha.tipo}`} className="divergencias__cartao">
          <div className="divergencias__cartao-topo">
            <Link
              to={`/pedido/${encodeURIComponent(linha.pedido)}`}
              className="mono divergencias__cartao-pedido"
            >
              {linha.pedido}
            </Link>
            <EtiquetaTipo tipo={linha.tipo} />
          </div>
          <p className="divergencias__cartao-motivo">{linha.motivo}</p>
          <div className="divergencias__cartao-eventos">
            <EventosDivergencia eventos={linha.eventos} />
          </div>
        </li>
      ))}
    </ul>
  );
}
