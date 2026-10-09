import type { EventoDivergencia } from "nucleo/contrato/divergencias.js";
import { formatarData } from "../../dados/formatacao.ts";
import { rotuloEvento, rotuloFonte } from "../../dados/rotulos.ts";

/**
 * Eventos de uma divergência dentro de `<details>` (requisito mantido): o
 * `<summary>` tem cara de link ("3 eventos ▸") e a lista aberta mostra data,
 * sistema, tipo e código. Usado na tabela (PC) e no cartão (celular).
 */
export function EventosDivergencia({ eventos }: { eventos: EventoDivergencia[] }) {
  const quantidade = eventos.length;
  const texto = quantidade === 1 ? "1 evento ▸" : `${String(quantidade)} eventos ▸`;

  return (
    <details className="divergencias__eventos">
      <summary>{texto}</summary>
      <ul>
        {eventos.map((evento, indice) => (
          <li key={indice}>
            {formatarData(evento.data)} · {rotuloFonte(evento.fonte)} ·{" "}
            {rotuloEvento(evento.tipo)} ·{" "}
            <span className="mono">{evento.codigo}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
