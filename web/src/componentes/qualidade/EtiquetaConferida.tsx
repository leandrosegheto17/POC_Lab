import { EtiquetaEstado } from "../EtiquetaEstado.tsx";

/** "Conferida?" como etiqueta com texto: "Aceita" (regra conferiu) ou "Rejeitada". */
export function EtiquetaConferida({ conferida }: { conferida: boolean }) {
  return conferida ? (
    <EtiquetaEstado variante="ok">Aceita</EtiquetaEstado>
  ) : (
    <EtiquetaEstado variante="ruim">Rejeitada</EtiquetaEstado>
  );
}
