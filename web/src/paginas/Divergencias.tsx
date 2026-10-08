import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  EsquemaRespostaDivergencias,
  type RespostaDivergencias,
} from "processamento/contrato/divergencias.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import { CartoesResumo } from "../componentes/CartoesResumo.tsx";
import { FiltroTipo, VALOR_TODOS } from "../componentes/FiltroTipo.tsx";
import { TabelaDados } from "../componentes/TabelaDados.tsx";
import { Paginacao } from "../componentes/Paginacao.tsx";
import { EtiquetaTipo } from "../componentes/EtiquetaTipo.tsx";
import { rotuloFonte } from "../componentes/EtiquetaFonte.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../componentes/EstadoVazio.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";
import { formatarData, formatarNumero } from "../dados/formatacao.ts";
import type { EventoDivergencia } from "processamento/contrato/divergencias.js";
import "./Divergencias.css";

const TAMANHO_PAGINA = 50;

// Ajuste Modelo B (2026-10-08) — nome em português do tipo de evento que a
// API manda (`tipo` é texto livre no contrato v1). Tipo desconhecido aparece
// como veio, sem quebrar a tela.
const ROTULOS_EVENTO: Record<string, string> = {
  venda: "Venda",
  pagamento: "Pagamento",
  coleta: "Coleta",
  transporte: "Em trânsito",
  entrega: "Entrega",
};

function rotuloEvento(tipo: string): string {
  return ROTULOS_EVENTO[tipo] ?? tipo;
}

/**
 * Eventos de uma divergência dentro de `<details>` (requisito mantido): o
 * `<summary>` tem cara de link ("3 eventos ▸") e a lista aberta mostra data,
 * sistema, tipo e código. Usado na tabela (PC) e no cartão (celular).
 */
