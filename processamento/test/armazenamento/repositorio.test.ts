import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { criarRepositorio } from "../../src/armazenamento/repositorio.js";

const CAMINHO_SCHEMA = join(
  import.meta.dirname,
  "../../src/armazenamento/schema.sql",
);

describe("schema.sql (DDL idempotente)", () => {
  it("pode ser aplicado 2x seguidas na mesma conexão sem erro", () => {
    const repositorio = criarRepositorio(":memory:");
    const sqlSchema = readFileSync(CAMINHO_SCHEMA, "utf8");

    expect(() => {
      repositorio.db.exec(sqlSchema);
    }).not.toThrow();
  });
});

describe("inserirPedido", () => {
  it("pedido novo devolve nova: true", () => {
    const repositorio = criarRepositorio(":memory:");

    expect(repositorio.inserirPedido("PED-000001")).toEqual({ nova: true });
  });

  it("o mesmo id_pedido inserido de novo devolve nova: false, sem lançar exceção", () => {
    const repositorio = criarRepositorio(":memory:");

    repositorio.inserirPedido("PED-000001");

    expect(() => repositorio.inserirPedido("PED-000001")).not.toThrow();
    expect(repositorio.inserirPedido("PED-000001")).toEqual({ nova: false });
  });
});

describe("inserirVinculoFonte", () => {
  it("par (fonte, codigo_externo) distinto é novo", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000001");

    const resultado = repositorio.inserirVinculoFonte(
      "vendas",
      "VENDA-001",
      "PED-000001",
    );

    expect(resultado).toEqual({ nova: true });
  });

  it("o mesmo par (fonte, codigo_externo) repetido é já existente", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirVinculoFonte("vendas", "VENDA-001", "PED-000001");

    const resultado = repositorio.inserirVinculoFonte(
      "vendas",
      "VENDA-001",
      "PED-000001",
    );

    expect(resultado).toEqual({ nova: false });
  });

  it("mesma fonte com codigo_externo diferente é novo (não conflita)", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirPedido("PED-000002");
    repositorio.inserirVinculoFonte("vendas", "VENDA-001", "PED-000001");

    const resultado = repositorio.inserirVinculoFonte(
      "vendas",
      "VENDA-002",
      "PED-000002",
    );

    expect(resultado).toEqual({ nova: true });
  });
});

describe("inserirEvento", () => {
  it("evento com (fonte, codigo_evento) repetido não duplica a linha", () => {
    const repositorio = criarRepositorio(":memory:");
    const evento = {
      fonte: "vendas" as const,
      codigoEvento: "VENDA-001",
      idPedido: "PED-000001",
      tipo: "venda",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 1,
      versaoSchema: 1,
      dados: JSON.stringify({ valor_devido: 100 }),
    };

    const primeiro = repositorio.inserirEvento(evento);
    const segundo = repositorio.inserirEvento(evento);

    expect(primeiro).toEqual({ nova: true });
    expect(segundo).toEqual({ nova: false });

    const linha = repositorio.db
      .prepare(
        `SELECT COUNT(*) AS total FROM evento WHERE fonte = ? AND codigo_evento = ?`,
      )
      .get(evento.fonte, evento.codigoEvento) as { total: number };

    expect(linha.total).toBe(1);
  });

  it("aceita id_pedido nulo (pagamento sem identificação), sem erro", () => {
    const repositorio = criarRepositorio(":memory:");

    const resultado = repositorio.inserirEvento({
      fonte: "pagamentos",
      codigoEvento: "PAG-999",
      idPedido: null,
      tipo: "pagamento",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: null,
      versaoSchema: 1,
      dados: JSON.stringify({ valor: 50 }),
    });

    expect(resultado).toEqual({ nova: true });

    const linha = repositorio.db
      .prepare(`SELECT id_pedido FROM evento WHERE codigo_evento = ?`)
      .get("PAG-999") as { id_pedido: string | null };

    expect(linha.id_pedido).toBeNull();
  });
});

describe("inserirAchadoQualidade", () => {
  it("achado duplicado por (tipo, fonte, referencia) não duplica", () => {
    const repositorio = criarRepositorio(":memory:");
    const achado = {
      tipo: "sem_identificacao" as const,
      fonte: "pagamentos" as const,
      referencia: "PAG-999",
      regra: "RN-identificacao",
      detalhe: "Pagamento sem referência original.",
    };

    const primeiro = repositorio.inserirAchadoQualidade(achado);
    const segundo = repositorio.inserirAchadoQualidade(achado);

    expect(primeiro).toEqual({ nova: true });
    expect(segundo).toEqual({ nova: false });

    const linha = repositorio.db
      .prepare(
        `SELECT COUNT(*) AS total FROM achado_qualidade WHERE tipo = ? AND fonte = ? AND referencia = ?`,
      )
      .get(achado.tipo, achado.fonte, achado.referencia) as { total: number };

    expect(linha.total).toBe(1);
  });
});
