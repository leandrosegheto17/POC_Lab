import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  EsquemaRespostaQualidade,
  type Achado,
  type RespostaQualidade,
} from "processamento/contrato/qualidade.js";
import type { TipoAchado } from "processamento/dominio/modelo.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import {
  EsquemaSugestaoIA,
  type SugestaoIA,
} from "../dados/esquema-sugestao-ia.ts";
import {
  BlocoAchado,
  BlocoAchadoCelular,
  idAchado,
} from "../componentes/BlocoAchado.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";
import { EtiquetaEstado } from "../componentes/EtiquetaEstado.tsx";
import { TabelaDados } from "../componentes/TabelaDados.tsx";
import { formatarNumero } from "../dados/formatacao.ts";
import "./Qualidade.css";

// TP-0064 — T4 Qualidade dos dados: GET /api/v1/qualidade, 7 achados numa
// ORDEM FIXA (definida pelo wireframe) mais a seção de sugestões da IA. A
// API devolve os 7 achados em QUALQUER ordem (`EsquemaRespostaQualidade` só
// garante `length(7)`, um por `tipo`) — por isso a ordem de exibição abaixo
// NUNCA confia na posição do array recebido: cada entrada busca o achado
// correspondente por `tipo` via `.find`.
//
// Ajuste Modelo B (2026-10-08, mockup à risca): a página tem duas formas,
// alternadas só por CSS (`Qualidade.css`, breakpoint 1024px):
// - PC (`.qualidade__pc`): mini-cartões-âncora (`<nav>` "Tipos de achado",
//   7 — o mockup tem 6, "Linhas rejeitadas" é requisito mantido) e um cartão
//   por achado com tabela de exemplos;
// - celular (`.qualidade__celular`): um `<details>` por achado, o primeiro
//   aberto. A forma oculta sai com `display:none` (fora da árvore de
//   acessibilidade), então não há leitura em dobro.
const TIPOS_EM_ORDEM: ReadonlyArray<{ tipo: TipoAchado; titulo: string }> = [
  { tipo: "formato_data", titulo: "Datas em dois formatos" },
  { tipo: "pedido_sem_envio", titulo: "Pedidos sem envio" },
  { tipo: "valor_fora_do_padrao", titulo: "Valores fora do padrão" },
  { tipo: "linha_invalida", titulo: "Linhas rejeitadas" },
  { tipo: "registro_repetido", titulo: "Registros repetidos" },
  { tipo: "sem_identificacao", titulo: "Pagamentos sem identificação" },
  { tipo: "fora_de_ordem", titulo: "Eventos fora de ordem" },
];

/**
 * Monta a URL de consulta. O sufixo `#tentativa` é um fragmento, nunca
 * enviado ao servidor — só força `useConsulta` a refazer a mesma chamada a
 * cada clique em "Tentar de novo" (mesmo padrão de `construirUrlConsulta`
 * em `Divergencias.tsx`, TP-0059).
 */
function construirUrlConsulta(tentativa: number): string {
  return `/api/v1/qualidade#${String(tentativa)}`;
}

/** Mensagem fixa exibida quando a IA não foi utilizada OU foi utilizada mas não sobrou nenhuma sugestão válida (dentro da caixa de regra, sem tabela). */
const MENSAGEM_SEM_SUGESTOES_IA = (
  <p className="caixa-formula">
    IA não utilizada nesta publicação: pagamentos ficaram &quot;sem
    sugestão&quot;.
  </p>
);

/**
 * TP-0085 — valida cada item de `dados.ia.sugestoes` (`unknown[]` no
 * contrato v1) contra `EsquemaSugestaoIA`; itens que falharem são
 * descartados silenciosamente (nunca quebram a renderização dos demais).
 */
