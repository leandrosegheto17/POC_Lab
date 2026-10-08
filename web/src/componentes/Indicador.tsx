import { Link } from "react-router";
import type { BlocoIndicador } from "processamento/contrato/indicadores.js";
import { TabelaDados } from "./TabelaDados.tsx";

const FORMATADOR_NUMERO = new Intl.NumberFormat("pt-BR");

function formatarPercentual(resultado: number): string {
  return `${(resultado * 100).toFixed(1)}%`;
}

type IndicadorProps = {
  /** Bloco do contrato (`EsquemaBlocoIndicador`, `processamento/contrato/indicadores.ts`). */
  bloco: BlocoIndicador;
  /**
   * Texto mostrado na coluna "%" quando `linha.resultado` é `null` (caso de
   * `denominador: 0`). Default genérico — telas que sabem o motivo exato
   * (ex. "sem entregas com data conhecida") devem passar um texto mais
   * específico.
   */
  textoSemDados?: string;
  /**
   * Quando fornecida, o `rotulo` de cada linha da tabela principal se torna
   * um link (ex. `/?tipo=duplicado` no bloco de divergências por tipo).
   */
  linkPorLinha?: (rotulo: string) => string;
};

const TEXTO_SEM_DADOS_DEFAULT = "sem dados suficientes";

/**
 * TP-0063 — Desenha qualquer bloco do contrato de indicadores: título,
 * fórmula, numerador/denominador/resultado por linha.
 *
 * `bloco.aParte` (booleano no contrato) marca que a ÚLTIMA linha de
 * `bloco.linhas` é, na verdade, um valor "à parte" da quebra principal
 * (ver `mapearBlocoParaEsquemaBloco`, `processamento/src/publicacao/documentos.ts`,
 * que sempre empilha essa linha extra por último quando `aParte` existe no
 * domínio). Por isso essa última linha NUNCA entra na tabela de % junto das
 * demais — é renderizada à parte, como um parágrafo próprio com o valor
 * bruto (não uma fração/percentual, já que `aParte.valor` no domínio é uma
 * contagem, não um numerador/denominador comparável).
 */
export function Indicador({
  bloco,
  textoSemDados = TEXTO_SEM_DADOS_DEFAULT,
  linkPorLinha,
}: IndicadorProps) {
  const linhasTabela = bloco.aParte ? bloco.linhas.slice(0, -1) : bloco.linhas;
  const linhaAParte = bloco.aParte ? bloco.linhas[bloco.linhas.length - 1] : null;

  return (
    <section aria-labelledby={`indicador-${bloco.chave}-titulo`}>
      <h2 id={`indicador-${bloco.chave}-titulo`}>{bloco.titulo}</h2>
      <p>{bloco.formula}</p>

      <TabelaDados
        caption={`Detalhamento — ${bloco.titulo}`}
        cabecalhos={["Rótulo", "Numerador", "Denominador", "%"]}
        rotuloRegiao={`Tabela com rolagem horizontal — ${bloco.titulo}`}
      >
        {linhasTabela.map((linha, indice) => (
          <tr key={`${bloco.chave}-${indice}`}>
            <td>
              {linkPorLinha ? (
                <Link to={linkPorLinha(linha.rotulo)}>{linha.rotulo}</Link>
              ) : (
                linha.rotulo
              )}
            </td>
            <td>{FORMATADOR_NUMERO.format(linha.numerador)}</td>
            <td>{FORMATADOR_NUMERO.format(linha.denominador)}</td>
            <td>
              {linha.resultado === null
                ? textoSemDados
                : formatarPercentual(linha.resultado)}
            </td>
          </tr>
        ))}
      </TabelaDados>

      {linhaAParte ? (
        <p>
          {linhaAParte.rotulo}: {FORMATADOR_NUMERO.format(linhaAParte.numerador)}
        </p>
      ) : null}
    </section>
  );
}
