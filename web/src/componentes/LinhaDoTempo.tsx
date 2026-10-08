import "./LinhaDoTempo.css";
import { EtiquetaFonte, type Fonte } from "./EtiquetaFonte.tsx";
import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";

// TP-0061 — `LinhaDoTempo`: lista `<ol>` dos eventos de um pedido, na ordem
// recebida (nunca reordena — quem decide a ordem é a camada consumidora).
// Puramente apresentacional: nenhuma chamada à API, nenhum estado próprio.
//
// Campos reais de `EsquemaEventoV1` (processamento/src/contrato/linha-do-tempo-v1.ts)
// — atenção: o esquema NÃO é uniformemente camelCase, mistura os dois estilos:
//   comuns a todas as variantes: fonte, codigoEvento, momentoFato, tipo,
//     chegouForaDeOrdem (estes sim em camelCase);
//   venda:    valor_devido, data_limite, transportadora   (snake_case)
//   pagamento: valor, referencia_original                  (snake_case)
//   coleta/transporte/entrega: transportadora, codigo_rastreio (snake_case)
//
// Decisão de implementação: para a célula "código", usamos sempre
// `codigoEvento` (presente e com o mesmo nome em TODAS as variantes), em vez
// de alternar para `referencia_original`/`codigo_rastreio` por tipo. Isso
// mantém uma única leitura de campo para a célula, sem `if` por tipo nessa
// parte da estrutura, e evita expor um identificador de formato diferente
// (referência externa vs. interno) na mesma coluna visual. Se o produto
// quiser mostrar o código de rastreio/referência externa também, isso é
// aditivo e não muda o que já existe aqui.
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
  transporte: "Em transporte",
  entrega: "Entregue",
};

const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Valor monetário do evento, quando a variante tiver um — `null` caso contrário
 * (coleta/transporte/entrega não têm valor). */
function valorDoEvento(evento: EventoV1): number | null {
  if (evento.tipo === "venda") {
    return evento.valor_devido;
  }
  if (evento.tipo === "pagamento") {
    return evento.valor;
  }
  return null;
}

type LinhaDoTempoProps = {
  eventos: EventoV1[];
  // TP-0073 — quando presente (vindo do `SeletorData`/"Ver estado numa
  // data" em `Pedido.tsx`), cada item com `momentoFato > dataEscolhida` é
  // atenuado visualmente e ganha o texto "depois da data escolhida". Só
  // comparação simples de string para fins de EXIBIÇÃO — o filtro de
  // verdade (para o cálculo do estado) já é feito por `derivarEstado`
  // (TP-0012), não duplicado aqui.
  dataEscolhida?: string;
};

// Cabeçalho de colunas da grade (>=1024px) — sempre no DOM, `aria-hidden`
// porque é só apoio visual da grade; em cada `<li>` (cartão, <1024px) a
// mesma informação já está presente como texto visível por item.
function CabecalhoColunas() {
  return (
    <li className="linha-do-tempo-cabecalho" aria-hidden="true">
      <span className="linha-do-tempo-cabecalho-coluna">Data</span>
      <span className="linha-do-tempo-cabecalho-coluna">Vendas</span>
      <span className="linha-do-tempo-cabecalho-coluna">Pagamentos</span>
      <span className="linha-do-tempo-cabecalho-coluna">Transportadora</span>
    </li>
  );
}

function ItemLinhaDoTempo({
  evento,
  dataEscolhida,
}: {
  evento: EventoV1;
  dataEscolhida?: string;
}) {
  const fonte = MAPA_FONTE[evento.tipo];
  const valor = valorDoEvento(evento);
  // Comparação de string simples (ver nota em `LinhaDoTempoProps`), só
  // para decidir a atenuação visual deste item — não recalcula estado.
  const depoisDaDataEscolhida =
    dataEscolhida !== undefined && evento.momentoFato > dataEscolhida;

  return (
    <li
      className={
        depoisDaDataEscolhida
          ? "linha-do-tempo-item linha-do-tempo-item--atenuado"
          : "linha-do-tempo-item"
      }
      data-fonte={fonte}
    >
      <span className="linha-do-tempo-celula-data linha-do-tempo-mono">
        {evento.momentoFato}
      </span>
      <span className="linha-do-tempo-celula-evento">
        <span className="linha-do-tempo-tipo">{MAPA_TIPO_TEXTO[evento.tipo]}</span>
        <EtiquetaFonte fonte={fonte} />
        <span className="linha-do-tempo-codigo linha-do-tempo-mono">
          {evento.codigoEvento}
        </span>
        {valor !== null ? (
          <span className="linha-do-tempo-valor linha-do-tempo-mono">
            {FORMATADOR_MOEDA.format(valor)}
          </span>
        ) : null}
        {evento.chegouForaDeOrdem ? (
          <span className="linha-do-tempo-fora-de-ordem">
            chegou fora de ordem
          </span>
        ) : null}
        {depoisDaDataEscolhida ? (
          // G-14 — nunca só cor/opacidade: o texto abaixo é visível no
          // DOM, não um rótulo só para leitor de tela.
          <span className="linha-do-tempo-depois-da-data">
            depois da data escolhida
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function LinhaDoTempo({ eventos, dataEscolhida }: LinhaDoTempoProps) {
  return (
    <ol className="linha-do-tempo">
      <CabecalhoColunas />
      {eventos.map((evento) => (
        <ItemLinhaDoTempo
          key={evento.codigoEvento}
          evento={evento}
          dataEscolhida={dataEscolhida}
        />
      ))}
    </ol>
  );
}
