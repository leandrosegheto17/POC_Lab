import { describe, expect, it } from "vitest";

import { criarRepositorio } from "../../src/armazenamento/repositorio.js";
import { montarPedidosEVinculos } from "../../src/publicacao/pedidos.js";
import { eventoPagamento, eventoVenda, montarRepositorioComFixture } from "../apoio/publicacao.js";

/**
 * Testes de `montarPedidosEVinculos`.
 *
 * Fixture montada diretamente via as funções de inserção do repositório
 * (mesma técnica de `test/armazenamento/repositorio.test.ts`), num event
 * store `:memory:`.
 */

describe("montarPedidosEVinculos", () => {
  it("pedido com 1 pagamento parcial: situacao_pagamento = 'parcial' e valor_pago correto", () => {
    const repositorio = montarRepositorioComFixture();

    const { pedidoResumo } = montarPedidosEVinculos(repositorio);

    expect(pedidoResumo).toHaveLength(1);
    expect(pedidoResumo[0]).toMatchObject({
      id_pedido: "PED-000001",
      valor_devido: 100,
      valor_pago: 40,
      data_limite: "2026-01-10",
      situacao_pagamento: "parcial",
    });
  });

  it("pedido vinculado em vendas + pagamentos + rastreio: fontes com as 3 chaves, na ordem e string exatas", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000002");
    repositorio.inserirVinculoFonte("vendas", "PED-000002", "PED-000002");
    eventoVenda(repositorio, {
      codigoEvento: "PED-000002",
      idPedido: "PED-000002",
      valorDevido: 200,
      dataLimite: "2026-02-10",
    });
    repositorio.inserirVinculoFonte("pagamentos", "PAG-002", "PED-000002");
    eventoPagamento(repositorio, {
      codigoEvento: "PAG-002",
      idPedido: "PED-000002",
      valor: 200,
      referenciaOriginal: "PED-000002",
    });
    repositorio.inserirVinculoFonte("rastreio", "RAST-002", "PED-000002");

    const { pedidoResumo } = montarPedidosEVinculos(repositorio);

    const linha = pedidoResumo.find((item) => item.id_pedido === "PED-000002");
    expect(linha).toBeDefined();
    expect(linha?.fontes).toBe(
      JSON.stringify({
        vendas: "PED-000002",
        pagamentos: "PAG-002",
        rastreio: "RAST-002",
      }),
    );
  });

  it("dois pedidos distintos cujos códigos normalizam para o mesmo valor: lança erro citando códigos e pedidos", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000003");
    repositorio.inserirPedido("PED-000004");
    repositorio.inserirVinculoFonte("vendas", "PV-000001", "PED-000003");
    repositorio.inserirVinculoFonte("vendas", "pv-000001", "PED-000004");

    expect(() => montarPedidosEVinculos(repositorio)).toThrowError(
      /PV-000001.*PED-000003.*pv-000001.*PED-000004|pv-000001.*PED-000004.*PV-000001.*PED-000003/s,
    );
  });

  it("determinismo: chamar 2x com a mesma entrada produz a mesma saída, mesma ordem, mesmos bytes", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000005");
    repositorio.inserirPedido("PED-000006");
    repositorio.inserirVinculoFonte("vendas", "PED-000005", "PED-000005");
    eventoVenda(repositorio, {
      codigoEvento: "PED-000005",
      idPedido: "PED-000005",
      valorDevido: 50,
      dataLimite: "2026-03-01",
    });
    repositorio.inserirVinculoFonte("vendas", "PED-000006", "PED-000006");
    eventoVenda(repositorio, {
      codigoEvento: "PED-000006",
      idPedido: "PED-000006",
      valorDevido: 80,
      dataLimite: "2026-03-05",
    });
    repositorio.inserirVinculoFonte("rastreio", "RAST-006", "PED-000006");

    const primeira = montarPedidosEVinculos(repositorio);
    const segunda = montarPedidosEVinculos(repositorio);

    expect(primeira).toEqual(segunda);
    expect(primeira.pedidoResumo.map((p) => p.id_pedido)).toEqual([
      "PED-000005",
      "PED-000006",
    ]);
    expect(primeira.pedidoResumo.map((p) => p.fontes)).toEqual(
      segunda.pedidoResumo.map((p) => p.fontes),
    );
    expect(primeira.vinculoCodigo.map((v) => v.codigo)).toEqual(
      segunda.vinculoCodigo.map((v) => v.codigo),
    );
  });

  it("pedido_resumo ordenado por id_pedido e vinculo_codigo ordenado por codigo normalizado", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000009");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirVinculoFonte("vendas", "PED-000009", "PED-000009");
    repositorio.inserirVinculoFonte("vendas", "PED-000001", "PED-000001");

    const { pedidoResumo, vinculoCodigo } = montarPedidosEVinculos(repositorio);

    expect(pedidoResumo.map((p) => p.id_pedido)).toEqual([
      "PED-000001",
      "PED-000009",
    ]);
    const codigos = vinculoCodigo.map((v) => v.codigo);
    const codigosOrdenados = [...codigos].sort((a, b) => a.localeCompare(b));
    expect(codigos).toEqual(codigosOrdenados);
  });

  it("nenhum nome real de base aparece nas colunas (só o que já vem traduzido no evento venda)", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000007");
    repositorio.inserirVinculoFonte("vendas", "PED-000007", "PED-000007");
    eventoVenda(repositorio, {
      codigoEvento: "PED-000007",
      idPedido: "PED-000007",
      valorDevido: 30,
      dataLimite: "2026-04-01",
    });

    const { pedidoResumo } = montarPedidosEVinculos(repositorio);
    const linha = pedidoResumo.find((item) => item.id_pedido === "PED-000007");

    expect(JSON.stringify(linha)).not.toMatch(/transportadora/i);
  });
});
