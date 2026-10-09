import { Link } from "react-router";
import type { BlocoIndicador } from "processamento/contrato/indicadores.js";
import { TabelaDados } from "../TabelaDados.tsx";
import { EtiquetaTipo } from "../EtiquetaTipo.tsx";
import { ehTipoDivergencia } from "../../dados/rotulos.ts";
import { formatarNumero, semPontoFinal } from "../../dados/formatacao.ts";

/**
 * `linha.rotulo` já chega como o literal do tipo (ex. `"duplicado"`): o
 * domínio preenche `rotulos: [tipo]`, e o `join(" / ")` de 1 elemento
 * devolve o próprio elemento.
 */
function EtiquetaOuTexto({ rotulo }: { rotulo: string }) {
  return ehTipoDivergencia(rotulo) ? (
    <EtiquetaTipo tipo={rotulo} />
  ) : (
    <>{rotulo}</>
  );
}

function linkDoTipo(rotulo: string): string | null {
  return ehTipoDivergencia(rotulo)
    ? `/?tipo=${encodeURIComponent(rotulo)}`
    : null;
}

/** Link só para tipo da enumeração; rótulo desconhecido vira texto. */
function TipoComLink({ rotulo }: { rotulo: string }) {
  const destino = linkDoTipo(rotulo);
  return destino === null ? (
    <EtiquetaOuTexto rotulo={rotulo} />
  ) : (
    <Link to={destino}>
      <EtiquetaOuTexto rotulo={rotulo} />
    </Link>
  );
}

/**
 * Bloco "Divergências por tipo": linhas em ordem decrescente de contagem;
 * cada tipo é um link para a T1 filtrada. A coluna é "Divergências" (os
 * números contam divergências, não pedidos).
 */
export function BlocoDivergenciasPorTipo({ bloco }: { bloco: BlocoIndicador }) {
  const idTitulo = `indicador-${bloco.chave}-titulo`;
  const ordenadas = [...bloco.linhas].sort(
    (a, b) => b.numerador - a.numerador,
  );
  const total = bloco.linhas[0]?.denominador ?? 0;

  return (
    <section
      className="cartao indicador indicador--tipos"
      aria-labelledby={idTitulo}
    >
      <h2 id={idTitulo}>Divergências por tipo</h2>

      <div className="indicador__so-pc">
        <TabelaDados
          caption="Divergências por tipo"
          legendaOculta
          semMoldura
          compacta
          rotuloRegiao="Tabela de divergências por tipo"
          cabecalhos={["Tipo", { texto: "Divergências", numerico: true }]}
        >
          {ordenadas.map((linha) => (
            <tr key={linha.rotulo}>
              <td>
                <TipoComLink rotulo={linha.rotulo} />
              </td>
              <td className="num">{formatarNumero(linha.numerador)}</td>
            </tr>
          ))}
        </TabelaDados>
      </div>

      <ul className="indicador__lista-tipos indicador__so-celular">
        {ordenadas.map((linha) => (
          <li key={linha.rotulo}>
            <TipoComLink rotulo={linha.rotulo} />
            <span className="mono">{formatarNumero(linha.numerador)}</span>
          </li>
        ))}
      </ul>

      <p className="caixa-formula">
        Fórmula: {semPontoFinal(bloco.formula)} (total:{" "}
        <span className="mono">{formatarNumero(total)}</span>).
      </p>
    </section>
  );
}
