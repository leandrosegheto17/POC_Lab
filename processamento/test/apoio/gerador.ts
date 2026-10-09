import type { PedidoVendas } from "../../src/fontes/leitura-vendas.ts";
import { pedidosLimpos } from "../../src/gerador/gerar.ts";
import { gerarPagamentos } from "../../src/gerador/pagamentos.ts";
import { plantarCasosPagamento } from "../../src/gerador/plantar-pagamentos.ts";
import { plantarCasosRastreio } from "../../src/gerador/plantar-rastreio.ts";
import { mulberry32 } from "../../src/gerador/prng.ts";
import { gerarRastreio } from "../../src/gerador/rastreio.ts";

export function construirPedidoFixture(
  idPedido: string,
  precoUnitario: number,
  quantidade: number,
  desconto = 0,
): PedidoVendas {
  return {
    idPedido,
    itens: [{ precoUnitario, quantidade, desconto }],
    dataPedido: { iso: "1997-07-04T00:00:00.000Z", formato: "curto" },
    dataEnvio: null,
    dataLimite: "1997-08-01T00:00:00.000Z",
    transportadora: "1",
  };
}

export const PEDIDOS_FIXTURE: PedidoVendas[] = [
  construirPedidoFixture("10248", 14, 12),
  construirPedidoFixture("10249", 9.8, 10, 0),
  construirPedidoFixture("10250", 34.8, 5, 0.15),
  construirPedidoFixture("10251", 7.7, 3, 0),
  construirPedidoFixture("10252", 64.8, 40, 0.2),
  construirPedidoFixture("10253", 16.56, 15, 0.05),
  construirPedidoFixture("10254", 2.5, 8, 0),
  construirPedidoFixture("10255", 100, 1, 0),
  construirPedidoFixture("10256", 13.9, 7, 0.1),
  construirPedidoFixture("10257", 55.25, 2, 0),
];

export function construirPedidoComEnvioFixture(
  idPedido: string,
  dataEnvio: string,
  dataLimite: string,
  transportadora = "1",
): PedidoVendas {
  return {
    idPedido,
    itens: [{ precoUnitario: 10, quantidade: 1, desconto: 0 }],
    dataPedido: { iso: "1997-07-01T00:00:00.000Z", formato: "curto" },
    dataEnvio,
    dataLimite,
    transportadora,
  };
}

/**
 * Fixture grande (100 pedidos "limpos") usada pelos testes de
 * `plantarCasosPagamento`: precisa ser grande o suficiente para
 * que, mesmo com `Math.floor` nas proporções (mínimo 0.03), cada um dos 8
 * tipos de caso tenha pelo menos 1 pedido sorteado.
 */
export function construirPedidosFixtureGrande(quantidade: number): PedidoVendas[] {
  const pedidos: PedidoVendas[] = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    const idPedido = String(30000 + indice);
    pedidos.push(
      construirPedidoFixture(idPedido, 10 + indice, 1 + (indice % 5), (indice % 3) / 10),
    );
  }
  return pedidos;
}

/** Monta, para os testes, o fluxo completo até `plantarCasosPagamento` com uma única instância de PRNG (mesma ordem de consumo da CLI). */
export function executarFluxoComPlantio(pedidosOrigem: PedidoVendas[], semente: number) {
  const prng = mulberry32(semente);
  const limpos = pedidosLimpos(pedidosOrigem, prng);
  const { linhasCsv: linhasCsvBase } = gerarPagamentos(limpos, prng);
  const plantio = plantarCasosPagamento(limpos, linhasCsvBase, prng);
  return { limpos, linhasCsvBase, plantio };
}

export function linhasDoPedido(linhasCsv: string[], idPedido: string): string[][] {
  const referencia = `PV-${idPedido.padStart(6, "0")}`;
  return linhasCsv
    .filter((linha) => linha.split(",")[1] === referencia)
    .map((linha) => linha.split(","));
}

export function valorDevidoDoPedido(pedido: PedidoVendas): number {
  return pedido.itens.reduce(
    (acumulado, item) =>
      acumulado + item.precoUnitario * item.quantidade * (1 - item.desconto),
    0,
  );
}

/**
 * Fixture grande (100 pedidos "limpos", todos COM envio) usada pelos testes
 * de `plantarCasosRastreio`: precisa ser grande o suficiente para
 * que, mesmo com `Math.floor` nas proporções (mínimo 0.03), cada um dos 5
 * tipos de caso de rastreio tenha pelo menos 1 pedido sorteado.
 */
export function construirPedidosComEnvioFixtureGrande(quantidade: number): PedidoVendas[] {
  const pedidos: PedidoVendas[] = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    const idPedido = String(40000 + indice);
    const diaEnvio = 4 + (indice % 20);
    const diaLimite = diaEnvio + 15 + (indice % 10);
    const dataEnvio = `1997-07-${String(diaEnvio).padStart(2, "0")}T00:00:00.000Z`;
    const dataLimite =
      diaLimite <= 31
        ? `1997-07-${String(diaLimite).padStart(2, "0")}T00:00:00.000Z`
        : `1997-08-${String(diaLimite - 31).padStart(2, "0")}T00:00:00.000Z`;
    pedidos.push(
      construirPedidoComEnvioFixture(idPedido, dataEnvio, dataLimite, String(1 + (indice % 3))),
    );
  }
  return pedidos;
}

/** Monta, para os testes, o fluxo completo até `plantarCasosRastreio` com uma única instância de PRNG (mesma ordem de consumo da CLI). */
export function executarFluxoComPlantioRastreio(pedidosOrigem: PedidoVendas[], semente: number) {
  const prng = mulberry32(semente);
  const limpos = pedidosLimpos(pedidosOrigem, prng);
  const { linhasCsv: linhasCsvBase } = gerarPagamentos(limpos, prng);
  const plantioPagamento = plantarCasosPagamento(limpos, linhasCsvBase, prng);
  const rastreioGerado = gerarRastreio(limpos, prng);
  const plantio = plantarCasosRastreio(limpos, rastreioGerado.linhasCsv, prng);
  return { limpos, rastreioGerado, plantio, plantioPagamento };
}

export function linhasDeRastreioDoPedido(linhasCsv: string[], idPedido: string): string[][] {
  return linhasCsv
    .filter((linha) => linha.split(",")[2] === idPedido)
    .map((linha) => linha.split(","));
}
