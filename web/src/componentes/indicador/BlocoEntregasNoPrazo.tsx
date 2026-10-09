import { useId, useState } from "react";
import type {
  BlocoIndicador,
  LinhaIndicador,
} from "processamento/contrato/indicadores.js";
import { TabelaDados } from "../TabelaDados.tsx";
import {
  formatarNumero,
  formatarPercentual,
  semPontoFinal,
} from "../../dados/formatacao.ts";
import { BarraProporcao } from "./barra-proporcao.tsx";
import { TEXTO_SEM_ENTREGAS } from "./textos.ts";

type LinhaEntrega = {
  transportadora: string;
  mes: string;
  linha: LinhaIndicador;
};

/** "Transportadora 1 / 2012-07" → { transportadora, mes }. */
function separarRotuloEntrega(linha: LinhaIndicador): LinhaEntrega {
  const posicao = linha.rotulo.lastIndexOf(" / ");
  if (posicao === -1) {
    return { transportadora: linha.rotulo, mes: "", linha };
  }
  return {
    transportadora: linha.rotulo.slice(0, posicao),
    mes: linha.rotulo.slice(posicao + 3),
    linha,
  };
}

/**
 * Bloco "Entregas no prazo por transportadora e mês". `bloco.aParte` marca
 * que a última linha é o total "Pedidos sem entrega" (ver
 * `mapearBlocoParaEsquemaBloco`, `processamento/src/publicacao/documentos.ts`):
 * ela sai da tabela e entra na caixa de fórmula.
 *
 * Filtro "Mês": só no navegador, sobre as linhas já recebidas (nenhuma
 * chamada nova). Padrão = mês mais recente.
 */
export function BlocoEntregasNoPrazo({ bloco }: { bloco: BlocoIndicador }) {
  const idTitulo = `indicador-${bloco.chave}-titulo`;
  const idMes = useId();
  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);

  const linhas = bloco.aParte ? bloco.linhas.slice(0, -1) : bloco.linhas;
  const linhaAParte = bloco.aParte
    ? bloco.linhas[bloco.linhas.length - 1]
    : undefined;

  const itens = linhas.map(separarRotuloEntrega);
  const meses = Array.from(new Set(itens.map((item) => item.mes))).sort();
  const mes =
    mesEscolhido !== null && meses.includes(mesEscolhido)
      ? mesEscolhido
      : (meses[meses.length - 1] ?? "");
  const doMes = itens.filter((item) => item.mes === mes);

  const somaNumerador = linhas.reduce((soma, l) => soma + l.numerador, 0);
  const somaDenominador = linhas.reduce((soma, l) => soma + l.denominador, 0);
  const geral = formatarPercentual(somaNumerador, somaDenominador) ?? "—";

  return (
    <section
      className="cartao indicador indicador--entregas"
      aria-labelledby={idTitulo}
    >
      <div className="indicador__topo">
        <h2 id={idTitulo}>
          Entregas no prazo
          <span className="so-pc"> por transportadora e mês</span>
        </h2>
        <div className="indicador__geral">
          <p className="indicador__grande indicador__grande--geral">
            <span className="visualmente-oculto">Geral: </span>
            {geral}
          </p>
          <p className="indicador__geral-base so-pc">
            geral · {formatarNumero(somaNumerador)} de{" "}
            {formatarNumero(somaDenominador)}
          </p>
        </div>
      </div>

      <p className="caixa-formula">
        Fórmula: {semPontoFinal(bloco.formula)}.
        {linhaAParte ? (
          <>
            {" "}
            Pedidos sem entrega ficam fora do denominador:{" "}
            <span className="mono">
              {formatarNumero(linhaAParte.numerador)}
            </span>
            .
          </>
        ) : null}
      </p>

      {meses.length === 0 ? (
        <p className="indicador__vazio">Nenhuma entrega com data conhecida.</p>
      ) : (
        <>
          <div className="indicador__filtro">
            <label className="rotulo-campo" htmlFor={idMes}>
              Mês
            </label>
            <select
              id={idMes}
              className="campo indicador__select"
              value={mes}
              onChange={(evento) => { setMesEscolhido(evento.target.value); }}
            >
              {meses.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
          </div>

          <div className="indicador__so-pc">
            <TabelaDados
              caption="Entregas no prazo por transportadora e mês"
              legendaOculta
              semMoldura
              compacta
              rotuloRegiao="Tabela de entregas no prazo"
              cabecalhos={[
                "Transportadora",
                "Mês",
                { texto: "No prazo", numerico: true },
                { texto: "Entregas", numerico: true },
                { texto: "%", numerico: true },
                { texto: "Proporção", oculto: true },
              ]}
            >
              {doMes.map(({ transportadora, mes: mesLinha, linha }) => (
                <tr key={linha.rotulo}>
                  <td>{transportadora}</td>
                  <td className="mono">{mesLinha}</td>
                  <td className="num">{formatarNumero(linha.numerador)}</td>
                  <td className="num">{formatarNumero(linha.denominador)}</td>
                  <td className="num">
                    {formatarPercentual(linha.numerador, linha.denominador) ??
                      TEXTO_SEM_ENTREGAS}
                  </td>
                  <td className="indicador__celula-barra">
                    <BarraProporcao
                      numerador={linha.numerador}
                      denominador={linha.denominador}
                    />
                  </td>
                </tr>
              ))}
            </TabelaDados>
          </div>

          <ul className="indicador__linhas indicador__so-celular">
            {doMes.map(({ transportadora, linha }) => (
              <li key={linha.rotulo} className="indicador__linha">
                <span>
                  {transportadora}{" "}
                  <span className="mono indicador__fracao">
                    {formatarNumero(linha.numerador)}/
                    {formatarNumero(linha.denominador)}
                  </span>
                </span>
                <span className="mono indicador__linha-pct">
                  {formatarPercentual(linha.numerador, linha.denominador) ??
                    TEXTO_SEM_ENTREGAS}
                </span>
                <BarraProporcao
                  numerador={linha.numerador}
                  denominador={linha.denominador}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
