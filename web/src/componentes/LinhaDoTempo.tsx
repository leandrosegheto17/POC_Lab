import "./LinhaDoTempo.css";
import { EtiquetaFonte, rotuloFonte, type Fonte } from "./EtiquetaFonte.tsx";
import { EtiquetaEstado } from "./EtiquetaEstado.tsx";
import { formatarData, formatarMoeda } from "../dados/formatacao.ts";
import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";

// TP-0061 / ajuste Modelo B (2026-10-08, mockup à risca) — `LinhaDoTempo`.
// Puramente apresentacional: nenhuma chamada à API, nenhum estado próprio,
// nunca reordena os eventos (quem decide a ordem é a API).
//
// Estrutura: `<ol>` com UM `<li>` POR DATA (`AAAA-MM-DD`, na ordem em que a
// data aparece pela primeira vez na lista recebida). Dentro de cada data,
// três células (Vendas | Pagamentos | Transportadora); cada célula com
// eventos tem uma lista interna de cartões de evento.
//   - PC (>= 1024px): grade `110px repeat(3, 1fr)`, cabeçalho `aria-hidden`
//     com os códigos de cada sistema, rolagem horizontal no contêiner.
//   - Celular (< 1024px): a célula de data e o cabeçalho somem; cada evento
//     vira um cartão com selo da fonte + data. Dentro de uma mesma data, a
//     ordem no celular é a das células (Vendas, Pagamentos, Transportadora),
//     mantendo a ordem recebida dentro de cada sistema.
//
// Campos reais de `EsquemaEventoV1` (mistura camelCase e snake_case):
//   comuns: fonte, codigoEvento, momentoFato, tipo, chegouForaDeOrdem;
//   venda: valor_devido, data_limite, transportadora;
//   pagamento: valor, referencia_original;
//   coleta/transporte/entrega: transportadora, codigo_rastreio.
// O código mostrado para a transportadora é sempre `codigo_rastreio` (o
// `codigoEvento` dela é interno, "EVT-RS-…", e não é exibido).
const MAPA_FONTE: Record<EventoV1["tipo"], Fonte> = {
  venda: "vendas",
  pagamento: "pagamentos",
  coleta: "rastreio",
  transporte: "rastreio",
  entrega: "rastreio",
};

const MAPA_TIPO_TEXTO: Record<EventoV1["tipo"], string> = {
  venda: "Venda",
  pagamento: "Pagamento",
  coleta: "Coleta",
  transporte: "Em trânsito",
  entrega: "Entrega",
};

const FONTES_EM_COLUNA: Fonte[] = ["vendas", "pagamentos", "rastreio"];

type LinhaDoTempoProps = {
  eventos: EventoV1[];
  // TP-0073 — quando presente (vindo do `SeletorData` em `Pedido.tsx`),
  // cada evento com `momentoFato > dataEscolhida` é atenuado e ganha o
  // texto "depois da data escolhida". Comparação simples de string, só para
  // EXIBIÇÃO — o estado de verdade vem de `derivarEstado` (TP-0012).
  dataEscolhida?: string;
  /** Código do pedido no sistema de vendas (de `pedido.fontes`), mostrado
   * no cabeçalho da coluna Vendas como "#10248". */
  codigoVendas?: string;
  /** Data limite do pedido. Com ela, a entrega ganha a marca "no prazo"
   * (`momentoFato <= dataLimite`, mesma comparação da RN-06) ou
   * "atrasada". */
  dataLimite?: string;
  /** `codigoEvento` dos pagamentos a marcar como "duplicado" (já sem o
   * primeiro pagamento, que é o legítimo). */
  idsDuplicados?: readonly string[];
};

type GrupoPorData = {
  data: string;
  eventos: EventoV1[];
};

/** Agrupa por `AAAA-MM-DD`, na ordem de primeira aparição (sem reordenar). */
function agruparPorData(eventos: EventoV1[]): GrupoPorData[] {
  const grupos = new Map<string, EventoV1[]>();
  for (const evento of eventos) {
    const data = formatarData(evento.momentoFato);
    const lista = grupos.get(data);
    if (lista) {
      lista.push(evento);
    } else {
      grupos.set(data, [evento]);
    }
  }
  return Array.from(grupos, ([data, lista]) => ({ data, eventos: lista }));
}

