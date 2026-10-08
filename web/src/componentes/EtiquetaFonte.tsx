import "./Etiquetas.css";

export type Fonte = "vendas" | "pagamentos" | "rastreio";

type EtiquetaFonteProps = {
  fonte: Fonte;
  /**
   * Ajuste Modelo B (2026-10-08): "selo" é o selo colorido em caixa alta
   * do celular (T2), com as cores `--fonte-<fonte>-*`. Sem variante, mantém
   * a etiqueta neutra de antes.
   */
  variante?: "selo";
};

// TP-0054 — rótulo em português para cada fonte de dados. "rastreio" nunca
// é exibido literalmente ao usuário: a fonte de rastreio é apresentada pelo
// nome do papel de negócio ("Transportadora").
const ROTULOS: Record<Fonte, string> = {
  vendas: "Vendas",
  pagamentos: "Pagamentos",
  rastreio: "Transportadora",
};

/** Texto da fonte, para quem só precisa do rótulo (sem a etiqueta). */
export function rotuloFonte(fonte: Fonte): string {
  return ROTULOS[fonte];
}

export function EtiquetaFonte({ fonte, variante }: EtiquetaFonteProps) {
  const classe =
    variante === "selo"
      ? `etiqueta-fonte etiqueta-fonte--selo etiqueta-fonte--${fonte}`
      : "etiqueta-fonte";

  return <span className={classe}>{ROTULOS[fonte]}</span>;
}
