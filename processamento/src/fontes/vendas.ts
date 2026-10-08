/**
 * Adaptador de vendas (TP-0020).
 *
 * Consome a lista de pedidos já lida e normalizada por `lerBaseDeVendas`
 * (`fontes/leitura-vendas.ts`) e devolve vínculos, eventos `venda` v1 e
 * achados de qualidade — tudo em memória, sem gravar no SQLite (isso é
 * responsabilidade de uma camada posterior, ex. caso de uso `importar`).
 *
 * Este módulo é explícito para a fonte "vendas": não existe (e não deve
 * existir) uma interface/registro genérico de "fonte" — cada fonte
 * (vendas, pagamentos, rastreio) tem seu próprio adaptador independente.
 *
 * `dominio/` continua puro: os únicos cálculos aqui (`calcularValorDevido`,
 * `verificarItemPedido`) são chamados, nunca reimplementados.
 */
import type { PedidoVendas } from "./leitura-vendas.js";
import { calcularValorDevido } from "../dominio/valores.js";
import { verificarItemPedido } from "../dominio/valores-fora-do-padrao.js";
import type { Evento } from "../dominio/evento.js";
import type { AchadoQualidade, VinculoFonte } from "../dominio/modelo.js";

/**
 * Resultado do processamento da base de vendas: tudo em memória, pronto
 * para ser gravado por uma camada posterior (ex. caso de uso de
 * importação).
 */
export type ResultadoProcessamentoVendas = {
  vinculos: VinculoFonte[];
  eventos: Evento[];
  achados: AchadoQualidade[];
};

const REGRA_FORMATO_DATA_LONGO =
  "TP-0020: dataPedido em formato longo (com hora), fora do padrão curto (sem hora) esperado da base";
const REGRA_SEM_DATA_ENVIO =
  "TP-0020: pedido sem data de envio (ShippedDate nula na base de origem)";

/**
 * Traduz o código cru de transportadora (`ShipVia`) para um identificador
 * estável `Transportadora N`, sem jamais expor o código/nome real da
 * transportadora no evento ou vínculo gerado.
 *
 * Determinístico e estável: percorre os pedidos **na ordem em que estão na
 * lista recebida** e, na primeira vez que um código aparece, atribui o
 * próximo número sequencial (`Transportadora 1`, `Transportadora 2`, ...,
 * começando em 1). Mesma entrada (mesma lista, mesma ordem) sempre produz o
 * mesmo mapeamento; o mesmo código cru sempre vira o mesmo número dentro de
 * uma mesma chamada.
 */
function construirMapaTransportadoras(
  pedidos: PedidoVendas[],
): Map<string, string> {
  const mapa = new Map<string, string>();
  let proximoNumero = 1;
  for (const pedido of pedidos) {
    if (!mapa.has(pedido.transportadora)) {
      mapa.set(pedido.transportadora, `Transportadora ${proximoNumero}`);
      proximoNumero += 1;
    }
  }
  return mapa;
}

/**
 * Processa a lista de pedidos de vendas (já lida por `lerBaseDeVendas`) e
 * devolve vínculos, eventos `venda` v1 e achados de qualidade.
 *
 * Para cada pedido:
 * - Vínculo `{ fonte: "vendas", codigoExterno: idPedido, idPedido }` — o
 *   código externo é o próprio `idPedido` da base, já que vendas é a fonte
 *   primária.
 * - Evento `venda` v1 com `valor_devido` (RN-01, via `calcularValorDevido`),
 *   `data_limite` e `transportadora` traduzida para `Transportadora N`.
 * - Achado de formato de data: o formato `curto` (`YYYY-MM-DD`, sem hora) é
 *   considerado o padrão esperado da base e NÃO gera achado; só o formato
 *   `longo` (com componente de hora) é tratado como desvio do padrão
 *   esperado, usando o tipo dedicado `formato_data` (TP-0031; a linha
 *   continua sendo processada normalmente — "achado" aqui significa "fora
 *   do formato padrão", não "descartada").
 * - Achado de pedido sem data de envio (`dataEnvio === null`): tipo dedicado
 *   `pedido_sem_envio` (TP-0031).
 * - Achado de item fora do padrão (RN-10, via `verificarItemPedido`), tipo
 *   `valor_fora_do_padrao`.
 */
export function processarVendas(
  pedidos: PedidoVendas[],
): ResultadoProcessamentoVendas {
  const vinculos: VinculoFonte[] = [];
  const eventos: Evento[] = [];
  const achados: AchadoQualidade[] = [];

  const mapaTransportadoras = construirMapaTransportadoras(pedidos);

  for (const pedido of pedidos) {
    const { idPedido } = pedido;

    vinculos.push({ fonte: "vendas", codigoExterno: idPedido, idPedido });

    const valorDevido = calcularValorDevido(pedido.itens);
    const transportadora =
      mapaTransportadoras.get(pedido.transportadora) ?? "Transportadora 0";

    eventos.push({
      fonte: "vendas",
      codigoEvento: idPedido,
      momentoFato: pedido.dataPedido.iso,
      tipo: "venda",
      versao_schema: 1,
      valor_devido: valorDevido,
      data_limite: pedido.dataLimite,
      transportadora,
    });

    if (pedido.dataPedido.formato === "longo") {
      achados.push({
        tipo: "formato_data",
        fonte: "vendas",
        referencia: idPedido,
        regra: REGRA_FORMATO_DATA_LONGO,
        detalhe: `pedido "${idPedido}" com dataPedido em formato longo (com hora): "${pedido.dataPedido.iso}"`,
      });
    }

    if (pedido.dataEnvio === null) {
      achados.push({
        tipo: "pedido_sem_envio",
        fonte: "vendas",
        referencia: idPedido,
        regra: REGRA_SEM_DATA_ENVIO,
        detalhe: `pedido "${idPedido}" sem data de envio`,
      });
    }

    pedido.itens.forEach((item) => {
      const achadoItem = verificarItemPedido(item);
      if (achadoItem) {
        achados.push({
          tipo: "valor_fora_do_padrao",
          fonte: "vendas",
          referencia: idPedido,
          regra: achadoItem.regra,
          detalhe: achadoItem.detalhe,
        });
      }
    });
  }

  return { vinculos, eventos, achados };
}