function filtrarSugestoesValidas(sugestoes: unknown[]): SugestaoIA[] {
  const validas: SugestaoIA[] = [];
  for (const item of sugestoes) {
    const resultado = EsquemaSugestaoIA.safeParse(item);
    if (resultado.success) {
      validas.push(resultado.data);
    }
  }
  return validas;
}

/**
 * TP-0085 (ajuste Modelo B, 2026-10-08) — "Conferida?" como etiqueta com
 * texto: "Aceita" (ok, verde) quando a regra conferiu a sugestão,
 * "Rejeitada" (ruim, vermelho) quando não conferiu.
 */
function EtiquetaConferida({ conferida }: { conferida: boolean }) {
  return conferida ? (
    <EtiquetaEstado variante="ok">Aceita</EtiquetaEstado>
  ) : (
    <EtiquetaEstado variante="ruim">Rejeitada</EtiquetaEstado>
  );
}

/** Tipo de achado apontado pelo fragmento da URL (`#achado-<tipo>`), se houver. */
function tipoDoHash(hash: string): TipoAchado | null {
  const encontrado = TIPOS_EM_ORDEM.find(
    ({ tipo }) => `#${idAchado(tipo)}` === hash,
  );
  return encontrado ? encontrado.tipo : null;
}

export function Qualidade() {
  const refTitulo = useFocoNoTitulo();
  useTituloDocumento("Qualidade dos dados");

  const [tentativa, setTentativa] = useState(0);
  const estadoConsulta = useConsulta(
    construirUrlConsulta(tentativa),
    EsquemaRespostaQualidade,
  );

  function aoTentarDeNovo() {
    setTentativa((atual) => atual + 1);
  }

  return (
    <div className="qualidade">
      <div className="qualidade__topo">
        <p className="rotulo-pagina">Problemas do dado, não do pedido</p>
        <h1 ref={refTitulo} tabIndex={-1}>
          Qualidade dos dados
        </h1>
        {/* Só no celular (o rótulo acima do h1 some < 1024px). */}
        <p className="qualidade__subtitulo">Problemas do dado, não do pedido.</p>
      </div>

      <div aria-live="polite" className="qualidade__corpo">
        {estadoConsulta.status === "carregando" ? (
          <EstadoCarregando
            mensagem="Carregando relatório…"
            semAriaLiveProprio
          />
        ) : estadoConsulta.status === "erro" ? (
          <EstadoErro
            mensagem={estadoConsulta.mensagem}
            onTentarDeNovo={aoTentarDeNovo}
            interrompe={false}
          />
        ) : (
          <RelatorioQualidade dados={estadoConsulta.dados} />
        )}
      </div>
    </div>
  );
}

