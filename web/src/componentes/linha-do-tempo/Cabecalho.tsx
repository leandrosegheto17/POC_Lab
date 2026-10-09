import { FONTES, rotuloFonte, type Fonte } from "../../dados/rotulos.ts";

export function Cabecalho({ codigos }: { codigos: Record<Fonte, string> }) {
  return (
    <div className="linha-do-tempo__cabecalho" aria-hidden="true">
      <div className="linha-do-tempo__cabecalho-celula">Data</div>
      {FONTES.map((fonte) => (
        <div key={fonte} className="linha-do-tempo__cabecalho-celula">
          {rotuloFonte(fonte)}
          {codigos[fonte] ? (
            <span className="linha-do-tempo__cabecalho-codigo">
              {codigos[fonte]}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
