import { useState } from "react";
import { EsquemaRespostaIndicadores } from "processamento/contrato/indicadores.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import { Indicador } from "../componentes/Indicador.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";

// TP-0063 — T3 Indicadores: consulta real a `/api/v1/indicadores` (lista de
// blocos do contrato, `EsquemaRespostaIndicadores`), um `Indicador` por
// bloco, na ordem recebida. Não há estado "vazio" de tela — a API sempre
// devolve os blocos Must (entregas no prazo, divergências por tipo), mesmo
// que algumas linhas venham zeradas.
//
// Chaves estáveis dos blocos (`dominio/indicadores.ts`): identificam cada
// bloco por `chave`, não por posição — mais resiliente a uma eventual
// reordenação da lista pela API.
const CHAVE_ENTREGAS_NO_PRAZO = "entregas_no_prazo";
const CHAVE_DIVERGENCIAS_POR_TIPO = "divergencias_por_tipo";

/**
 * Monta a URL de consulta. O sufixo `#tentativa` é um fragmento, nunca
 * enviado ao servidor — mesmo truque de `Divergencias.tsx` (TP-0059) para
 * forçar `useConsulta` a refazer a mesma chamada a cada "Tentar de novo".
 */
function construirUrlConsulta(tentativa: number): string {
  return `/api/v1/indicadores#${tentativa}`;
}

/**
 * Link de cada linha do bloco "divergências por tipo" para `/?tipo=...`.
 *
 * `linha.rotulo` já chega do contrato como o próprio literal de
 * `TipoDivergencia` (ex. `"duplicado"`), não um rótulo em português: o
 * achatamento `rotulos: string[] -> rotulo: string` (ver
 * `mapearLinhaParaEsquemaLinha`, `processamento/src/publicacao/documentos.ts`)
 * junta com `" / "`, mas `indicadorDivergenciasPorTipo` preenche
 * `rotulos: [tipo]` — array de 1 elemento só, cujo `join` devolve o próprio
 * elemento sem separador. Por isso nenhum mapa de tradução rótulo→literal é
 * necessário aqui.
 */
function linkDivergenciaPorTipo(rotulo: string): string {
  return `/?tipo=${encodeURIComponent(rotulo)}`;
}

export function Indicadores() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
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
    <>
      <h1 ref={refTitulo} tabIndex={-1}>
        Indicadores
      </h1>

      <div aria-live="polite">
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
          estadoConsulta.dados.map((bloco) => (
            <Indicador
              key={bloco.chave}
              bloco={bloco}
              textoSemDados={
                bloco.chave === CHAVE_ENTREGAS_NO_PRAZO
                  ? "sem entregas com data conhecida"
                  : undefined
              }
              linkPorLinha={
                bloco.chave === CHAVE_DIVERGENCIAS_POR_TIPO
                  ? linkDivergenciaPorTipo
                  : undefined
              }
            />
          ))
        )}
      </div>
    </>
  );
}
