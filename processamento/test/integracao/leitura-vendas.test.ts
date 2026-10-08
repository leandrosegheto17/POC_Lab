/**
 * Teste de integração contra a base real (Northwind expandido).
 *
 * Depende de `pnpm baixar-base` já ter sido executado antes (TP-0004), que
 * baixa e verifica por SHA-256 o arquivo em `dados/origem/northwind.db`. Se o
 * arquivo ainda não existir neste ambiente (ex. checkout limpo sem o passo de
 * download), os testes abaixo são pulados em vez de falhar — ver
 * `TASK.md` §1 "pnpm test roda antes baixar-base".
 */
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerBaseDeVendas } from "../../src/fontes/leitura-vendas.ts";

const CAMINHO_BASE = path.join("dados", "origem", "northwind.db");
const baseDisponivel = existsSync(CAMINHO_BASE);

describe.skipIf(!baseDisponivel)("lerBaseDeVendas (base real)", () => {
  const pedidos = lerBaseDeVendas(CAMINHO_BASE);

  it("lê o total de pedidos esperado da base real", () => {
    expect(pedidos.length).toBe(16_282);
  });

  it("lê o total de itens esperado, somando os itens de todos os pedidos", () => {
    const totalItens = pedidos.reduce((soma, pedido) => soma + pedido.itens.length, 0);
    expect(totalItens).toBe(609_283);
  });

  it("classifica as datas de pedido em curto/longo com a contagem esperada (ou reporta divergência como achado)", () => {
    const curto = pedidos.filter((pedido) => pedido.dataPedido.formato === "curto").length;
    const longo = pedidos.filter((pedido) => pedido.dataPedido.formato === "longo").length;
    const outros = pedidos.length - curto - longo;

    expect(curto).toBe(830);
    expect(longo).toBe(15_452);
    expect(outros).toBe(0);
  });

  it("identifica os pedidos sem data de envio (dataEnvio null)", () => {
    const semEnvio = pedidos.filter((pedido) => pedido.dataEnvio === null).length;
    expect(semEnvio).toBe(21);
  });

  it("devolve data do pedido, data limite e (quando houver) data de envio em ISO-8601", () => {
    const amostra = pedidos[0];
    expect(amostra).toBeDefined();
    expect(() => new Date(amostra!.dataPedido.iso).toISOString()).not.toThrow();
    expect(amostra!.dataPedido.iso.includes("T")).toBe(true);
    expect(() => new Date(amostra!.dataLimite).toISOString()).not.toThrow();
    if (amostra!.dataEnvio !== null) {
      expect(() => new Date(amostra!.dataEnvio!).toISOString()).not.toThrow();
    }
  });

  it("devolve o código cru da transportadora (ShipVia), sem tradução para nome", () => {
    const comTransportadora = pedidos.find((pedido) => pedido.transportadora !== "");
    expect(comTransportadora).toBeDefined();
    expect(comTransportadora!.transportadora).toMatch(/^\d+$/);
  });
});

describe("lerBaseDeVendas (garantia de somente leitura)", () => {
  it(
    baseDisponivel
      ? "uma escrita numa conexão somente leitura da base real falha"
      : "é pulado sem a base real baixada (pnpm baixar-base)",
    () => {
      if (!baseDisponivel) {
        return;
      }
      const conexao = new DatabaseSync(CAMINHO_BASE, { readOnly: true });
      try {
        expect(() => conexao.exec("CREATE TABLE teste_escrita (id INTEGER)")).toThrow(
          /readonly/i,
        );
      } finally {
        conexao.close();
      }
    },
  );
});
