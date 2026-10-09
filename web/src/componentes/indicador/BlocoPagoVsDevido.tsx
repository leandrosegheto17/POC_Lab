import type { BlocoIndicador } from "processamento/contrato/indicadores.js";
import { TabelaDados } from "../TabelaDados.tsx";
import { rotuloSituacaoPagamento } from "../../dados/rotulos.ts";
import {
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
  semPontoFinal,
} from "../../dados/formatacao.ts";
import { TEXTO_SEM_DADOS_DEFAULT } from "./textos.ts";

/**
 * Bloco "Pago × devido" (`valorPagoVsDevido`). A linha "Total" dá os dois
 * valores em destaque e o % da fórmula (numerador ÷ denominador, não o
 * `resultado` arredondado da API); as demais linhas formam a quebra por
 * situação [requisito mantido].
 */
export function BlocoPagoVsDevido({ bloco }: { bloco: BlocoIndicador }) {
  const idTitulo = `indicador-${bloco.chave}-titulo`;
  const total =
    bloco.linhas.find((linha) => linha.rotulo === "Total") ?? bloco.linhas[0];
  const situacoes = bloco.linhas.filter((linha) => linha !== total);

  return (
    <section
      className="cartao indicador indicador--pago"
      aria-labelledby={idTitulo}
    >
      <h2 id={idTitulo}>Pago × devido</h2>

      {total ? (
        <div className="indicador__medidas">
          <div>
            <p className="indicador__rotulo">Devido</p>
            <p className="indicador__valor-medio">
              {formatarMoedaCompacta(total.denominador)}
            </p>
            <p className="indicador__exato">
              {formatarMoeda(total.denominador)}
            </p>
          </div>
          <div>
            <p className="indicador__rotulo">Pago</p>
            <p className="indicador__valor-medio">
              {formatarMoedaCompacta(total.numerador)}
            </p>
            <p className="indicador__exato">{formatarMoeda(total.numerador)}</p>
          </div>
        </div>
      ) : null}

      <p className="caixa-formula">
        Fórmula: {semPontoFinal(bloco.formula)}
        {total ? (
          <>
            {" "}
            ={" "}
            <span className="mono">
              {formatarPercentual(total.numerador, total.denominador) ?? "—"}
            </span>
          </>
        ) : null}
        .
      </p>

      {situacoes.length > 0 ? (
        <div className="indicador__tabela-pequena">
          <TabelaDados
            caption="Pago × devido por situação"
            legendaOculta
            semMoldura
            compacta
            rotuloRegiao="Pago × devido por situação"
            cabecalhos={[
              "Situação",
              { texto: "Pago", numerico: true },
              { texto: "Devido", numerico: true },
              { texto: "%", numerico: true },
            ]}
          >
            {situacoes.map((linha) => (
              <tr key={linha.rotulo}>
                <td>{rotuloSituacaoPagamento(linha.rotulo)}</td>
                <td className="num">{formatarMoedaCompacta(linha.numerador)}</td>
                <td className="num">
                  {formatarMoedaCompacta(linha.denominador)}
                </td>
                <td className="num">
                  {formatarPercentual(linha.numerador, linha.denominador) ??
                    TEXTO_SEM_DADOS_DEFAULT}
                </td>
              </tr>
            ))}
          </TabelaDados>
        </div>
      ) : null}
    </section>
  );
}
