import { useId, useState } from "react";
import { Link } from "react-router";
import type {
  BlocoIndicador,
  LinhaIndicador,
} from "processamento/contrato/indicadores.js";
import { TabelaDados } from "./TabelaDados.tsx";
import { EtiquetaTipo, type TipoDivergencia } from "./EtiquetaTipo.tsx";
import {
  formatarDias,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarPercentual,
} from "../dados/formatacao.ts";

// TP-0063 / ajuste Modelo B (2026-10-08, mockup à risca) — um componente
// por bloco de indicador da T3 (entregas no prazo, divergências por tipo,
// tempo médio, pago × devido) e um genérico (`Indicador`) para qualquer
// bloco novo que a API passe a mandar. Estilos em `paginas/Indicadores.css`.
//
// A fórmula exibida é sempre `bloco.formula`, como a API manda (só ganha
// o ponto final). Todo número calculado aqui é numerador ÷ denominador da
// própria linha — nunca o `resultado` arredondado da API (o "Tempo médio"
// saía como "840,0%" porque o componente genérico tratava a média em dias
// como fração).

const TEXTO_SEM_DADOS_DEFAULT = "sem dados suficientes";
const TEXTO_SEM_ENTREGAS = "sem entregas com data conhecida";

/** Tira o ponto final, para a frase ganhar o seu próprio sem duplicar. */
function semPontoFinal(texto: string): string {
  return texto.trim().replace(/\.$/, "");
}

/** Largura da barra de proporção, em %, entre 0 e 100. */
function larguraBarra(numerador: number, denominador: number): number {
  if (denominador === 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (numerador / denominador) * 100));
}

function BarraProporcao({
  numerador,
  denominador,
}: {
  numerador: number;
  denominador: number;
}) {
  return (
    <div className="indicador__barra" aria-hidden="true">
      <span style={{ width: `${larguraBarra(numerador, denominador)}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entregas no prazo
// ---------------------------------------------------------------------------

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
              onChange={(evento) => setMesEscolhido(evento.target.value)}
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

// ---------------------------------------------------------------------------
// Divergências por tipo
// ---------------------------------------------------------------------------

const TIPOS_CONHECIDOS: readonly string[] = [
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
];

/**
 * `linha.rotulo` já chega como o literal do tipo (ex. `"duplicado"`): o
 * domínio preenche `rotulos: [tipo]`, e o `join(" / ")` de 1 elemento
 * devolve o próprio elemento.
 */
function EtiquetaOuTexto({ rotulo }: { rotulo: string }) {
  return TIPOS_CONHECIDOS.includes(rotulo) ? (
    <EtiquetaTipo tipo={rotulo as TipoDivergencia} />
  ) : (
    <>{rotulo}</>
  );
}

function linkDoTipo(rotulo: string): string {
  return `/?tipo=${encodeURIComponent(rotulo)}`;
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
                <Link to={linkDoTipo(linha.rotulo)}>
                  <EtiquetaOuTexto rotulo={linha.rotulo} />
                </Link>
              </td>
              <td className="num">{formatarNumero(linha.numerador)}</td>
            </tr>
          ))}
        </TabelaDados>
      </div>

      <ul className="indicador__lista-tipos indicador__so-celular">
        {ordenadas.map((linha) => (
          <li key={linha.rotulo}>
            <Link to={linkDoTipo(linha.rotulo)}>
              <EtiquetaOuTexto rotulo={linha.rotulo} />
            </Link>
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

// ---------------------------------------------------------------------------
// Tempo médio
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Pago × devido
// ---------------------------------------------------------------------------

const ROTULOS_SITUACAO: Record<string, string> = {
  sem_pagamento: "Sem pagamento",
  parcial: "Parcial",
  quitado: "Quitado",
  excedente: "Pago a mais",
};

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
                <td>{ROTULOS_SITUACAO[linha.rotulo] ?? linha.rotulo}</td>
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

// ---------------------------------------------------------------------------
// Genérico (bloco que a tela ainda não conhece)
// ---------------------------------------------------------------------------

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
};

/**
 * TP-0063 — Desenha um bloco que a T3 ainda não conhece (indicador novo na
 * API): título, fórmula e numerador/denominador/% por linha (% = numerador
 * ÷ denominador). Os 4 blocos atuais têm componente próprio acima.
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
          <tr key={`${bloco.chave}-${indice}`}>
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