/** Valores distintos, na ordem de primeira aparição. */
function distintos(valores: string[]): string[] {
  return Array.from(new Set(valores));
}

function codigosDoCabecalho(
  eventos: EventoV1[],
  codigoVendas: string | undefined,
): Record<Fonte, string> {
  const vendas = codigoVendas
    ? [codigoVendas]
    : distintos(
        eventos
          .filter((evento) => evento.tipo === "venda")
          .map((evento) => evento.codigoEvento),
      );
  const pagamentos = distintos(
    eventos
      .filter((evento) => evento.tipo === "pagamento")
      .map((evento) => evento.codigoEvento),
  );
  const rastreio = distintos(
    eventos.flatMap((evento) =>
      evento.tipo === "coleta" ||
      evento.tipo === "transporte" ||
      evento.tipo === "entrega"
        ? [evento.codigo_rastreio]
        : [],
    ),
  );

  return {
    vendas: vendas.map((codigo) => `#${codigo}`).join(" · "),
    pagamentos: pagamentos.join(" · "),
    rastreio: rastreio.join(" · "),
  };
}

function Cabecalho({ codigos }: { codigos: Record<Fonte, string> }) {
  return (
    <div className="linha-do-tempo__cabecalho" aria-hidden="true">
      <div className="linha-do-tempo__cabecalho-celula">Data</div>
      {FONTES_EM_COLUNA.map((fonte) => (
        <div key={fonte} className="linha-do-tempo__cabecalho-celula">
          {rotuloFonte(fonte)}
          {codigos[fonte] ? (
            <span className="linha-do-tempo__cabecalho-codigo">
              {codigos[fonte]}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type MarcaEvento = { variante: "ok" | "alerta" | "ruim" | "neutra"; texto: string };

function marcasDoEvento(
  evento: EventoV1,
  duplicado: boolean,
  dataLimite: string | undefined,
): MarcaEvento[] {
  const marcas: MarcaEvento[] = [];
  if (duplicado) {
    marcas.push({ variante: "ruim", texto: "duplicado" });
  }
  if (evento.chegouForaDeOrdem) {
    marcas.push({ variante: "alerta", texto: "fora de ordem" });
  }
  if (evento.tipo === "entrega" && dataLimite !== undefined) {
    marcas.push(
      evento.momentoFato <= dataLimite
        ? { variante: "ok", texto: "no prazo" }
        : { variante: "neutra", texto: "atrasada" },
    );
  }
  return marcas;
}

/** Linha de detalhe do PC: valor da venda; código + valor do pagamento;
 * nada para a transportadora (o código já está no cabeçalho). */
function DetalhePc({ evento }: { evento: EventoV1 }) {
  if (evento.tipo === "venda") {
    return (
      <span className="evento__linha evento__linha--pc">
        {formatarMoeda(evento.valor_devido)}
      </span>
    );
  }
  if (evento.tipo === "pagamento") {
    return (
      <span className="evento__linha evento__linha--pc">
        <span className="mono">{evento.codigoEvento}</span> ·{" "}
        {formatarMoeda(evento.valor)}
      </span>
    );
  }
  return null;
}

/** Linha de código do celular: "#10248 · R$ 440,00", "TX-… · R$ 264,00",
 * "RS-000001". */
function textoCodigoCelular(evento: EventoV1): string {
  if (evento.tipo === "venda") {
    return `#${evento.codigoEvento} · ${formatarMoeda(evento.valor_devido)}`;
  }
  if (evento.tipo === "pagamento") {
    return `${evento.codigoEvento} · ${formatarMoeda(evento.valor)}`;
  }
  return evento.codigo_rastreio;
}

/** Texto oculto com a fonte (no PC a fonte é dada só pela coluna). Para
 * venda e transportadora inclui o código, que no PC só aparece no
 * cabeçalho `aria-hidden`. */
function textoFonteOculta(evento: EventoV1, fonte: Fonte): string {
  if (evento.tipo === "venda") {
    return `fonte: ${rotuloFonte(fonte)}, #${evento.codigoEvento}`;
  }
  if (evento.tipo === "pagamento") {
    return `fonte: ${rotuloFonte(fonte)}`;
  }
  return `fonte: ${rotuloFonte(fonte)}, ${evento.codigo_rastreio}`;
}

function CartaoEvento({
  evento,
  dataEscolhida,
  dataLimite,
  duplicado,
}: {
  evento: EventoV1;
  dataEscolhida?: string;
  dataLimite?: string;
  duplicado: boolean;
}) {
  const fonte = MAPA_FONTE[evento.tipo];
  // Comparação de string simples (ver nota em `LinhaDoTempoProps`).
  const depoisDaDataEscolhida =
    dataEscolhida !== undefined &&
    dataEscolhida !== "" &&
    evento.momentoFato > dataEscolhida;
  const marcas = marcasDoEvento(evento, duplicado, dataLimite);

  const classes = ["evento"];
  if (duplicado) {
    classes.push("evento--ruim");
  }
  if (depoisDaDataEscolhida) {
    classes.push("evento--depois");
  }

  return (
    <li className={classes.join(" ")} data-fonte={fonte}>
      <div className="evento__topo">
        <EtiquetaFonte fonte={fonte} variante="selo" />
        <span className="evento__data mono">
          {formatarData(evento.momentoFato)}
        </span>
      </div>
      <strong className="evento__titulo">
        {MAPA_TIPO_TEXTO[evento.tipo]}
        {marcas.map((marca) => (
          <span key={marca.texto}>
            {" "}
            <EtiquetaEstado variante={marca.variante}>{marca.texto}</EtiquetaEstado>
          </span>
        ))}
      </strong>
      <span className="visualmente-oculto evento__fonte-oculta">
        {textoFonteOculta(evento, fonte)}
      </span>
      {depoisDaDataEscolhida ? (
        // G-14 — nunca só opacidade: o texto é visível no DOM.
        <span className="evento__depois">depois da data escolhida</span>
      ) : (
        <>
          <DetalhePc evento={evento} />
          <span className="evento__linha evento__linha--celular mono">
            {textoCodigoCelular(evento)}
          </span>
        </>
      )}
    </li>
  );
}

export function LinhaDoTempo({
  eventos,
  dataEscolhida,
  codigoVendas,
  dataLimite,
  idsDuplicados = [],
}: LinhaDoTempoProps) {
  const grupos = agruparPorData(eventos);
  const codigos = codigosDoCabecalho(eventos, codigoVendas);

  return (
    <div
      className="linha-do-tempo"
      role="region"
      aria-label="Linha do tempo por sistema"
      tabIndex={0}
    >
      <div className="linha-do-tempo__grade">
        <Cabecalho codigos={codigos} />
        <ol className="linha-do-tempo__datas">
          {grupos.map((grupo) => (
            <li key={grupo.data} className="linha-do-tempo__linha">
              <span className="linha-do-tempo__data mono">{grupo.data}</span>
              {FONTES_EM_COLUNA.map((fonte) => {
                const doSistema = grupo.eventos.filter(
                  (evento) => MAPA_FONTE[evento.tipo] === fonte,
                );
                return (
                  <div
                    key={fonte}
                    className="linha-do-tempo__celula"
                    data-coluna={fonte}
                  >
                    {doSistema.length > 0 ? (
                      <ul className="linha-do-tempo__eventos">
                        {doSistema.map((evento, indice) => (
                          <CartaoEvento
                            key={`${evento.codigoEvento}-${indice}`}
                            evento={evento}
                            dataEscolhida={dataEscolhida}
                            dataLimite={dataLimite}
                            duplicado={
                              evento.tipo === "pagamento" &&
                              idsDuplicados.includes(evento.codigoEvento)
                            }
                          />
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
