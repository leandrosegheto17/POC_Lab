import { useMemo, useState } from "react";
import type { LinhaDoTempoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import { derivarEstado } from "nucleo/dominio/estado.js";
import { detectarDuplicado } from "nucleo/dominio/divergencias/duplicado.js";
import { eventoV1ParaDominio } from "../../dados/evento-v1.ts";
import { LinhaDoTempo } from "../LinhaDoTempo.tsx";
import { SeletorData } from "../SeletorData.tsx";
import { CartoesValores } from "./CartoesValores.tsx";

/**
 * Pagamentos a marcar como "duplicado" na linha do tempo. Só quando a API já
 * apontou a divergência `duplicado` para o pedido; a regra é a mesma do
 * processamento (`detectarDuplicado`, RN-03), rodando no navegador sobre os
 * pagamentos já carregados. O primeiro pagamento integral é o legítimo e
 * fica sem marca.
 */
function idsPagamentosDuplicados(dados: LinhaDoTempoV1): string[] {
  const { pedido, eventos } = dados;
  if (!pedido.divergencias.some((item) => item.tipo === "duplicado")) {
    return [];
  }

  const pagamentos = eventos.flatMap((evento) =>
    evento.tipo === "pagamento"
      ? [{ codigoEvento: evento.codigoEvento, valor: evento.valor }]
      : [],
  );
  const achado = detectarDuplicado(pedido.devido, pagamentos);
  return achado ? achado.idsEventos.slice(1) : [];
}

/**
 * Corpo do pedido: cartões de valor, seletor de data e linha do tempo.
 * "Ver estado numa data" usa `derivarEstado` no navegador sobre os `eventos`
 * já carregados, sem nova chamada à API. O resultado é reativo: recalcula a
 * cada mudança da data escolhida, então o botão "Ver estado" do
 * `SeletorData` (prop obrigatória) não faz nada além disso.
 */
export function DetalheLinhaDoTempo({ dados }: { dados: LinhaDoTempoV1 }) {
  const { pedido, eventos } = dados;
  const [dataEscolhida, setDataEscolhida] = useState<string | undefined>(
    undefined,
  );

  const estadoNaData = useMemo(() => {
    if (!dataEscolhida) {
      return null;
    }
    // AAAA-MM-DD vira o fim do dia, para incluir eventos do próprio dia.
    return derivarEstado(
      eventos.map(eventoV1ParaDominio),
      `${dataEscolhida}T23:59:59.999Z`,
    );
  }, [eventos, dataEscolhida]);

  const idsDuplicados = useMemo(() => idsPagamentosDuplicados(dados), [dados]);

  const resultado =
    estadoNaData === null ? null : estadoNaData.vendido ? (
      <>
        Em <span className="mono">{dataEscolhida}</span>: {estadoNaData.frase}.
      </>
    ) : (
      "Nenhum evento até esta data."
    );

  return (
    <>
      <CartoesValores pedido={pedido} />

      <SeletorData
        valor={dataEscolhida ?? ""}
        onMudar={(valor) => { setDataEscolhida(valor === "" ? undefined : valor); }}
        onVerEstado={() => {}}
        onLimpar={() => { setDataEscolhida(undefined); }}
        resultado={resultado}
      />

      <section
        className="pedido-secao-linha"
        aria-labelledby="pedido-linha-do-tempo-titulo"
      >
        <h2 id="pedido-linha-do-tempo-titulo">
          <span className="so-pc">
            Linha do tempo por sistema{" "}
            <span className="pedido-h2-nota">· ordem do momento do fato</span>
          </span>
          <span className="so-celular">Linha do tempo</span>
        </h2>
        <LinhaDoTempo
          eventos={eventos}
          dataEscolhida={dataEscolhida}
          codigoVendas={
            pedido.fontes.find((item) => item.fonte === "vendas")?.codigo
          }
          dataLimite={pedido.dataLimite}
          idsDuplicados={idsDuplicados}
        />
      </section>
    </>
  );
}
