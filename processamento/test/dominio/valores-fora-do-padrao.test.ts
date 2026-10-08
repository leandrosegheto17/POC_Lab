import { describe, expect, it } from "vitest";
import {
  verificarItemPedido,
  verificarPagamento,
  type ItemPedidoParaValidacao,
} from "../../src/dominio/valores-fora-do-padrao.js";

describe("verificarItemPedido (RN-10)", () => {
  it("item válido (preço > 0, quantidade > 0, desconto em [0,1]) retorna null", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 10,
      quantidade: 2,
      desconto: 0.5,
    };

    expect(verificarItemPedido(item)).toBeNull();
  });

  it("preço igual a zero gera achado citando o preço", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 0,
      quantidade: 2,
      desconto: 0,
    };

    const resultado = verificarItemPedido(item);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("0");
    expect(resultado?.regra).toContain("RN-10");
  });

  it("preço negativo gera achado citando o preço", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: -5,
      quantidade: 2,
      desconto: 0,
    };

    const resultado = verificarItemPedido(item);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("-5");
  });

  it("quantidade ≤ 0 gera achado citando a quantidade", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 10,
      quantidade: 0,
      desconto: 0,
    };

    const resultado = verificarItemPedido(item);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("0");
  });

  it("desconto < 0 gera achado citando o desconto", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 10,
      quantidade: 2,
      desconto: -0.1,
    };

    const resultado = verificarItemPedido(item);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("-0.1");
  });

  it("desconto > 1 gera achado citando o desconto", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 10,
      quantidade: 2,
      desconto: 1.5,
    };

    const resultado = verificarItemPedido(item);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("1.5");
  });

  it("desconto exatamente 0 é válido (fronteira inclusiva)", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 10,
      quantidade: 2,
      desconto: 0,
    };

    expect(verificarItemPedido(item)).toBeNull();
  });

  it("desconto exatamente 1 é válido (fronteira inclusiva)", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: 10,
      quantidade: 2,
      desconto: 1,
    };

    expect(verificarItemPedido(item)).toBeNull();
  });

  it("consolida múltiplas violações num único achado com todos os detalhes", () => {
    const item: ItemPedidoParaValidacao = {
      precoUnitario: -5,
      quantidade: 0,
      desconto: 2,
    };

    const resultado = verificarItemPedido(item);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("-5");
    expect(resultado?.detalhe).toContain("2");
    // confirma que as três violações estão presentes no mesmo detalhe
    const partes = resultado?.detalhe.split(";") ?? [];
    expect(partes.length).toBe(3);
  });
});

describe("verificarPagamento (RN-10)", () => {
  it("pagamento válido (0 < valor <= 2× devido) retorna null", () => {
    expect(verificarPagamento(100, 100)).toBeNull();
  });

  it("pagamento ≤ 0 gera achado citando o valor do pagamento", () => {
    const resultado = verificarPagamento(0, 100);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("0");
    expect(resultado?.regra).toContain("RN-10");
  });

  it("pagamento negativo gera achado citando o valor do pagamento", () => {
    const resultado = verificarPagamento(-10, 100);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("-10");
  });

  it("pagamento maior que 2× devido gera achado citando os valores", () => {
    const resultado = verificarPagamento(201, 100);

    expect(resultado).not.toBeNull();
    expect(resultado?.detalhe).toContain("201");
    expect(resultado?.detalhe).toContain("100");
  });

  it("pagamento exatamente 2× devido é válido (fronteira inclusiva)", () => {
    expect(verificarPagamento(200, 100)).toBeNull();
  });

  it("consolida pagamento ≤ 0 e acima de 2× devido num único achado quando ambos ocorrem", () => {
    // devido negativo faz o limite (2× devido) ficar negativo também,
    // então um pagamento <= 0 pode simultaneamente violar as duas condições
    const resultado = verificarPagamento(0, -50);

    expect(resultado).not.toBeNull();
    const partes = resultado?.detalhe.split(";") ?? [];
    expect(partes.length).toBe(2);
  });
});
