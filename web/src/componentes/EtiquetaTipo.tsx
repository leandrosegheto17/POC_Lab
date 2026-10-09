import "./Etiquetas.css";

import { dadosDoTipo, type TipoComEtiqueta } from "../dados/rotulos.ts";

export type TipoDivergencia = TipoComEtiqueta;

type EtiquetaTipoProps = {
  tipo: TipoDivergencia;
};

// Cada tipo de divergência tem a sua própria paleta (texto/fundo/borda em
// tokens.css, `--etq-<variante>-*`); nenhuma é reaproveitada entre tipos.
export function EtiquetaTipo({ tipo }: EtiquetaTipoProps) {
  const { variante, rotulo } = dadosDoTipo(tipo);

  return (
    <span
      className={`etiqueta etiqueta--${variante}`}
      data-variante={variante}
    >
      {rotulo}
    </span>
  );
}
