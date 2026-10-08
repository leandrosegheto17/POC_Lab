import "./Etiquetas.css";

export type TipoDivergencia =
  | "duplicado"
  | "parcial"
  | "pago_nao_enviado"
  | "enviado_nao_pago"
  | "entrega_atrasada"
  | "sem_divergencia";

type EtiquetaTipoProps = {
  tipo: TipoDivergencia;
};

// TP-0054 / ajuste Modelo B (2026-10-08, mockup à risca) — cada `tipo` de
// divergência tem a sua própria paleta (texto/fundo/borda em tokens.css,
// `--etq-<tipo>-*`); nenhuma paleta é reaproveitada entre tipos.
// Rótulo de `duplicado` é "Pago duas vezes" (igual ao chip do filtro).
const CONFIGURACAO: Record<
  TipoDivergencia,
  { variante: string; rotulo: string }
> = {
  duplicado: { variante: "duplicado", rotulo: "Pago duas vezes" },
  parcial: { variante: "parcial", rotulo: "Pagamento parcial" },
  pago_nao_enviado: {
    variante: "pago-nao-enviado",
    rotulo: "Pago e não enviado",
  },
  enviado_nao_pago: {
    variante: "enviado-nao-pago",
    rotulo: "Enviado e não pago",
  },
  entrega_atrasada: {
    variante: "entrega-atrasada",
    rotulo: "Entrega atrasada",
  },
  sem_divergencia: { variante: "sem-divergencia", rotulo: "Sem divergência" },
};

/** Rótulo em português de um tipo de divergência (sem a etiqueta). */
export function rotuloTipo(tipo: TipoDivergencia): string {
  return CONFIGURACAO[tipo].rotulo;
}

export function EtiquetaTipo({ tipo }: EtiquetaTipoProps) {
  const { variante, rotulo } = CONFIGURACAO[tipo];

  return (
    <span
      className={`etiqueta etiqueta--${variante}`}
      data-variante={variante}
    >
      {rotulo}
    </span>
  );
}
