import "./LinhaDoTempo.css";
import { FONTES, fonteDoEvento } from "../dados/rotulos.ts";
import { Cabecalho } from "./linha-do-tempo/Cabecalho.tsx";
import { CartaoEvento } from "./linha-do-tempo/CartaoEvento.tsx";
import {
  agruparPorData,
  codigosDoCabecalho,
} from "./linha-do-tempo/agrupamento.ts";
import type { EventoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";

// `LinhaDoTempo`: puramente apresentacional: nenhuma chamada à API, nenhum estado próprio,
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

type LinhaDoTempoProps = {
  eventos: EventoV1[];
  // Quando presente (vindo do `SeletorData` da página do pedido),
  // cada evento com `momentoFato > dataEscolhida` é atenuado e ganha o
  // texto "depois da data escolhida". Comparação simples de string, só para
  // EXIBIÇÃO — o estado de verdade vem de `derivarEstado`.
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
              {FONTES.map((fonte) => {
                const doSistema = grupo.eventos.filter(
                  (evento) => fonteDoEvento(evento.tipo) === fonte,
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
                            key={`${evento.codigoEvento}-${String(indice)}`}
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
