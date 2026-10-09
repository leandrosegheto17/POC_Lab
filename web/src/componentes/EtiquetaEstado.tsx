import type { ReactNode } from "react";
import "./Etiquetas.css";

export type VarianteEstado = "ok" | "alerta" | "ruim" | "neutra";

type EtiquetaEstadoProps = {
  variante: VarianteEstado;
  children: ReactNode;
};

// Etiqueta de estado com texto livre
// ("duplicado", "fora de ordem", "no prazo", "atrasada", "Aceita",
// "Rejeitada"...). Reaproveita as paletas das etiquetas de tipo:
//   ok     -> sem divergência (verde)
//   alerta -> pagamento parcial (âmbar)
//   ruim   -> pago duas vezes (vermelho)
//   neutra -> entrega atrasada (cinza)
// O significado nunca depende só da cor: o texto sempre diz o estado.
export function EtiquetaEstado({ variante, children }: EtiquetaEstadoProps) {
  return (
    <span
      className={`etiqueta etiqueta--${variante}`}
      data-variante={variante}
    >
      {children}
    </span>
  );
}
