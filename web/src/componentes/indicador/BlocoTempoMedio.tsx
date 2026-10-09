import type { BlocoIndicador } from "nucleo/contrato/indicadores.js";
import {
  formatarDias,
  formatarNumero,
  semPontoFinal,
} from "../../dados/formatacao.ts";

/** "pedido→envio" → "pedido → envio". */
function rotuloEtapa(rotulo: string): string {
  return rotulo.replace(/\s*→\s*/g, " → ");
}

function comMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Bloco "Tempo médio" (`tempoMedioPedidoEnvioEntrega`): média em dias =
 * numerador (soma de dias) ÷ denominador (pedidos elegíveis), 1 casa.
 */
export function BlocoTempoMedio({ bloco }: { bloco: BlocoIndicador }) {
  const idTitulo = `indicador-${bloco.chave}-titulo`;

  return (
    <section
      className="cartao indicador indicador--tempo"
      aria-labelledby={idTitulo}
    >
      <h2 id={idTitulo}>Tempo médio</h2>

      <div className="indicador__medidas">
        {bloco.linhas.map((linha) => (
          <div key={linha.rotulo}>
            <p className="indicador__grande indicador__grande--tempo">
              {linha.denominador === 0
                ? "—"
                : formatarDias(linha.numerador / linha.denominador)}
            </p>
            <p className="indicador__legenda">{rotuloEtapa(linha.rotulo)}</p>
          </div>
        ))}
      </div>

      <p className="caixa-formula">
        Fórmula: {semPontoFinal(bloco.formula)}.
        {bloco.linhas.map((linha) => (
          <span key={linha.rotulo}>
            {" "}
            {comMaiuscula(rotuloEtapa(linha.rotulo))}:{" "}
            <span className="mono">
              {formatarNumero(Math.round(linha.numerador))} ÷{" "}
              {formatarNumero(linha.denominador)}
            </span>
            .
          </span>
        ))}
      </p>
    </section>
  );
}
