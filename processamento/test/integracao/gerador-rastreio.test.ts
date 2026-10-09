import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../src/gerador/prng.ts";
import { gerarRastreio } from "../../src/gerador/rastreio.ts";
import { construirPedidoComEnvioFixture, construirPedidoFixture } from "../apoio/gerador.ts";

describe("gerarRastreio", () => {
  it("gera 3 linhas (coleta, transporte, entrega) em ordem crescente de momento_fato para pedido com envio", () => {
    const pedido = construirPedidoComEnvioFixture(
      "20001",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
    );
    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedido], prng);

    expect(linhasCsv).toHaveLength(3);

    const partesLinhas = linhasCsv.map((linha) => linha.split(","));
    const tipos = partesLinhas.map((partes) => partes[3]);
    expect(tipos).toEqual(["coleta", "transporte", "entrega"]);

    const momentos = partesLinhas.map((partes) => Date.parse(partes[4] ?? ""));
    expect(momentos[0]).toBeLessThan(momentos[1] as number);
    expect(momentos[1]).toBeLessThan(momentos[2] as number);

    const dataLimite = Date.parse(pedido.dataLimite);
    expect(momentos[2]).toBeLessThanOrEqual(dataLimite);

    expect(partesLinhas[0]?.[4]).toBe(pedido.dataEnvio);
  });

  it("não gera nenhuma linha para pedido sem data de envio", () => {
    const pedidoSemEnvio = construirPedidoFixture("20002", 10, 1);
    expect(pedidoSemEnvio.dataEnvio).toBeNull();

    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedidoSemEnvio], prng);

    expect(linhasCsv).toHaveLength(0);
  });

  it("usa o mesmo codigo_rastreio (formato RS-dddddd) nas 3 linhas do mesmo pedido", () => {
    const pedido = construirPedidoComEnvioFixture(
      "20003",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
    );
    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedido], prng);

    const codigosRastreio = linhasCsv.map((linha) => linha.split(",")[1]);
    expect(new Set(codigosRastreio).size).toBe(1);
    expect(codigosRastreio[0]).toMatch(/^RS-\d{6}$/);
  });

  it("escreve as linhas na ordem canônica: coleta/transporte/entrega por pedido, pedidos na ordem de geração", () => {
    const pedidoComEnvioA = construirPedidoComEnvioFixture(
      "20004",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
    );
    const pedidoSemEnvio = construirPedidoFixture("20005", 10, 1);
    const pedidoComEnvioB = construirPedidoComEnvioFixture(
      "20006",
      "1997-07-10T00:00:00.000Z",
      "1997-08-05T00:00:00.000Z",
    );

    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio(
      [pedidoComEnvioA, pedidoSemEnvio, pedidoComEnvioB],
      prng,
    );

    expect(linhasCsv).toHaveLength(6);

    const pedidosETipos = linhasCsv.map((linha) => {
      const partes = linha.split(",");
      return [partes[2], partes[3]];
    });

    expect(pedidosETipos).toEqual([
      ["20004", "coleta"],
      ["20004", "transporte"],
      ["20004", "entrega"],
      ["20006", "coleta"],
      ["20006", "transporte"],
      ["20006", "entrega"],
    ]);
  });

  it("não usa nenhum nome real de transportadora: repassa Transportadora N", () => {
    const pedido = construirPedidoComEnvioFixture(
      "20007",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
      "3",
    );
    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedido], prng);

    for (const linha of linhasCsv) {
      const partes = linha.split(",");
      expect(partes[5]).toMatch(/^Transportadora \d+$/);
      expect(partes[5]).toBe("Transportadora 1");
    }
  });

  it("produz o mesmo resultado byte a byte para a mesma semente, em execuções separadas (determinismo)", () => {
    const pedidos = [
      construirPedidoComEnvioFixture(
        "20008",
        "1997-07-04T00:00:00.000Z",
        "1997-08-01T00:00:00.000Z",
      ),
      construirPedidoComEnvioFixture(
        "20009",
        "1997-07-12T00:00:00.000Z",
        "1997-08-10T00:00:00.000Z",
        "2",
      ),
    ];

    const prng1 = mulberry32(20261007);
    const resultado1 = gerarRastreio(pedidos, prng1);

    const prng2 = mulberry32(20261007);
    const resultado2 = gerarRastreio(pedidos, prng2);

    expect(resultado1).toEqual(resultado2);
  });
});

