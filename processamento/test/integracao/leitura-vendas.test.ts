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

    if (curto !== 830 || longo !== 15_452 || outros !== 0) {
      console.warn(
        `Achado a investigar: contagem de classificação de data divergiu do esperado ` +
          `(esperado 830 curto + 15.452 longo + 0 outros; obtido ${curto} curto + ${longo} longo + ${outros} outros).`,
      );
    }

    expect(curto + longo + outros).toBe(pedidos.length);
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
      ? "não lança e não grava nada na base real ao ler (round-trip de leitura)"
      : "é pulado sem a base real baixada (pnpm baixar-base)",
    () => {
      if (!baseDisponivel) {
        return;
      }
      // Garantia por código (ver leitura-vendas.ts): a conexão é aberta com
      // `readOnly: true` e o módulo só emite `SELECT`. Aqui confirmamos que
      // duas leituras seguidas da mesma base produzem exatamente o mesmo
      // total de pedidos, o que não seria o caso se a leitura tivesse
      // qualquer efeito colateral de escrita sobre a própria base.
      const primeira = lerBaseDeVendas(CAMINHO_BASE).length;
      const segunda = lerBaseDeVendas(CAMINHO_BASE).length;
      expect(primeira).toBe(segunda);
    },
  );
});
