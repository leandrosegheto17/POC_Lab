import "./Etiquetas.css";

import { rotuloFonte, type Fonte } from "../dados/rotulos.ts";

export { rotuloFonte };
export type { Fonte };

type EtiquetaFonteProps = {
  fonte: Fonte;
  /**
   * Ajuste Modelo B (2026-10-08): "selo" é o selo colorido em caixa alta
   * do celular (T2), com as cores `--fonte-<fonte>-*`. Sem variante, mantém
   * a etiqueta neutra de antes.
   */
  variante?: "selo";
};

export function EtiquetaFonte({ fonte, variante }: EtiquetaFonteProps) {
  const classe =
    variante === "selo"
      ? `etiqueta-fonte etiqueta-fonte--selo etiqueta-fonte--${fonte}`
      : "etiqueta-fonte";

  return <span className={classe}>{rotuloFonte(fonte)}</span>;
}
