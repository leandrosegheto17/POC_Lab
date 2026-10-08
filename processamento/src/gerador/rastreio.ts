import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import { construirMapaTransportadoras } from "../fontes/vendas.js";

/**
 * Tipos de evento de rastreio gerados por pedido, sempre na mesma ordem
 * canônica: `coleta` → `transporte` → `entrega`.
 */
export type TipoEventoRastreio = "coleta" | "transporte" | "entrega";

/** Resultado da geração de rastreio: as linhas de dados do `rastreio.csv` (sem cabeçalho, já formatadas). */
export type ResultadoGeracaoRastreio = {
  linhasCsv: string[];
};

function formatarCodigoEvento(numero: number): string {
  return `EVT-RS-${String(numero).padStart(6, "0")}`;
}

function formatarCodigoRastreio(numero: number): string {
  return `RS-${String(numero).padStart(6, "0")}`;
}

/**
 * Interpola linearmente um instante entre `inicioIso` e `fimIso`, na fração
 * `fracao` (esperada em `[0, 1]`). Usada para escolher, de forma
 * determinística a partir do PRNG, os instantes de `transporte` e `entrega`
 * entre a coleta e a data limite do pedido.
 */
function interpolarData(inicioIso: string, fimIso: string, fracao: number): string {
  const inicio = Date.parse(inicioIso);
  const fim = Date.parse(fimIso);
  const timestamp = inicio + (fim - inicio) * fracao;
  return new Date(timestamp).toISOString();
}

function formatarLinhaCsv(
  codigoEvento: string,
  codigoRastreio: string,
  pedidoVenda: string,
  tipo: TipoEventoRastreio,
  momentoFato: string,
  transportadora: string,
): string {
  return `${codigoEvento},${codigoRastreio},${pedidoVenda},${tipo},${momentoFato},${transportadora}`;
}

/**
 * Gera as linhas de rastreio (`rastreio.csv`) para os pedidos recebidos, de
 * forma determinística a partir do PRNG informado.
 *
 * Decisões desta tarefa (TP-0024):
 * - Só pedidos com `dataEnvio !== null` geram eventos. Pedidos sem envio não
 *   produzem nenhuma linha aqui — não há o que rastrear.
 * - Para cada pedido elegível, são geradas exatamente 3 linhas, sempre na
 *   ordem canônica `coleta`, `transporte`, `entrega`:
 *   - `coleta`: no instante da própria `dataEnvio` do pedido.
 *   - `transporte`: instante intermediário, interpolado entre `dataEnvio` e
 *     `dataLimite` com uma fração sorteada do PRNG mapeada para o intervalo
 *     `[0.3, 0.7)` — margem que garante (fora do caso degenerado em que
 *     `dataEnvio === dataLimite`) que o `transporte` fica estritamente entre
 *     a coleta e a data limite.
 *   - `entrega`: interpolado entre o instante de `transporte` e a
 *     `dataLimite`, com uma segunda fração sorteada do PRNG mapeada para
 *     `[0.3, 1.0)` — garante `entrega` estritamente depois de `transporte` e
 *     sempre `<= dataLimite` (nunca ultrapassa, pois a fração é `< 1`).
 * - Cada pedido elegível recebe um `codigo_rastreio` (`RS-` + 6 dígitos)
 *   próprio, sequencial entre pedidos, reaproveitado pelas 3 linhas desse
 *   pedido (coleta/transporte/entrega compartilham o mesmo código).
 * - Cada linha recebe um `codigo_evento` (`EVT-RS-` + 6 dígitos) sequencial
 *   e único, contínuo entre pedidos (não reinicia por pedido).
 * - `pedido_venda` é o `idPedido` do pedido, sem formatação adicional (ao
 *   contrário da `referencia` de `pagamentos.csv`, que é prefixada com
 *   `PV-` — não há exigência equivalente aqui).
 * - `transportadora` é traduzida para `Transportadora N` com o mesmo mapa de
 *   `fontes/vendas.ts` (RTP-0008), construído sobre a lista completa de
 *   pedidos; o código cru de `ShipVia` nunca chega ao CSV.
 * - Nenhum problema de rastreio (atraso, evento fora de ordem, etc.) é
 *   plantado aqui — isso é responsabilidade de uma tarefa futura. Esta
 *   função só produz a base "limpa".
 *
 * Consome exatamente 2 números do PRNG por pedido elegível (um para a
 * fração de `transporte`, outro para a de `entrega`), na ordem da lista de
 * pedidos recebida — para que, encadeada após `gerarPagamentos` com a mesma
 * instância do PRNG, a sequência de números consumidos permaneça contínua e
 * determinística ponta a ponta.
 *
 * Função pura: não lê nem escreve nada em disco.
 */
export function gerarRastreio(
  pedidos: PedidoVendas[],
  prng: () => number,
): ResultadoGeracaoRastreio {
  const linhasCsv: string[] = [];
  const mapaTransportadoras = construirMapaTransportadoras(pedidos);
  let rastreioSeq = 0;
  let eventoSeq = 0;

  for (const pedido of pedidos) {
    if (pedido.dataEnvio === null) {
      continue;
    }

    const fracaoTransporte = 0.3 + prng() * 0.4;
    const fracaoEntrega = 0.3 + prng() * 0.7;

    const momentoColeta = pedido.dataEnvio;
    const momentoTransporte = interpolarData(
      pedido.dataEnvio,
      pedido.dataLimite,
      fracaoTransporte,
    );
    const momentoEntrega = interpolarData(
      momentoTransporte,
      pedido.dataLimite,
      fracaoEntrega,
    );

    rastreioSeq += 1;
    const codigoRastreio = formatarCodigoRastreio(rastreioSeq);

    const eventos: Array<[TipoEventoRastreio, string]> = [
      ["coleta", momentoColeta],
      ["transporte", momentoTransporte],
      ["entrega", momentoEntrega],
    ];

    for (const [tipo, momentoFato] of eventos) {
      eventoSeq += 1;
      linhasCsv.push(
        formatarLinhaCsv(
          formatarCodigoEvento(eventoSeq),
          codigoRastreio,
          pedido.idPedido,
          tipo,
          momentoFato,
          mapaTransportadoras.get(pedido.transportadora) ?? "",
        ),
      );
    }
  }

  return { linhasCsv };
}