function RelatorioQualidade({ dados }: { dados: RespostaQualidade }) {
  const { hash } = useLocation();
  // Mini-cartão selecionado: o último clicado; antes de qualquer clique, o
  // do fragmento da URL; sem fragmento, o primeiro.
  const [tipoClicado, setTipoClicado] = useState<TipoAchado | null>(null);
  const tipoAtual = tipoClicado ?? tipoDoHash(hash) ?? TIPOS_EM_ORDEM[0]?.tipo;

  // Defensivo: `EsquemaRespostaQualidade` garante 7 achados, um por tipo,
  // mas se algum vier faltando ele simplesmente não é renderizado em vez de
  // quebrar a tela inteira.
  const achadosEmOrdem = TIPOS_EM_ORDEM.flatMap(({ tipo, titulo }) => {
    const achado: Achado | undefined = dados.achados.find(
      (item) => item.tipo === tipo,
    );
    return achado ? [{ tipo, titulo, achado }] : [];
  });

  // `null` = mostrar a mensagem fixa (IA não utilizada OU sem sugestão válida).
  const sugestoes =
    !dados.ia.utilizada
      ? null
      : filtrarSugestoesValidas(dados.ia.sugestoes);
  const temSugestoes = sugestoes !== null && sugestoes.length > 0;

  return (
    <>
      <div className="qualidade__pc">
        <nav aria-label="Tipos de achado" className="qualidade__tipos">
          {achadosEmOrdem.map(({ tipo, titulo, achado }) => {
            const atual = tipo === tipoAtual;
            return (
              <a
                key={tipo}
                href={`#${idAchado(tipo)}`}
                className={
                  atual
                    ? "qualidade__tipo qualidade__tipo--atual"
                    : "qualidade__tipo"
                }
                aria-current={atual ? "true" : undefined}
                onClick={() => { setTipoClicado(tipo); }}
              >
                <span className="qualidade__tipo-nome">{titulo}</span>
                <span className="qualidade__tipo-contagem">
                  {formatarNumero(achado.contagem)}
                </span>
              </a>
            );
          })}
        </nav>

        {achadosEmOrdem.map(({ tipo, titulo, achado }) => (
          <BlocoAchado key={tipo} titulo={titulo} achado={achado} />
        ))}

        <section className="cartao qualidade-ia">
          <div className="qualidade-ia__topo">
            <h2>Sugestões da IA</h2>
            <span className="qualidade-ia__aparte">
              À parte: não entram nos indicadores
            </span>
          </div>
          {temSugestoes ? (
            <>
              <p className="caixa-formula">
                A IA sugere o pedido de um pagamento com referência vaga. Uma
                regra confere valor e data; se não bater, a sugestão é
                rejeitada.
              </p>
              <TabelaDados
                caption="Sugestões da IA para pagamentos sem identificação"
                cabecalhos={[
                  "Pagamento",
                  "Texto da referência",
                  "Pedido sugerido",
                  "Conferida?",
                  "Motivo da regra",
                ]}
                rotuloRegiao="Sugestões da IA"
                legendaOculta
                semMoldura
                compacta
              >
                {sugestoes.map((sugestao) => (
                  <tr key={sugestao.pagamento}>
                    <td className="mono">{sugestao.pagamento}</td>
                    <td>&quot;{sugestao.textoReferencia}&quot;</td>
                    <td>
                      <LinkPedidoSugerido codigo={sugestao.pedidoSugerido} />
                    </td>
                    <td>
                      <EtiquetaConferida conferida={sugestao.conferida} />
                    </td>
                    <td>{sugestao.motivo}</td>
                  </tr>
                ))}
              </TabelaDados>
            </>
          ) : (
            MENSAGEM_SEM_SUGESTOES_IA
          )}
        </section>
      </div>

      <div className="qualidade__celular">
        {achadosEmOrdem.map(({ tipo, titulo, achado }, indice) => (
          <BlocoAchadoCelular
            key={tipo}
            titulo={titulo}
            achado={achado}
            aberto={indice === 0}
          />
        ))}

        <details className="achado-celular achado-celular--tracejado">
          <summary className="achado-celular__resumo">
            <h2>Sugestões da IA</h2>
          </summary>
          <div className="achado-celular__corpo">
            {temSugestoes ? (
              <>
                <p className="caixa-formula">
                  Não entram nos indicadores. Uma regra confere valor e data de
                  cada sugestão.
                </p>
                <ul className="achado-celular__exemplos">
                  {sugestoes.map((sugestao) => (
                    <li
                      key={sugestao.pagamento}
                      className="achado-celular__exemplo"
                    >
                      <span>
                        <span className="mono">{sugestao.pagamento}</span>
                        {" → "}
                        <LinkPedidoSugerido codigo={sugestao.pedidoSugerido} />
                      </span>
                      <EtiquetaConferida conferida={sugestao.conferida} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              MENSAGEM_SEM_SUGESTOES_IA
            )}
          </div>
        </details>
      </div>
    </>
  );
}

function LinkPedidoSugerido({ codigo }: { codigo: string }): ReactNode {
  return (
    <Link to={`/pedido/${encodeURIComponent(codigo)}`} className="mono">
      {codigo}
    </Link>
  );
}
