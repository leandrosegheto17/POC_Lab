import { describe, expect, it } from "vitest";
import type { PedidoVendas } from "../../src/fontes/leitura-vendas.ts";
import {
  construirPedidosComEnvioFixtureGrande,
  executarFluxoComPlantioRastreio,
  linhasDeRastreioDoPedido,
} from "../apoio/gerador.ts";

describe("plantarCasosRastreio", () => {
  const PEDIDOS_GRANDE_COM_ENVIO = construirPedidosComEnvioFixtureGrande(100);

  it("planta cada um dos 5 casos, com formato esperado em linhasCsv e entrada correspondente no gabarito", () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const tiposEsperados = [
      "pago_nao_enviado",
      "entrega_atrasada",
      "fora_de_ordem",
      "linha_invalida",
      "registro_repetido",
    ];
    const tiposPresentes = new Set(plantio.gabarito.map((entrada) => entrada.tipo));
    for (const tipo of tiposEsperados) {
      expect(tiposPresentes.has(tipo)).toBe(true);
    }
  });

  it('caso "pago e não enviado": pedido sorteado não tem nenhuma linha coleta/transporte/entrega em linhasCsv', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "pago_nao_enviado");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      expect(linhas).toHaveLength(0);
    }
  });

  it('caso "fora de ordem": momento_fato de cada linha respeita a ordem cronológica correta, mas a posição física de entrega e transporte está trocada', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "fora_de_ordem");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const indiceEntrega = plantio.linhasCsv.findIndex((linha) => {
        const partes = linha.split(",");
        return partes[2] === entrada.pedido_venda && partes[3] === "entrega";
      });
      const indiceTransporte = plantio.linhasCsv.findIndex((linha) => {
        const partes = linha.split(",");
        return partes[2] === entrada.pedido_venda && partes[3] === "transporte";
      });

      expect(indiceEntrega).toBeGreaterThanOrEqual(0);
      expect(indiceTransporte).toBeGreaterThanOrEqual(0);
      // Posição física trocada: entrega aparece ANTES de transporte no arquivo.
      expect(indiceEntrega).toBeLessThan(indiceTransporte);

      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const momentoColeta = Date.parse(
        linhas.find((partes) => partes[3] === "coleta")?.[4] ?? "",
      );
      const momentoTransporte = Date.parse(
        linhas.find((partes) => partes[3] === "transporte")?.[4] ?? "",
      );
      const momentoEntrega = Date.parse(
        linhas.find((partes) => partes[3] === "entrega")?.[4] ?? "",
      );
      // Valores de momento_fato permanecem na ordem cronológica correta,
      // mesmo com a posição física das linhas trocada.
      expect(momentoColeta).toBeLessThan(momentoTransporte);
      expect(momentoTransporte).toBeLessThan(momentoEntrega);
    }
  });

  it('caso "entrega atrasada": momento_fato do evento entrega é estritamente posterior à dataLimite do pedido', () => {
    const { limpos, plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);
    const pedidosPorId = new Map(limpos.map((pedido) => [pedido.idPedido, pedido]));

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "entrega_atrasada");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const pedido = pedidosPorId.get(entrada.pedido_venda) as PedidoVendas;
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const linhaEntrega = linhas.find((partes) => partes[3] === "entrega");

      expect(linhaEntrega).toBeDefined();
      const momentoEntrega = Date.parse(linhaEntrega?.[4] ?? "");
      const dataLimite = Date.parse(pedido.dataLimite);
      expect(momentoEntrega).toBeGreaterThan(dataLimite);
    }
  });

  it('caso "linha inválida": a linha corrompida tem tipo fora do enum coleta/transporte/entrega', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "linha_invalida");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const tipos = linhas.map((partes) => partes[3]);
      expect(tipos.some((tipo) => !["coleta", "transporte", "entrega"].includes(tipo ?? ""))).toBe(
        true,
      );
    }
  });

  it('caso "registro repetido": a linha duplicada tem o mesmo codigo_evento, em 2 ocorrências', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "registro_repetido");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const codigosEvento = linhas.map((partes) => partes[0]);
      const contagem = new Map<string, number>();
      for (const codigo of codigosEvento) {
        contagem.set(codigo ?? "", (contagem.get(codigo ?? "") ?? 0) + 1);
      }
      expect(Math.max(...contagem.values())).toBe(2);
    }
  });

  it("os subconjuntos sorteados para cada tipo de caso de rastreio são disjuntos entre si (nenhum pedido recebe 2 casos)", () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const contagemPorPedido = new Map<string, number>();
    for (const entrada of plantio.gabarito) {
      contagemPorPedido.set(
        entrada.pedido_venda,
        (contagemPorPedido.get(entrada.pedido_venda) ?? 0) + 1,
      );
    }

    for (const contagem of contagemPorPedido.values()) {
      expect(contagem).toBeLessThanOrEqual(1);
    }
    expect(contagemPorPedido.size).toBeGreaterThan(0);
  });

  it("é determinístico: mesma semente produz mesmos pedidos sorteados e mesmo resultado, byte a byte", () => {
    const resultado1 = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);
    const resultado2 = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    expect(resultado1.plantio).toEqual(resultado2.plantio);

    const pedidosSorteados1 = resultado1.plantio.gabarito.map((entrada) => entrada.pedido_venda).sort();
    const pedidosSorteados2 = resultado2.plantio.gabarito.map((entrada) => entrada.pedido_venda).sort();
    expect(pedidosSorteados1).toEqual(pedidosSorteados2);
  });
});

