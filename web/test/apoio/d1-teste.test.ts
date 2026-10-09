// Testes do adaptador de teste `D1Teste` (sobre `node:sqlite`) e
// da fixture `criarD1Teste`: confirma a semântica D1 de `first`/`all`/`run`
// e que o dataset de exemplo cobre os 4 cenários pedidos (pedido sem
// divergência, pedido com divergência, múltiplas divergências para
// paginação futura, e código alternativo apontando para o mesmo id_pedido).
import { describe, expect, it } from "vitest";

import { criarD1Teste } from "./fixture.js";

describe("criarD1Teste / D1Teste", () => {
  it("ida e volta: o SQL gerado pela fixture carrega sem erro em node:sqlite", () => {
    expect(() => criarD1Teste()).not.toThrow();
  });

  it("first() devolve a linha esperada para um id_pedido existente", () => {
    const db = criarD1Teste();

    const linha = db
      .prepare("SELECT * FROM pedido_resumo WHERE id_pedido = ?")
      .bind("PED-000001")
      .first();

    expect(linha).toEqual({
      id_pedido: "PED-000001",
      valor_devido: 100,
      valor_pago: 100,
      data_limite: "2026-01-10",
      situacao_pagamento: "pago",
      fontes: "{\"vendas\":\"VENDA-0001\",\"pagamentos\":\"PAG-0001\"}",
    });
  });

  it("first() devolve null quando nenhuma linha bate", () => {
    const db = criarD1Teste();

    const linha = db
      .prepare("SELECT * FROM pedido_resumo WHERE id_pedido = ?")
      .bind("PED-999999")
      .first();

    expect(linha).toBeNull();
  });

  it("all() devolve { results: [...] } com múltiplas linhas", () => {
    const db = criarD1Teste();

    const pagina = db.prepare("SELECT * FROM divergencia").all();

    expect(Array.isArray(pagina.results)).toBe(true);
    expect(pagina.results.length).toBeGreaterThan(1);
  });

  it("run() numa instrução simples não lança erro", () => {
    const db = criarD1Teste();

    expect(() => {
      db.prepare("DELETE FROM documento WHERE chave = ?").bind("DOC-0001").run();
    }).not.toThrow();
  });

  it("cenário: 1 pedido sem divergência (PED-000001 não aparece em divergencia)", () => {
    const db = criarD1Teste();

    const pagina = db
      .prepare("SELECT * FROM divergencia WHERE id_pedido = ?")
      .bind("PED-000001")
      .all();

    expect(pagina.results).toEqual([]);
  });

  it("cenário: 1 pedido com divergência e múltiplas linhas (paginação futura)", () => {
    const db = criarD1Teste();

    const pagina = db
      .prepare("SELECT * FROM divergencia WHERE id_pedido = ?")
      .bind("PED-000002")
      .all();

    expect(pagina.results.length).toBeGreaterThanOrEqual(2);
    const tipos = pagina.results.map((linha) => linha["tipo"]);
    expect(new Set(tipos).size).toBe(tipos.length); // PK (tipo, id_pedido): tipos distintos
  });

  it("cenário: código alternativo em vinculo_codigo aponta para o mesmo id_pedido do PED-", () => {
    const db = criarD1Teste();

    const pagina = db
      .prepare("SELECT * FROM vinculo_codigo WHERE id_pedido = ? ORDER BY codigo")
      .bind("PED-000001")
      .all();

    expect(pagina.results).toEqual([
      { codigo: "PED-000001", fonte: "pedido", id_pedido: "PED-000001" },
      { codigo: "VENDA-0001", fonte: "vendas", id_pedido: "PED-000001" },
    ]);
  });
});
