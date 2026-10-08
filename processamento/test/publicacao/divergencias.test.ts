/**
 * TP-0037 — Testes da projeção `divergencia` (`publicacao/divergencias.ts`).
 *
 * Fixture via event store `:memory:` (`criarRepositorio`), inserindo eventos
 * diretamente com `repositorio.inserirEvento` (sem reimplementar nenhuma
 * regra de divergência — só monta o cenário de entrada).
 */
import { describe, expect, it } from "vitest";

import { criarRepositorio, type EventoParaInserir } from "../../src/armazenamento/repositorio.ts";
import { montarDivergencias } from "../../src/publicacao/divergencias.ts";

const DATA_CORTE = "2024-06-01T00:00:00Z";

/** Monta um evento `venda` sem divergência de atraso (data_limite bem no futuro). */
function eventoVenda(codigoEvento: string, idPedido: string, valorDevido: number): EventoParaInserir {
  return {
    fonte: "vendas",
    codigoEvento,
    idPedido,
    tipo: "venda",
    momentoFato: "2024-01-01T10:00:00Z",
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      tipo: "venda",
      versao_schema: 1,
      valor_devido: valorDevido,
      data_limite: "2099-01-01T00:00:00Z",
      transportadora: "Transportadora X",
    }),
  };
}

function eventoPagamento(
  codigoEvento: string,
  idPedido: string,
  valor: number,
  momentoFato: string,
): EventoParaInserir {
  return {
    fonte: "pagamentos",
    codigoEvento,
    idPedido,
    tipo: "pagamento",
    momentoFato,
    ordemChegada: 2,
    versaoSchema: 1,
    dados: JSON.stringify({
      tipo: "pagamento",
      versao_schema: 1,
      valor,
      referencia_original: codigoEvento,
    }),
  };
}

describe("montarDivergencias", () => {
  it("pedido com pagamento duplicado gera uma linha com os 2 eventos que sustentam, na ordem de idsEventos", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirEvento(eventoVenda("VEN-001", "PED-000001", 100));
    repositorio.inserirEvento(
      eventoPagamento("PAG-001", "PED-000001", 100, "2024-01-02T10:00:00Z"),
    );
    repositorio.inserirEvento(
      eventoPagamento("PAG-002", "PED-000001", 100, "2024-01-03T10:00:00Z"),
    );

    const linhas = montarDivergencias(repositorio.db, DATA_CORTE);

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ tipo: "duplicado", id_pedido: "PED-000001" });
    expect(typeof linhas[0].motivo).toBe("string");
    expect(linhas[0].motivo.length).toBeGreaterThan(0);

    const eventosSustentacao = JSON.parse(linhas[0].eventos);
    expect(eventosSustentacao).toEqual([
      { tipo: "pagamento", data: "2024-01-02T10:00:00Z", fonte: "pagamentos", codigo: "PAG-001" },
      { tipo: "pagamento", data: "2024-01-03T10:00:00Z", fonte: "pagamentos", codigo: "PAG-002" },
    ]);
  });

  it("pedido sem divergência não gera nenhuma linha", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000002");
    repositorio.inserirEvento(eventoVenda("VEN-002", "PED-000002", 100));
    repositorio.inserirEvento(
      eventoPagamento("PAG-003", "PED-000002", 100, "2024-01-02T10:00:00Z"),
    );

    const linhas = montarDivergencias(repositorio.db, DATA_CORTE);

    expect(linhas).toHaveLength(0);
  });

  it("2 pedidos com o mesmo tipo de divergência são ordenados por id_pedido", () => {
    const repositorio = criarRepositorio(":memory:");

    repositorio.inserirPedido("PED-000009");
    repositorio.inserirEvento(eventoVenda("VEN-009", "PED-000009", 50));
    repositorio.inserirEvento(
      eventoPagamento("PAG-009A", "PED-000009", 50, "2024-01-02T10:00:00Z"),
    );
    repositorio.inserirEvento(
      eventoPagamento("PAG-009B", "PED-000009", 50, "2024-01-03T10:00:00Z"),
    );

    repositorio.inserirPedido("PED-000003");
    repositorio.inserirEvento(eventoVenda("VEN-003", "PED-000003", 50));
    repositorio.inserirEvento(
      eventoPagamento("PAG-003A", "PED-000003", 50, "2024-01-02T10:00:00Z"),
    );
    repositorio.inserirEvento(
      eventoPagamento("PAG-003B", "PED-000003", 50, "2024-01-03T10:00:00Z"),
    );

    const linhas = montarDivergencias(repositorio.db, DATA_CORTE);

    expect(linhas.map((linha) => linha.id_pedido)).toEqual(["PED-000003", "PED-000009"]);
  });

  it("é determinístico: mesma entrada 2x produz a mesma ordem e os mesmos bytes do JSON", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirEvento(eventoVenda("VEN-001", "PED-000001", 100));
    repositorio.inserirEvento(
      eventoPagamento("PAG-001", "PED-000001", 100, "2024-01-02T10:00:00Z"),
    );
    repositorio.inserirEvento(
      eventoPagamento("PAG-002", "PED-000001", 100, "2024-01-03T10:00:00Z"),
    );

    const primeira = montarDivergencias(repositorio.db, DATA_CORTE);
    const segunda = montarDivergencias(repositorio.db, DATA_CORTE);

    expect(segunda).toEqual(primeira);
    expect(segunda[0].eventos).toBe(primeira[0].eventos);
  });
});
