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
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../componentes/EstadoVazio.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";

const TAMANHO_PAGINA = 50;

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
  return `/api/v1/divergencias?${parametros.toString()}#${tentativa}`;
}

/**
 * Valida o `?pagina=` da URL: deve ser um inteiro >= 1, sem sinal nem zero à
 * esquerda (regex evita `Number("abc") -> NaN` passar por acidente e evita
 * `Number("1e2")` ser aceito como inteiro válido). Ausente é válido (default
 * página 1) — só o valor presente e fora do formato é tratado como inválido.
 */
const PADRAO_PAGINA_VALIDA = /^[1-9]\d*$/;

export function Divergencias() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  const refCaption = useRef<HTMLTableCaptionElement>(null);

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
    : (tipoNaUrl as TipoValido | null);

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

  // Foco no `<caption>` ao trocar de PÁGINA (TP-0055) desativado — POC não
  // precisa de suporte a leitor de tela.

  function aoMudarFiltro(tipo: string) {
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

  const titulo =
    !vazioCorrigivel && ultimaResposta
      ? `Divergências (${ultimaResposta.paginacao.total} pedidos)`
      : "Divergências";

  // `<title>` reflete a página pedida na URL (não depende da resposta da
  // API ainda ter chegado) — só menciona "página N" quando N > 1.
  const tituloDocumento = pagina > 1 ? `Divergências, página ${pagina}` : "Divergências";
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

  const textoResumo = ultimaResposta
    ? `${TAMANHO_PAGINA} de ${ultimaResposta.paginacao.total} divergências, página ${ultimaResposta.paginacao.pagina} de ${ultimaResposta.paginacao.totalPaginas}`
    : null;

  return (
    <>
      <h1 ref={refTitulo} tabIndex={-1}>
        {titulo}
      </h1>

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
          <>
            <TabelaDados
              caption={`Pedidos com divergência — filtro: ${rotuloFiltroAtual} — página ${ultimaResposta.paginacao.pagina} de ${ultimaResposta.paginacao.totalPaginas}`}
              refCaption={refCaption}
              cabecalhos={["Pedido", "Tipo", "Motivo", "Eventos"]}
            >
              {ultimaResposta.dados.map((linha) => (
                <tr key={linha.pedido}>
                  <td>
                    <Link to={`/pedido/${encodeURIComponent(linha.pedido)}`}>
                      {linha.pedido}
                    </Link>
                  </td>
                  <td>
                    <EtiquetaTipo tipo={linha.tipo} />
                  </td>
                  <td>{linha.motivo}</td>
                  <td>
                    <details>
                      <summary>▸ ver {linha.eventos.length} eventos</summary>
                      <ul>
                        {linha.eventos.map((evento, indice) => (
                          <li key={indice}>
                            {evento.tipo} — {evento.data} — {evento.fonte} —{" "}
                            {evento.codigo}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                </tr>
              ))}
            </TabelaDados>
            <Paginacao
              pagina={ultimaResposta.paginacao.pagina}
              totalPaginas={ultimaResposta.paginacao.totalPaginas}
              carregando={estadoConsulta.status === "carregando"}
              aoMudarPagina={aoMudarPagina}
            />
            {textoResumo ? <p>{textoResumo}</p> : null}
          </>
        ) : null}
      </div>
    </>
  );
}
