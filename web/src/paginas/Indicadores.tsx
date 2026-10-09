import { useState } from "react";
import {
  EsquemaRespostaIndicadores,
  type BlocoIndicador,
} from "processamento/contrato/indicadores.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import { BlocoDivergenciasPorTipo } from "../componentes/indicador/BlocoDivergenciasPorTipo.tsx";
import { BlocoEntregasNoPrazo } from "../componentes/indicador/BlocoEntregasNoPrazo.tsx";
import { BlocoPagoVsDevido } from "../componentes/indicador/BlocoPagoVsDevido.tsx";
import { BlocoTempoMedio } from "../componentes/indicador/BlocoTempoMedio.tsx";
import { Indicador } from "../componentes/indicador/Indicador.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";
import "./Indicadores.css";

// TP-0063 / ajuste Modelo B (2026-10-08, mockup à risca) — T3 Indicadores:
// consulta real a `/api/v1/indicadores` (lista de blocos do contrato,
// `EsquemaRespostaIndicadores`). "Entregas no prazo" ocupa a largura toda;
// abaixo, numa grade, os demais blocos na ordem recebida. Não há estado
// "vazio" de tela — a API sempre devolve os blocos Must.
//
// Chaves estáveis dos blocos (`dominio/indicadores.ts`): identificam cada
// bloco por `chave`, não por posição. Chave desconhecida cai no componente
// genérico `Indicador`.
const CHAVE_ENTREGAS_NO_PRAZO = "entregas_no_prazo";
const CHAVE_DIVERGENCIAS_POR_TIPO = "divergencias_por_tipo";
const CHAVE_TEMPO_MEDIO = "tempoMedioPedidoEnvioEntrega";
const CHAVE_PAGO_VS_DEVIDO = "valorPagoVsDevido";

function renderizarBloco(bloco: BlocoIndicador) {
  switch (bloco.chave) {
    case CHAVE_ENTREGAS_NO_PRAZO:
      return <BlocoEntregasNoPrazo key={bloco.chave} bloco={bloco} />;
    case CHAVE_DIVERGENCIAS_POR_TIPO:
      return <BlocoDivergenciasPorTipo key={bloco.chave} bloco={bloco} />;
    case CHAVE_TEMPO_MEDIO:
      return <BlocoTempoMedio key={bloco.chave} bloco={bloco} />;
    case CHAVE_PAGO_VS_DEVIDO:
      return <BlocoPagoVsDevido key={bloco.chave} bloco={bloco} />;
    default:
      return <Indicador key={bloco.chave} bloco={bloco} />;
  }
}

/**
 * Monta a URL de consulta. O sufixo `#tentativa` é um fragmento, nunca
 * enviado ao servidor — mesmo truque de `Divergencias.tsx` (TP-0059) para
 * forçar `useConsulta` a refazer a mesma chamada a cada "Tentar de novo".
 */
function construirUrlConsulta(tentativa: number): string {
  return `/api/v1/indicadores#${String(tentativa)}`;
}

export function Indicadores() {
  const refTitulo = useFocoNoTitulo();
  useTituloDocumento("Indicadores");

  const [tentativa, setTentativa] = useState(0);
  const estadoConsulta = useConsulta(
    construirUrlConsulta(tentativa),
    EsquemaRespostaIndicadores,
  );

  function aoTentarDeNovo() {
    setTentativa((atual) => atual + 1);
  }

  return (
    <div className="indicadores">
      <div>
        <p className="rotulo-pagina">
          Cada número com fórmula, numerador e denominador
        </p>
        <h1 ref={refTitulo} tabIndex={-1} className="indicadores__titulo">
          Indicadores
        </h1>
      </div>

      <div aria-live="polite" className="indicadores__conteudo">
        {estadoConsulta.status === "carregando" ? (
          <EstadoCarregando
            mensagem="Carregando indicadores…"
            semAriaLiveProprio
          />
        ) : estadoConsulta.status === "erro" ? (
          <EstadoErro
            mensagem={estadoConsulta.mensagem}
            onTentarDeNovo={aoTentarDeNovo}
            interrompe={false}
          />
        ) : (
          <>
            {estadoConsulta.dados
              .filter((bloco) => bloco.chave === CHAVE_ENTREGAS_NO_PRAZO)
              .map(renderizarBloco)}
            <div className="indicadores__grade">
              {estadoConsulta.dados
                .filter((bloco) => bloco.chave !== CHAVE_ENTREGAS_NO_PRAZO)
                .map(renderizarBloco)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
