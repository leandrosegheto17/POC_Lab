import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { EsquemaRespostaDivergencias } from "processamento/contrato/divergencias.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import { CartoesResumo } from "../componentes/CartoesResumo.tsx";
import { FiltroTipo, VALOR_TODOS } from "../componentes/FiltroTipo.tsx";
import { TabelaDados } from "../componentes/TabelaDados.tsx";
import { EtiquetaTipo } from "../componentes/EtiquetaTipo.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../componentes/EstadoVazio.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";

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
function construirUrlConsulta(tipo: TipoValido | null, tentativa: number): string {
  const parametros = new URLSearchParams();
  if (tipo !== null) {
    parametros.set("tipo", tipo);
  }
  parametros.set("pagina", "1");
  parametros.set("tamanho", "50");
  return `/api/v1/divergencias?${parametros.toString()}#${tentativa}`;
}

export function Divergencias() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Divergências");

  const [searchParams, setSearchParams] = useSearchParams();
  const [tentativa, setTentativa] = useState(0);

  const tipoNaUrl = searchParams.get("tipo");
  const tipoInvalidoNaUrl = tipoNaUrl !== null && !ehTipoValido(tipoNaUrl);
  const tipoValido: TipoValido | null = tipoInvalidoNaUrl
    ? null
    : (tipoNaUrl as TipoValido | null);

  // Enquanto `tipoInvalidoNaUrl` for `true`, a URL passada é `null` —
  // `useConsulta` nunca dispara a chamada (ver comentário do próprio
  // gancho); o estado que ele devolveria (`carregando` indefinido) é
  // simplesmente ignorado abaixo, porque o ramo de renderização do filtro
  // inválido nem chega a consultá-lo.
  const urlConsulta = tipoInvalidoNaUrl
    ? null
    : construirUrlConsulta(tipoValido, tentativa);

  const estadoConsulta = useConsulta(urlConsulta, EsquemaRespostaDivergencias);

  const erro400DaApi =
    estadoConsulta.status === "erro" &&
    estadoConsulta.codigo === "parametro_invalido";

  const vazioCorrigivel = tipoInvalidoNaUrl || erro400DaApi;

  function aoMudarFiltro(tipo: string) {
    const novosParametros = new URLSearchParams(searchParams);
    if (tipo === VALOR_TODOS) {
      novosParametros.delete("tipo");
    } else {
      novosParametros.set("tipo", tipo);
    }
    setSearchParams(novosParametros);
  }

  function aoTentarDeNovo() {
    setTentativa((atual) => atual + 1);
  }

  const rotuloFiltroAtual = ROTULOS_FILTRO[tipoValido ?? VALOR_TODOS] ?? "Todos";

  const titulo =
    !vazioCorrigivel && estadoConsulta.status === "sucesso"
      ? `Divergências (${estadoConsulta.dados.paginacao.total} pedidos)`
      : "Divergências";

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
        ) : estadoConsulta.status === "carregando" ? (
          <EstadoCarregando
            mensagem="Carregando divergências…"
            semAriaLiveProprio
          />
        ) : estadoConsulta.status === "erro" ? (
          <EstadoErro
            mensagem={estadoConsulta.mensagem}
            onTentarDeNovo={aoTentarDeNovo}
            interrompe={false}
          />
        ) : estadoConsulta.dados.dados.length === 0 ? (
          <EstadoVazio
            mensagem={`Nenhum pedido com divergência do tipo ${rotuloFiltroAtual}.`}
          />
        ) : (
          <TabelaDados
            caption={`Pedidos com divergência — filtro: ${rotuloFiltroAtual} — página 1 de ${estadoConsulta.dados.paginacao.totalPaginas}`}
            cabecalhos={["Pedido", "Tipo", "Motivo", "Eventos"]}
          >
            {estadoConsulta.dados.dados.map((linha) => (
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
        )}
      </div>
    </>
  );
}
