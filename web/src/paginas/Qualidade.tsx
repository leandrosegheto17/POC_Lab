import { useState } from "react";
import { Link } from "react-router";
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
import { BlocoAchado } from "../componentes/BlocoAchado.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";
import { TabelaDados } from "../componentes/TabelaDados.tsx";
// Reaproveita os tokens visuais de etiqueta de EtiquetaTipo.tsx (TP-0054)
// para a coluna "Conferida?" abaixo (ver EtiquetaConferida) — sem CSS novo.
import "../componentes/Etiquetas.css";

// TP-0064 — T4 Qualidade dos dados: GET /api/v1/qualidade, 7 `BlocoAchado`
// numa ORDEM FIXA (definida pelo wireframe) mais a seção de sugestões da
// IA. A API devolve os 7 achados em QUALQUER ordem (`EsquemaRespostaQualidade`
// só garante `length(7)`, um por `tipo`) — por isso a ordem de exibição
// abaixo NUNCA confia na posição do array recebido: cada entrada busca o
// achado correspondente por `tipo` via `.find`.
const TIPOS_EM_ORDEM: ReadonlyArray<{ tipo: TipoAchado; titulo: string }> = [
  { tipo: "formato_data", titulo: "Datas por formato" },
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
  return `/api/v1/qualidade#${tentativa}`;
}

/** Mensagem fixa exibida quando a IA não foi utilizada OU foi utilizada mas não sobrou nenhuma sugestão válida. */
const MENSAGEM_SEM_SUGESTOES_IA = (
  <p>
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
 * TP-0085 — "Conferida?" como etiqueta com texto. Reaproveita as classes de
 * `EtiquetaTipo` (TP-0054, `Etiquetas.css`) em vez de um componente novo:
 * "quitado" (verde, variante positiva) para `true`, "pendente" (neutro)
 * para `false` — nenhuma CSS nova foi criada para esta tarefa.
 */
function EtiquetaConferida({ conferida }: { conferida: boolean }) {
  const variante = conferida ? "quitado" : "pendente";
  const rotulo = conferida ? "Conferida" : "Não conferida";
  return (
    <span className={`etiqueta etiqueta--${variante}`} data-variante={variante}>
      {rotulo}
    </span>
  );
}

export function Qualidade() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
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
    <>
      <h1 ref={refTitulo} tabIndex={-1}>
        Qualidade dos dados
      </h1>

      <div aria-live="polite">
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
    </>
  );
}

function RelatorioQualidade({ dados }: { dados: RespostaQualidade }) {
  function achadoDoTipo(tipo: TipoAchado): Achado | undefined {
    return dados.achados.find((item) => item.tipo === tipo);
  }

  return (
    <>
      {TIPOS_EM_ORDEM.map(({ tipo, titulo }) => {
        const achado = achadoDoTipo(tipo);
        // Defensivo: `EsquemaRespostaQualidade` garante 7 achados, um por
        // tipo, mas se algum vier faltando a seção simplesmente não é
        // renderizada em vez de quebrar a tela inteira.
        return achado ? (
          <BlocoAchado key={tipo} titulo={titulo} achado={achado} />
        ) : null;
      })}

      <section>
        <h2>Sugestões da IA</h2>
        {dados.ia.utilizada === false ? (
          MENSAGEM_SEM_SUGESTOES_IA
        ) : (
          (() => {
            const sugestoesValidas = filtrarSugestoesValidas(
              dados.ia.sugestoes,
            );
            return sugestoesValidas.length === 0 ? (
              MENSAGEM_SEM_SUGESTOES_IA
            ) : (
              <TabelaDados
                caption="Sugestões da IA"
                cabecalhos={[
                  "Pagamento",
                  "Texto da referência",
                  "Pedido sugerido",
                  "Conferida?",
                  "Motivo da regra",
                ]}
              >
                {sugestoesValidas.map((sugestao) => (
                  <tr key={sugestao.pagamento}>
                    <td>{sugestao.pagamento}</td>
                    <td>{sugestao.textoReferencia}</td>
                    <td>
                      <Link
                        to={`/pedido/${encodeURIComponent(sugestao.pedidoSugerido)}`}
                      >
                        {sugestao.pedidoSugerido}
                      </Link>
                    </td>
                    <td>
                      <EtiquetaConferida conferida={sugestao.conferida} />
                    </td>
                    <td>{sugestao.motivo}</td>
                  </tr>
                ))}
              </TabelaDados>
            );
          })()
        )}
      </section>
    </>
  );
}
