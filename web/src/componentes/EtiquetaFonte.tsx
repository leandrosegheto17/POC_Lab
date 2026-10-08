import "./Etiquetas.css";

export type Fonte = "vendas" | "pagamentos" | "rastreio";

type EtiquetaFonteProps = {
  fonte: Fonte;
};

// TP-0054 — rótulo em português para cada fonte de dados. "rastreio" nunca
// é exibido literalmente ao usuário: a fonte de rastreio é apresentada pelo
// nome do papel de negócio ("Transportadora").
const ROTULOS: Record<Fonte, string> = {
  vendas: "Vendas",
  pagamentos: "Pagamentos",
  rastreio: "Transportadora",
};

export function EtiquetaFonte({ fonte }: EtiquetaFonteProps) {
  return <span className="etiqueta-fonte">{ROTULOS[fonte]}</span>;
}