function EventosDivergencia({ eventos }: { eventos: EventoDivergencia[] }) {
  const quantidade = eventos.length;
  const texto = quantidade === 1 ? "1 evento ▸" : `${String(quantidade)} eventos ▸`;

  return (
    <details className="divergencias__eventos">
      <summary>{texto}</summary>
      <ul>
        {eventos.map((evento, indice) => (
          <li key={indice}>
            {formatarData(evento.data)} · {rotuloFonte(evento.fonte)} ·{" "}
            {rotuloEvento(evento.tipo)} ·{" "}
            <span className="mono">{evento.codigo}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// TP-0059 — T1 Divergências: consulta real a `/api/v1/divergencias`,
// filtrada por `?tipo=` da URL, com tabela acessível e os 4 estados.
//
// Mensagem/link de "filtro do endereço não é válido" trata DOIS casos com
// a MESMA lógica (nenhuma duplicação de verificação): (1) `tipo` presente
// na URL mas fora dos 5 valores aceitos — detectado client-side, sem
// chamar a API; (2) a API devolver 400 `parametro_invalido` mesmo assim
// (ex. combinação inesperada) — detectado a partir do `codigo` devolvido
// por `useConsulta`/`consultarApi`. Os dois casos convergem para a mesma
// variável `vazioCorrigivel` e o mesmo bloco de renderização abaixo.
//
// Mesmos 5 valores de `TipoDivergencia`
// (processamento/src/dominio/modelo.ts) repetidos aqui só como lista para
// validar o `tipo` da URL — mesmo padrão de `processamento/contrato/*.ts`.
const TIPOS_VALIDOS = [
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
] as const;

type TipoValido = (typeof TIPOS_VALIDOS)[number];

function ehTipoValido(valor: string): valor is TipoValido {
  return (TIPOS_VALIDOS as readonly string[]).includes(valor);
}

// Rótulos dos chips de filtro — mesmos textos de `FiltroTipo.tsx` (que não
// exporta a lista, só o componente), repetidos aqui apenas para compor o
// `<caption>`/mensagem de "vazio" com o nome do filtro ativo.
const ROTULOS_FILTRO: Record<string, string> = {
  [VALOR_TODOS]: "Todos",
  duplicado: "Pago duas vezes",
  parcial: "Pagamento parcial",
  pago_nao_enviado: "Pago e não enviado",
  enviado_nao_pago: "Enviado e não pago",
  entrega_atrasada: "Entrega atrasada",
};

/**
 * Monta a URL de consulta. O sufixo `#tentativa` é um fragmento (`#...`),
 * nunca enviado ao servidor em uma requisição HTTP real (só a parte
 * path+query é transmitida) — serve apenas para dar ao `useConsulta` uma
 * string de URL diferente a cada tentativa de "Tentar de novo", forçando o
 * `useEffect` interno dele (que depende de `url`) a disparar de novo a
 * mesma chamada. Sem isso, clicar em "Tentar de novo" com o mesmo filtro
 * não mudaria `url` e a consulta não seria refeita — `useConsulta` (TP-0052)
 * não expõe um `refetch` próprio.
 */
function construirUrlConsulta(
  tipo: TipoValido | null,
  pagina: number,
  tentativa: number,
): string {
  const parametros = new URLSearchParams();
  if (tipo !== null) {
    parametros.set("tipo", tipo);
  }
  parametros.set("pagina", String(pagina));
  parametros.set("tamanho", String(TAMANHO_PAGINA));
  return `/api/v1/divergencias?${parametros.toString()}#${String(tentativa)}`;
}

/**
 * Valida o `?pagina=` da URL: deve ser um inteiro >= 1, sem sinal nem zero à
 * esquerda (regex evita `Number("abc") -> NaN` passar por acidente e evita
 * `Number("1e2")` ser aceito como inteiro válido). Ausente é válido (default
 * página 1) — só o valor presente e fora do formato é tratado como inválido.
 */
const PADRAO_PAGINA_VALIDA = /^[1-9]\d*$/;

export function Divergencias() {
  const refTitulo = useFocoNoTitulo();
  const refCaption = useRef<HTMLTableCaptionElement>(null);
  const focoPendente = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [tentativa, setTentativa] = useState(0);

  // Última resposta bem-sucedida, mantida em estado próprio (TP-0060): ao
  // trocar de página, a tabela/paginação da página anterior continua
  // visível (com os botões em `aria-disabled`) enquanto a nova chamada está
  // em andamento, em vez de esconder tudo atrás de `EstadoCarregando` — só o
  // CARREGAMENTO INICIAL (sem nenhuma resposta ainda) usa o spinner cheio.
  const [ultimaResposta, setUltimaResposta] =
    useState<RespostaDivergencias | null>(null);

  const tipoNaUrl = searchParams.get("tipo");
  const tipoInvalidoNaUrl = tipoNaUrl !== null && !ehTipoValido(tipoNaUrl);
  const tipoValido: TipoValido | null = tipoInvalidoNaUrl
    ? null
    : (tipoNaUrl);

  const paginaNaUrlTexto = searchParams.get("pagina");
  const paginaInvalidaNaUrl =
    paginaNaUrlTexto !== null && !PADRAO_PAGINA_VALIDA.test(paginaNaUrlTexto);
  const pagina = paginaInvalidaNaUrl
    ? 1
    : paginaNaUrlTexto === null
      ? 1
      : Number(paginaNaUrlTexto);

  // Enquanto `tipoInvalidoNaUrl`/`paginaInvalidaNaUrl` for `true`, a URL
  // passada é `null` — `useConsulta` nunca dispara a chamada (ver comentário
  // do próprio gancho); o estado que ele devolveria (`carregando`
  // indefinido) é simplesmente ignorado abaixo, porque o ramo de
  // renderização do "filtro do endereço inválido" nem chega a consultá-lo.
  const urlConsulta =
    tipoInvalidoNaUrl || paginaInvalidaNaUrl
      ? null
      : construirUrlConsulta(tipoValido, pagina, tentativa);

  const estadoConsulta = useConsulta(urlConsulta, EsquemaRespostaDivergencias);

  const erro400DaApi =
    estadoConsulta.status === "erro" &&
    estadoConsulta.codigo === "parametro_invalido";

  // Mesma mensagem/link de "filtro do endereço não é válido" (TP-0059)
  // cobre agora TRÊS casos convergindo para a mesma variável: `tipo`
  // inválido, `pagina` inválida (nenhum dos dois chega a chamar a API) e o
  // 400 real da API.
  const vazioCorrigivel = tipoInvalidoNaUrl || paginaInvalidaNaUrl || erro400DaApi;

  useEffect(() => {
    if (estadoConsulta.status === "sucesso") {
      setUltimaResposta(estadoConsulta.dados);
    }
  }, [estadoConsulta]);

  // Foco no `<caption>` ao trocar de PÁGINA (RTP-0015, UX-SPEC T1): só depois
  // que o usuário pede outra página (`focoPendente`) e a nova resposta já
  // está na tela — nunca no carregamento inicial nem na troca de filtro.
  useEffect(() => {
    if (focoPendente.current && ultimaResposta !== null) {
      focoPendente.current = false;
      refCaption.current?.focus();
    }
  }, [ultimaResposta]);

  // Erro na consulta cancela o pedido de foco: a próxima resposta de sucesso
  // (retry ou outro filtro) não deve mover o foco ao `<caption>` (RTP-0044).
  useEffect(() => {
    if (estadoConsulta.status === "erro") {
      focoPendente.current = false;
    }
  }, [estadoConsulta]);

  function aoMudarFiltro(tipo: string) {
    focoPendente.current = false;
    const novosParametros = new URLSearchParams(searchParams);
    if (tipo === VALOR_TODOS) {
      novosParametros.delete("tipo");
    } else {
      novosParametros.set("tipo", tipo);
    }
    // Troca de filtro sempre volta à página 1 — removido (não
    // `set("pagina", "1")`) para manter a URL limpa quando já é o default,
    // numa ÚNICA chamada de `setSearchParams` (uma navegação só).
    novosParametros.delete("pagina");
    setSearchParams(novosParametros);
  }

  function aoMudarPagina(novaPagina: number) {
    focoPendente.current = true;
    const novosParametros = new URLSearchParams(searchParams);
    if (novaPagina <= 1) {
      novosParametros.delete("pagina");
    } else {
      novosParametros.set("pagina", String(novaPagina));
    }
    setSearchParams(novosParametros);
  }

  function aoTentarDeNovo() {
    setTentativa((atual) => atual + 1);
  }

  const rotuloFiltroAtual = ROTULOS_FILTRO[tipoValido ?? VALOR_TODOS] ?? "Todos";

  // Ajuste Modelo B (2026-10-08): o total fica dentro do h1, numa <span>
  // própria — oculta visualmente no PC (só leitor de tela) e visível no
  // celular como o número à direita do título (Divergencias.css). Conta
  // divergências, não pedidos (1 pedido pode ter 2 divergências).
  const totalDivergencias =
    !vazioCorrigivel && ultimaResposta ? ultimaResposta.paginacao.total : null;

  // `<title>` reflete a página pedida na URL (não depende da resposta da
  // API ainda ter chegado) — só menciona "página N" quando N > 1.
  const tituloDocumento = pagina > 1 ? `Divergências, página ${String(pagina)}` : "Divergências";
  useTituloDocumento(tituloDocumento);

  // Link de "Ir para a página 1" mantém o `tipo` (quando válido), nunca
  // inclui `pagina` (página 1 é o default, sem parâmetro na URL).
  function construirHrefPaginaUm(): string {
    const parametros = new URLSearchParams();
    if (tipoValido !== null) {
      parametros.set("tipo", tipoValido);
    }
    const consulta = parametros.toString();
    return consulta ? `/?${consulta}` : "/";
  }

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

  // Resumo da paginação ("1–50 de 8.856"): início/fim da página atual. Fica
  // dentro da região `aria-live` (a `<nav>` da paginação está nela), então
  // substitui o antigo `<p>` solto "50 de 8856 divergências…".
  function textoResumoPaginacao(resposta: RespostaDivergencias): string {
    const { pagina: paginaAtual, tamanho, total } = resposta.paginacao;
    const inicio = (paginaAtual - 1) * tamanho + 1;
    const fim = Math.min(paginaAtual * tamanho, total);
    return `${formatarNumero(inicio)}–${formatarNumero(fim)} de ${formatarNumero(total)}`;
  }

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
            onTentarDeNovo={aoTentarDeNovo}
            interrompe={false}
          />
        ) : paginaAlemDaUltima ? (
          <EstadoVazio
            mensagem="Esta página não existe."
            acao={{ texto: "Ir para a página 1", href: construirHrefPaginaUm() }}
          />
        ) : semResultadosParaFiltro ? (
          <EstadoVazio
            mensagem={`Nenhum pedido com divergência do tipo ${rotuloFiltroAtual}.`}
          />
        ) : ultimaResposta ? (
          <div className="divergencias__resultado">
            {/* Anúncio da região aria-live ao trocar de página (RTP-0015). */}
            <p className="visualmente-oculto">
              {`${formatarNumero(ultimaResposta.dados.length)} de ${formatarNumero(
                ultimaResposta.paginacao.total,
              )} divergências, página ${String(ultimaResposta.paginacao.pagina)} de ${String(ultimaResposta.paginacao.totalPaginas)}`}
            </p>
            {/* PC: tabela. Colunas Devido/Pago do mockup ficam de fora: a
                API v1 não entrega esses valores (ADR-016). */}
            <div className="divergencias__tabela">
              <TabelaDados
                caption={`Filtro: ${rotuloFiltroAtual} · página ${String(ultimaResposta.paginacao.pagina)} de ${String(ultimaResposta.paginacao.totalPaginas)}`}
                refCaption={refCaption}
                rotuloRegiao="Tabela de divergências"
                cabecalhos={["Pedido", "Tipo", "Motivo", "Eventos"]}
              >
                {ultimaResposta.dados.map((linha) => (
                  <tr key={`${linha.pedido}-${linha.tipo}`}>
                    <td>
                      <Link
                        to={`/pedido/${encodeURIComponent(linha.pedido)}`}
                        className="mono"
                      >
                        {linha.pedido}
                      </Link>
                    </td>
                    <td>
                      <EtiquetaTipo tipo={linha.tipo} />
                    </td>
                    <td>{linha.motivo}</td>
                    <td>
                      <EventosDivergencia eventos={linha.eventos} />
                    </td>
                  </tr>
                ))}
              </TabelaDados>
            </div>

            {/* Celular: lista de cartões no lugar da tabela. O cartão não é
                um link inteiro — o link fica só no código do pedido (evita
                interativo aninhado com o <details>). */}
            <ul className="divergencias__lista" aria-label="Lista de divergências">
              {ultimaResposta.dados.map((linha) => (
                <li
                  key={`${linha.pedido}-${linha.tipo}`}
                  className="divergencias__cartao"
                >
                  <div className="divergencias__cartao-topo">
                    <Link
                      to={`/pedido/${encodeURIComponent(linha.pedido)}`}
                      className="mono divergencias__cartao-pedido"
                    >
                      {linha.pedido}
                    </Link>
                    <EtiquetaTipo tipo={linha.tipo} />
                  </div>
                  <p className="divergencias__cartao-motivo">{linha.motivo}</p>
                  <div className="divergencias__cartao-eventos">
                    <EventosDivergencia eventos={linha.eventos} />
                  </div>
                </li>
              ))}
            </ul>

            <Paginacao
              pagina={ultimaResposta.paginacao.pagina}
              totalPaginas={ultimaResposta.paginacao.totalPaginas}
              carregando={estadoConsulta.status === "carregando"}
              aoMudarPagina={aoMudarPagina}
              resumo={textoResumoPaginacao(ultimaResposta)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
