import { describe, expect, it } from "vitest";
import { processarVendas } from "../../src/fontes/vendas.js";
import type { PedidoVendas } from "../../src/fontes/leitura-vendas.js";
import { obrigatorio } from "nucleo/apoio/obrigatorio.js";

function pedidoBase(sobrescritas: Partial<PedidoVendas> = {}): PedidoVendas {
  return {
    idPedido: "1",
    itens: [{ precoUnitario: 10, quantidade: 2, desconto: 0.1 }],
    dataPedido: { iso: "2024-01-15T00:00:00.000Z", formato: "curto" },
    dataEnvio: "2024-01-16T00:00:00.000Z",
    dataLimite: "2024-01-20T00:00:00.000Z",
    transportadora: "3",
    ...sobrescritas,
  };
}

describe("processarVendas", () => {
  it("pedido simples sem problema gera 1 vínculo, 1 evento venda v1 com valor devido e transportadora traduzida", () => {
    const pedidos = [pedidoBase()];

    const resultado = processarVendas(pedidos);

    expect(resultado.vinculos).toEqual([
      { fonte: "vendas", codigoExterno: "1", idPedido: "1" },
    ]);
    expect(resultado.eventos).toEqual([
      {
        fonte: "vendas",
        codigoEvento: "1",
        momentoFato: "2024-01-15T00:00:00.000Z",
        tipo: "venda",
        versao_schema: 1,
        valor_devido: 18, // 10 * 2 * (1 - 0.1)
        data_limite: "2024-01-20T00:00:00.000Z",
        transportadora: "Transportadora 1",
      },
    ]);
    expect(resultado.achados).toEqual([]);
  });

  it("pedido com dataPedido em formato curto não gera achado de formato", () => {
    const pedidos = [
      pedidoBase({
        dataPedido: { iso: "2024-01-15T00:00:00.000Z", formato: "curto" },
      }),
    ];

    const resultado = processarVendas(pedidos);

    expect(
      resultado.achados.filter((achado) =>
        achado.detalhe.includes("formato longo"),
      ),
    ).toEqual([]);
  });

  it("pedido com dataPedido em formato longo gera achado formato_data", () => {
    const pedidos = [
      pedidoBase({
        idPedido: "2",
        dataPedido: {
          iso: "2024-01-15T10:30:00.000Z",
          formato: "longo",
        },
      }),
    ];

    const resultado = processarVendas(pedidos);

    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "formato_data",
        fonte: "vendas",
        referencia: "2",
      }),
    ]);
    expect(obrigatorio(resultado.achados[0]).detalhe).toContain("formato longo");
  });

  it("pedido sem data de envio gera achado pedido_sem_envio", () => {
    const pedidos = [pedidoBase({ idPedido: "3", dataEnvio: null })];

    const resultado = processarVendas(pedidos);

    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "pedido_sem_envio",
        fonte: "vendas",
        referencia: "3",
      }),
    ]);
    expect(obrigatorio(resultado.achados[0]).detalhe).toContain("sem data de envio");
  });

  it("item com preço <= 0 ou desconto fora de [0,1] gera achado valor_fora_do_padrao", () => {
    const pedidos = [
      pedidoBase({
        idPedido: "4",
        itens: [
          { precoUnitario: 0, quantidade: 1, desconto: 0 },
          { precoUnitario: 10, quantidade: 1, desconto: 1.5 },
        ],
      }),
    ];

    const resultado = processarVendas(pedidos);

    const achadosValor = resultado.achados.filter(
      (achado) => achado.tipo === "valor_fora_do_padrao",
    );
    expect(achadosValor).toHaveLength(2);
    expect(achadosValor[0]).toMatchObject({
      fonte: "vendas",
      referencia: "4",
    });
  });

  it("dois pedidos com o mesmo código de transportadora recebem o mesmo Transportadora N", () => {
    const pedidos = [
      pedidoBase({ idPedido: "10", transportadora: "7" }),
      pedidoBase({ idPedido: "11", transportadora: "9" }),
      pedidoBase({ idPedido: "12", transportadora: "7" }),
    ];

    const resultado = processarVendas(pedidos);

    const transportadoraPorPedido = new Map(
      resultado.eventos.map((evento) => [
        evento.codigoEvento,
        (evento as { transportadora: string }).transportadora,
      ]),
    );

    expect(transportadoraPorPedido.get("10")).toBe("Transportadora 1");
    expect(transportadoraPorPedido.get("11")).toBe("Transportadora 2");
    // Mesmo código cru ("7") do pedido 10 -> mesmo número estável.
    expect(transportadoraPorPedido.get("12")).toBe("Transportadora 1");
  });

  it("é determinístico: mesma entrada chamada 2x produz a mesma saída byte a byte", () => {
    const pedidos = [
      pedidoBase({ idPedido: "20", transportadora: "5" }),
      pedidoBase({
        idPedido: "21",
        transportadora: "8",
        dataPedido: { iso: "2024-02-01T08:00:00.000Z", formato: "longo" },
        dataEnvio: null,
        itens: [{ precoUnitario: -1, quantidade: 1, desconto: 0 }],
      }),
    ];

    const resultadoA = processarVendas(pedidos);
    const resultadoB = processarVendas(pedidos);

    expect(resultadoA).toEqual(resultadoB);
  });
});
