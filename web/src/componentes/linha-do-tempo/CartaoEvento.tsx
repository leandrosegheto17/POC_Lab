import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";
import { formatarData } from "../../dados/formatacao.ts";
import { fonteDoEvento, rotuloEvento } from "../../dados/rotulos.ts";
import { EtiquetaEstado } from "../EtiquetaEstado.tsx";
import { EtiquetaFonte } from "../EtiquetaFonte.tsx";
import { marcasDoEvento } from "./agrupamento.ts";
import {
  DetalhePc,
  textoCodigoCelular,
  textoFonteOculta,
} from "./DetalhesEvento.tsx";

export function CartaoEvento({
  evento,
  dataEscolhida,
  dataLimite,
  duplicado,
}: {
  evento: EventoV1;
  dataEscolhida?: string;
  dataLimite?: string;
  duplicado: boolean;
}) {
  const fonte = fonteDoEvento(evento.tipo);
  // Comparação de string simples (só para exibição; o estado vem de `derivarEstado`).
  const depoisDaDataEscolhida =
    dataEscolhida !== undefined &&
    dataEscolhida !== "" &&
    evento.momentoFato > `${dataEscolhida}T23:59:59.999Z`;
  const marcas = marcasDoEvento(evento, duplicado, dataLimite);

  const classes = ["evento"];
  if (duplicado) {
    classes.push("evento--ruim");
  }
  if (depoisDaDataEscolhida) {
    classes.push("evento--depois");
  }

  return (
    <li className={classes.join(" ")} data-fonte={fonte}>
      <div className="evento__topo">
        <EtiquetaFonte fonte={fonte} variante="selo" />
        <span className="evento__data mono">
          {formatarData(evento.momentoFato)}
        </span>
      </div>
      <strong className="evento__titulo">
        {rotuloEvento(evento.tipo)}
        {marcas.map((marca) => (
          <span key={marca.texto}>
            {" "}
            <EtiquetaEstado variante={marca.variante}>{marca.texto}</EtiquetaEstado>
          </span>
        ))}
      </strong>
      <span className="visualmente-oculto evento__fonte-oculta">
        {textoFonteOculta(evento, fonte)}
      </span>
      {depoisDaDataEscolhida ? (
        // G-14 — nunca só opacidade: o texto é visível no DOM.
        <span className="evento__depois">depois da data escolhida</span>
      ) : (
        <>
          <DetalhePc evento={evento} />
          <span className="evento__linha evento__linha--celular mono">
            {textoCodigoCelular(evento)}
          </span>
        </>
      )}
    </li>
  );
}
