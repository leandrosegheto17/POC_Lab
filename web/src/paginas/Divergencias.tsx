import { useEffect, useRef, useState } from "react";
import {
  EsquemaRespostaDivergencias,
  type RespostaDivergencias,
} from "nucleo/contrato/divergencias.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import {
  construirUrlConsulta,
  useFiltroDivergencias,
} from "../nav/useFiltroDivergencias.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import { CartoesResumo } from "../componentes/CartoesResumo.tsx";
import { FiltroTipo } from "../componentes/FiltroTipo.tsx";
import { VALOR_TODOS } from "../dados/rotulos.ts";
import { Paginacao } from "../componentes/Paginacao.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../componentes/EstadoVazio.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";
import { TabelaDivergencias } from "../componentes/divergencias/TabelaDivergencias.tsx";
import { ListaDivergencias } from "../componentes/divergencias/ListaDivergencias.tsx";
import { formatarNumero, resumirPaginacao } from "../dados/formatacao.ts";
import { rotuloTipo } from "../dados/rotulos.ts";
import "./Divergencias.css";

// Consulta `/api/v1/divergencias` filtrada por `?tipo=`/`?pagina=` da URL.
// "Filtro do endereço não é válido" cobre três casos com o mesmo bloco de
// renderização (`vazioCorrigivel`): `tipo` inválido e `pagina` inválida (a
// API nem é chamada) e o 400 `parametro_invalido` devolvido pela API.
export function Divergencias() {
  const refTitulo = useFocoNoTitulo();
  const refCaption = useRef<HTMLTableCaptionElement>(null);
  const focoPendente = useRef(false);

  const filtro = useFiltroDivergencias();
  const { tipoNaUrl, tipoValido, tipoInvalidoNaUrl, pagina, paginaInvalidaNaUrl } =
    filtro;
  const [tentativa, setTentativa] = useState(0);

  // Última resposta bem-sucedida: ao trocar de página, a tabela anterior
  // continua visível (botões em `aria-disabled`) enquanto a nova chamada está
  // em andamento; só o carregamento inicial usa o spinner cheio.
  const [ultimaResposta, setUltimaResposta] =
    useState<RespostaDivergencias | null>(null);

  // URL `null` nunca dispara a chamada (ver `useConsulta`).
  const urlConsulta =
    tipoInvalidoNaUrl || paginaInvalidaNaUrl
      ? null
      : construirUrlConsulta(tipoValido, pagina, tentativa);
  const estadoConsulta = useConsulta(urlConsulta, EsquemaRespostaDivergencias);

  const erro400DaApi =
    estadoConsulta.status === "erro" &&
    estadoConsulta.codigo === "parametro_invalido";
  const vazioCorrigivel = tipoInvalidoNaUrl || paginaInvalidaNaUrl || erro400DaApi;

  useEffect(() => {
    if (estadoConsulta.status === "sucesso") {
      setUltimaResposta(estadoConsulta.dados);
    }
  }, [estadoConsulta]);

  // Foco no `<caption>` ao trocar de PÁGINA: só depois que o usuário pede
  // outra página e a nova resposta já está na tela — nunca no carregamento
  // inicial nem na troca de filtro.
  useEffect(() => {
    if (focoPendente.current && ultimaResposta !== null) {
      focoPendente.current = false;
      refCaption.current?.focus();
    }
  }, [ultimaResposta]);

  // Erro na consulta cancela o pedido de foco: a próxima resposta de sucesso
  // (retry ou outro filtro) não deve mover o foco ao `<caption>`.
  useEffect(() => {
    if (estadoConsulta.status === "erro") {
      focoPendente.current = false;
    }
  }, [estadoConsulta]);

  function aoMudarFiltro(tipo: string) {
    focoPendente.current = false;
    filtro.aoMudarFiltro(tipo);
  }

  function aoMudarPagina(novaPagina: number) {
    focoPendente.current = true;
    filtro.aoMudarPagina(novaPagina);
  }

  const rotuloFiltroAtual = tipoValido === null ? "Todos" : rotuloTipo(tipoValido);

  // O total fica dentro do h1, numa <span> própria: oculta visualmente no PC
  // (só leitor de tela) e visível no celular como o número à direita do
  // título. Conta divergências, não pedidos.
  const totalDivergencias =
    !vazioCorrigivel && ultimaResposta ? ultimaResposta.paginacao.total : null;

  // `<title>` reflete a página pedida na URL, não a resposta da API.
  useTituloDocumento(pagina > 1 ? `Divergências, página ${String(pagina)}` : "Divergências");

  const carregandoInicial =
    ultimaResposta === null && estadoConsulta.status === "carregando";
  const paginaAlemDaUltima =
    ultimaResposta !== null &&
    ultimaResposta.dados.length === 0 &&
    ultimaResposta.paginacao.total > 0;
  const semResultadosParaFiltro =
    ultimaResposta !== null &&
    ultimaResposta.dados.length === 0 &&
    ultimaResposta.paginacao.total === 0;

  return (
    <>
      <div className="divergencias__topo">
        <p className="rotulo-pagina">Fila de conciliação</p>
        <h1 ref={refTitulo} tabIndex={-1} className="divergencias__titulo">
          Divergências
          {totalDivergencias !== null ? (
            <>
              <span className="divergencias__total">
                {` (${formatarNumero(totalDivergencias)} ${
                  totalDivergencias === 1 ? "divergência" : "divergências"
                })`}
              </span>
              <span className="divergencias__total-numero" aria-hidden="true">
                {formatarNumero(totalDivergencias)}
              </span>
            </>
          ) : null}
        </h1>
      </div>

      <CartoesResumo />
      <FiltroTipo valor={tipoNaUrl ?? VALOR_TODOS} aoMudar={aoMudarFiltro} />

      <div aria-live="polite">
        {vazioCorrigivel ? (
          <EstadoVazio
            mensagem="O filtro do endereço não é válido."
            acao={{ texto: "Ver todas as divergências", href: "/" }}
          />
        ) : carregandoInicial ? (
          <EstadoCarregando
            mensagem="Carregando divergências…"
            semAriaLiveProprio
          />
        ) : ultimaResposta === null && estadoConsulta.status === "erro" ? (
          <EstadoErro
            mensagem={estadoConsulta.mensagem}
            onTentarDeNovo={() => {
              setTentativa((atual) => atual + 1);
            }}
            interrompe={false}
          />
        ) : paginaAlemDaUltima ? (
          <EstadoVazio
            mensagem="Esta página não existe."
            acao={{
              texto: "Ir para a página 1",
              href: filtro.construirHrefPaginaUm(),
            }}
          />
        ) : semResultadosParaFiltro ? (
          <EstadoVazio
            mensagem={`Nenhum pedido com divergência do tipo ${rotuloFiltroAtual}.`}
          />
        ) : ultimaResposta ? (
          <div className="divergencias__resultado">
            {/* Anúncio da região aria-live ao trocar de página. */}
            <p className="visualmente-oculto">
              {`${formatarNumero(ultimaResposta.dados.length)} de ${formatarNumero(
                ultimaResposta.paginacao.total,
              )} divergências, página ${String(ultimaResposta.paginacao.pagina)} de ${String(ultimaResposta.paginacao.totalPaginas)}`}
            </p>
            <TabelaDivergencias
              resposta={ultimaResposta}
              rotuloFiltro={rotuloFiltroAtual}
              refCaption={refCaption}
            />
            <ListaDivergencias resposta={ultimaResposta} />
            <Paginacao
              pagina={ultimaResposta.paginacao.pagina}
              totalPaginas={ultimaResposta.paginacao.totalPaginas}
              carregando={estadoConsulta.status === "carregando"}
              aoMudarPagina={aoMudarPagina}
              resumo={resumirPaginacao(ultimaResposta.paginacao)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
