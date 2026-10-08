import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  escreverSqlPublicacao,
  type TabelasParaPublicacao,
} from "../../src/publicacao/escritor-sql.js";

/**
 * TP-0040 — Testa o escritor do `leitura.sql`: serialização de DDL + INSERT
 * a partir de linhas já montadas por tabela.
 */

const CAMINHO_DDL = join(import.meta.dirname, "../../src/publicacao/leitura-d1.sql");

function lerDdl(): string {
  return readFileSync(CAMINHO_DDL, "utf8");
}

function tabelasVazias(): TabelasParaPublicacao {
  return {
    pedido_resumo: [],
    vinculo_codigo: [],
    linha_do_tempo: [],
    divergencia: [],
    documento: [],
  };
}

describe("escreverSqlPublicacao — valores inválidos (RTP-0037)", () => {
  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["objeto", { a: 1 }],
    ["array", [1, 2]],
  ])("rejeita %s com erro claro", (_nome, valor) => {
    const tabelas = tabelasVazias();
    tabelas.documento = [{ chave: "k", conteudo: valor }];
    expect(() => escreverSqlPublicacao("", tabelas)).toThrow(/valor não suportado/);
  });

  it("valores válidos seguem inalterados", () => {
    const tabelas = tabelasVazias();
    tabelas.documento = [{ chave: "o'k", conteudo: null }];
    expect(escreverSqlPublicacao("", tabelas)).toContain("('o''k', NULL)");
  });
});

