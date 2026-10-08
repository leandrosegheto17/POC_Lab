import { describe, expect, it } from "vitest";
import { processarPagamentos } from "../../src/fontes/pagamentos.js";

describe("processarPagamentos (RF-02, RN-09, RN-10)", () => {
  it("linha válida com referência que casa exatamente 1 código gera vínculo e evento pagamento v1", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-001,PV-000123,150.5,2024-01-15
`;
    const codigosConhecidos = new Set(["123"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.achados).toEqual([]);
    expect(resultado.vinculos).toEqual([
      { fonte: "pagamentos", codigoExterno: "TX-001", idPedido: "123" },
    ]);
    expect(resultado.eventos).toEqual([
      {
        fonte: "pagamentos",
        codigoEvento: "TX-001",
        momentoFato: new Date("2024-01-15").toISOString(),
        tipo: "pagamento",
        versao_schema: 1,
        valor: 150.5,
        referencia_original: "PV-000123",
      },
    ]);
  });

  it("codigo_transacao repetido gera achado registro_repetido e não duplica vínculo/evento", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-001,PV-000123,150.5,2024-01-15
TX-001,PV-000123,150.5,2024-01-16
`;
    const codigosConhecidos = new Set(["123"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.vinculos).toHaveLength(1);
    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "registro_repetido",
        fonte: "pagamentos",
        referencia: "TX-001",
      }),
    ]);
  });

  it("linha malformada (valor não numérico) gera achado linha_invalida e não interrompe as demais linhas", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-001,PV-000123,abc,2024-01-15
TX-002,PV-000456,200,2024-01-16
`;
    const codigosConhecidos = new Set(["123", "456"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "linha_invalida",
        fonte: "pagamentos",
        referencia: "TX-001",
      }),
    ]);
    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.eventos[0]).toMatchObject({
      codigoEvento: "TX-002",
      valor: 200,
    });
    expect(resultado.vinculos).toEqual([
      { fonte: "pagamentos", codigoExterno: "TX-002", idPedido: "456" },
    ]);
  });

  it("linha malformada (coluna faltando) gera achado linha_invalida e não interrompe as demais linhas", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-003,PV-000789
TX-004,PV-000456,200,2024-01-16
`;
    const codigosConhecidos = new Set(["789", "456"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "linha_invalida",
        fonte: "pagamentos",
        referencia: "TX-003",
      }),
    ]);
    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.eventos[0]).toMatchObject({ codigoEvento: "TX-004" });
  });

  it("referência em texto livre (sem casamento) gera achado sem_identificacao e evento sem vínculo", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-005,pagamento via boleto,100,2024-01-15
`;
    const codigosConhecidos = new Set(["123"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.vinculos).toEqual([]);
    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.eventos[0]).toMatchObject({
      codigoEvento: "TX-005",
      referencia_original: "pagamento via boleto",
    });
    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "sem_identificacao",
        fonte: "pagamentos",
        referencia: "TX-005",
      }),
    ]);
  });

  it("referência com dois códigos conhecidos simultâneos também gera sem_identificacao", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-006,PV-000123 PV-000456,100,2024-01-15
`;
    const codigosConhecidos = new Set(["123", "456"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.vinculos).toEqual([]);
    expect(resultado.achados).toEqual([
      expect.objectContaining({
        tipo: "sem_identificacao",
        fonte: "pagamentos",
        referencia: "TX-006",
      }),
    ]);
  });

  it("pagamento com valor menor ou igual a zero gera achado de valor fora do padrão", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento
TX-007,PV-000123,0,2024-01-15
TX-008,PV-000123,-50,2024-01-16
`;
    const codigosConhecidos = new Set(["123"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    const achadosValor = resultado.achados.filter(
      (achado) => achado.tipo === "valor_fora_do_padrao",
    );
    expect(achadosValor).toHaveLength(2);
    expect(achadosValor[0]).toMatchObject({
      fonte: "pagamentos",
      referencia: "TX-007",
    });
    expect(achadosValor[1]).toMatchObject({
      fonte: "pagamentos",
      referencia: "TX-008",
    });
    // Ambas ainda devem ter a referência resolvida normalmente, pois valor
    // fora do padrão não impede a resolução de RN-09.
    expect(resultado.vinculos).toHaveLength(2);
  });

  it("linha com meio_pagamento preenchido gera evento pagamento v2 com o campo (TP-0075)", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento,meio_pagamento
TX-009,PV-000123,150.5,2024-01-15,pix
`;
    const codigosConhecidos = new Set(["123"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.achados).toEqual([]);
    expect(resultado.eventos).toEqual([
      {
        fonte: "pagamentos",
        codigoEvento: "TX-009",
        momentoFato: new Date("2024-01-15").toISOString(),
        tipo: "pagamento",
        versao_schema: 2,
        valor: 150.5,
        referencia_original: "PV-000123",
        meio_pagamento: "pix",
      },
    ]);
  });

  it("linha com meio_pagamento vazio (coluna presente, sem valor) gera evento pagamento v1 sem o campo (TP-0075)", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento,meio_pagamento
TX-010,PV-000123,150.5,2024-01-15,
`;
    const codigosConhecidos = new Set(["123"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.achados).toEqual([]);
    expect(resultado.eventos).toEqual([
      {
        fonte: "pagamentos",
        codigoEvento: "TX-010",
        momentoFato: new Date("2024-01-15").toISOString(),
        tipo: "pagamento",
        versao_schema: 1,
        valor: 150.5,
        referencia_original: "PV-000123",
      },
    ]);
    expect(resultado.eventos[0]).not.toHaveProperty("meio_pagamento");
  });

  it("CSV misto (algumas linhas com meio_pagamento, outras sem) gera a versão correta para cada linha sem erro (TP-0075)", () => {
    const csv = `codigo_transacao,referencia,valor,data_pagamento,meio_pagamento
TX-011,PV-000123,100,2024-01-15,boleto
TX-012,PV-000456,200,2024-01-16,
TX-013,PV-000789,300,2024-01-17,cartao
`;
    const codigosConhecidos = new Set(["123", "456", "789"]);

    const resultado = processarPagamentos(csv, codigosConhecidos);

    expect(resultado.achados).toEqual([]);
    expect(resultado.eventos).toHaveLength(3);
    expect(resultado.eventos[0]).toMatchObject({
      codigoEvento: "TX-011",
      versao_schema: 2,
      meio_pagamento: "boleto",
    });
    expect(resultado.eventos[1]).toMatchObject({ codigoEvento: "TX-012", versao_schema: 1 });
    expect(resultado.eventos[1]).not.toHaveProperty("meio_pagamento");
    expect(resultado.eventos[2]).toMatchObject({
      codigoEvento: "TX-013",
      versao_schema: 2,
      meio_pagamento: "cartao",
    });
  });
});
