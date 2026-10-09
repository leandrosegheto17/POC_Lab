import type { BlocoIndicador } from "nucleo/contrato/indicadores.js";
import { TabelaDados } from "../TabelaDados.tsx";
import {
  formatarNumero,
  formatarPercentual,
  semPontoFinal,
} from "../../dados/formatacao.ts";
import { TEXTO_SEM_DADOS_DEFAULT } from "./textos.ts";

type IndicadorProps = {
  /** Bloco do contrato (`EsquemaBlocoIndicador`, `nucleo/contrato/indicadores.ts`). */
  bloco: BlocoIndicador;
  /**
   * Texto mostrado na coluna "%" quando `linha.resultado` é `null` (caso de
   * `denominador: 0`). Default genérico — telas que sabem o motivo exato
   * (ex. "sem entregas com data conhecida") devem passar um texto mais
   * específico.
   */
  textoSemDados?: string;
};

/**
 * Desenha um bloco que a T3 ainda não conhece (indicador novo na API):
 * título, fórmula e numerador/denominador/% por linha (% = numerador
 * ÷ denominador). Os 4 blocos atuais têm componente próprio nesta pasta.
 *
 * `bloco.aParte` marca que a ÚLTIMA linha é um valor "à parte" (contagem
 * bruta, sem razão): fica fora da tabela, na caixa de fórmula.
 */
export function Indicador({
  bloco,
  textoSemDados = TEXTO_SEM_DADOS_DEFAULT,
}: IndicadorProps) {
  const idTitulo = `indicador-${bloco.chave}-titulo`;
  const linhasTabela = bloco.aParte ? bloco.linhas.slice(0, -1) : bloco.linhas;
  const linhaAParte = bloco.aParte
    ? bloco.linhas[bloco.linhas.length - 1]
    : undefined;

  return (
    <section className="cartao indicador" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{bloco.titulo}</h2>

      <p className="caixa-formula">
        Fórmula: {semPontoFinal(bloco.formula)}.
        {linhaAParte ? (
          <>
            {" "}
            {linhaAParte.rotulo}:{" "}
            <span className="mono">
              {formatarNumero(linhaAParte.numerador)}
            </span>
            .
          </>
        ) : null}
      </p>

      <TabelaDados
        caption={bloco.titulo}
        legendaOculta
        semMoldura
        compacta
        rotuloRegiao={`Tabela — ${bloco.titulo}`}
        cabecalhos={[
          "Rótulo",
          { texto: "Numerador", numerico: true },
          { texto: "Denominador", numerico: true },
          { texto: "%", numerico: true },
        ]}
      >
        {linhasTabela.map((linha, indice) => (
          <tr key={`${bloco.chave}-${String(indice)}`}>
            <td>{linha.rotulo}</td>
            <td className="num">{formatarNumero(linha.numerador)}</td>
            <td className="num">{formatarNumero(linha.denominador)}</td>
            <td className="num">
              {formatarPercentual(linha.numerador, linha.denominador) ??
                textoSemDados}
            </td>
          </tr>
        ))}
      </TabelaDados>
    </section>
  );
}