describe("escreverSqlPublicacao", () => {
  it("tabela com poucas linhas gera um único INSERT", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.pedido_resumo = [
      {
        id_pedido: "PED-000001",
        valor_devido: 100,
        valor_pago: 100,
        data_limite: "2026-01-01",
        situacao_pagamento: "pago",
        fontes: "{}",
      },
      {
        id_pedido: "PED-000002",
        valor_devido: 50,
        valor_pago: 0,
        data_limite: "2026-01-02",
        situacao_pagamento: "pendente",
        fontes: "{}",
      },
    ];

    const sql = escreverSqlPublicacao(ddl, tabelas);

    const ocorrencias = sql.match(/INSERT INTO pedido_resumo/g) ?? [];
    expect(ocorrencias.length).toBe(1);
    expect(sql).toContain("('PED-000001', 100, 100, '2026-01-01', 'pago', '{}')");
    expect(sql).toContain("('PED-000002', 50, 0, '2026-01-02', 'pendente', '{}')");
    expect(sql.startsWith(ddl)).toBe(true);
  });

  it("tabela com linhas o bastante para passar de 100 KB gera múltiplos INSERT, cada um <= 100 KB", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();

    // Cada linha de `documento` tem um `conteudo` de ~2 KB: 80 linhas somam
    // ~160 KB de tuplas, o bastante para forçar quebra em mais de 1 INSERT
    // dentro do limite de 100 KB por instrução.
    const conteudoLongo = "x".repeat(2_000);
    const linhas = Array.from({ length: 80 }, (_, indice) => ({
      chave: `DOC-${String(indice).padStart(4, "0")}`,
      conteudo: conteudoLongo,
    }));
    tabelas.documento = linhas;

    const sql = escreverSqlPublicacao(ddl, tabelas);

    const instrucoes = sql.match(/INSERT INTO documento[^;]*;/gs) ?? [];
    expect(instrucoes.length).toBeGreaterThan(1);
    for (const instrucao of instrucoes) {
      expect(Buffer.byteLength(instrucao, "utf8")).toBeLessThanOrEqual(100_000);
    }

    // Nenhuma linha se perde nem é duplicada ao longo das instruções quebradas.
    const totalChaves = (sql.match(/'DOC-\d{4}'/g) ?? []).length;
    expect(totalChaves).toBe(80);
  });

  it("escapa aspas simples em valores string", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.documento = [{ chave: "DOC-0001", conteudo: "O'Brien" }];

    const sql = escreverSqlPublicacao(ddl, tabelas);

    expect(sql).toContain("'O''Brien'");
  });

  it("valor null/undefined grava NULL sem aspas", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.pedido_resumo = [
      {
        id_pedido: "PED-000001",
        valor_devido: null,
        valor_pago: 0,
        data_limite: undefined,
        situacao_pagamento: "pendente",
        fontes: "{}",
      },
    ];

    const sql = escreverSqlPublicacao(ddl, tabelas);

    expect(sql).toContain("('PED-000001', NULL, 0, NULL, 'pendente', '{}')");
  });

  it("nunca inclui BEGIN nem COMMIT como instrução (fora da parte de DDL recebida verbatim)", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.documento = [{ chave: "DOC-0001", conteudo: "abc" }];

    const sql = escreverSqlPublicacao(ddl, tabelas);

    // O escritor só é responsável pela parte de INSERT que ele mesmo gera —
    // o DDL é recebido verbatim de `leitura-d1.sql` (TP-0032) e pode conter
    // as palavras "BEGIN"/"COMMIT" em comentários de documentação (como de
    // fato contém, explicando por que o DDL não usa transação). O que o
    // critério de aceite exige é que o escritor nunca emita essas
    // instruções por conta própria.
    const parteGerada = sql.slice(ddl.length);

    expect(parteGerada).not.toMatch(/\bBEGIN\b/i);
    expect(parteGerada).not.toMatch(/\bCOMMIT\b/i);
  });

  it("é determinístico: mesma entrada produz a mesma string byte a byte", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.vinculo_codigo = [
      { codigo: "VENDA-001", fonte: "vendas", id_pedido: "PED-000001" },
      { codigo: "PAG-001", fonte: "pagamentos", id_pedido: "PED-000001" },
    ];

    const sql1 = escreverSqlPublicacao(ddl, tabelas);
    const sql2 = escreverSqlPublicacao(ddl, tabelas);

    expect(sql1).toBe(sql2);
  });

  it("não reordena as linhas recebidas", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.vinculo_codigo = [
      { codigo: "Z-CODIGO", fonte: "vendas", id_pedido: "PED-000001" },
      { codigo: "A-CODIGO", fonte: "vendas", id_pedido: "PED-000002" },
    ];

    const sql = escreverSqlPublicacao(ddl, tabelas);

    const posicaoZ = sql.indexOf("Z-CODIGO");
    const posicaoA = sql.indexOf("A-CODIGO");
    expect(posicaoZ).toBeGreaterThanOrEqual(0);
    expect(posicaoA).toBeGreaterThan(posicaoZ);
  });

  it("ida e volta: SQL gerado carregado em node:sqlite devolve as mesmas linhas (pedido_resumo e vinculo_codigo)", () => {
    const ddl = lerDdl();
    const tabelas = tabelasVazias();
    tabelas.pedido_resumo = [
      {
        id_pedido: "PED-000001",
        valor_devido: 100.5,
        valor_pago: 100.5,
        data_limite: "2026-01-01",
        situacao_pagamento: "pago",
        fontes: "{\"vendas\":\"V1\"}",
      },
      {
        id_pedido: "PED-000002",
        valor_devido: null,
        valor_pago: 0,
        data_limite: null,
        situacao_pagamento: "pendente",
        fontes: "{}",
      },
    ];
    tabelas.vinculo_codigo = [
      { codigo: "VENDA-001", fonte: "vendas", id_pedido: "PED-000001" },
      { codigo: "PED-000001", fonte: "pedido", id_pedido: "PED-000001" },
    ];

    const sql = escreverSqlPublicacao(ddl, tabelas);

    const db = new DatabaseSync(":memory:");
    db.exec(sql);

    const linhasPedidoResumo = db
      .prepare("SELECT id_pedido, valor_devido, valor_pago, data_limite, situacao_pagamento, fontes FROM pedido_resumo ORDER BY id_pedido")
      .all();

    expect(linhasPedidoResumo).toEqual([
      {
        id_pedido: "PED-000001",
        valor_devido: 100.5,
        valor_pago: 100.5,
        data_limite: "2026-01-01",
        situacao_pagamento: "pago",
        fontes: "{\"vendas\":\"V1\"}",
      },
      {
        id_pedido: "PED-000002",
        valor_devido: null,
        valor_pago: 0,
        data_limite: null,
        situacao_pagamento: "pendente",
        fontes: "{}",
      },
    ]);

    const linhasVinculoCodigo = db
      .prepare("SELECT codigo, fonte, id_pedido FROM vinculo_codigo ORDER BY codigo")
      .all();

    expect(linhasVinculoCodigo).toEqual([
      { codigo: "PED-000001", fonte: "pedido", id_pedido: "PED-000001" },
      { codigo: "VENDA-001", fonte: "vendas", id_pedido: "PED-000001" },
    ]);
  });
});
