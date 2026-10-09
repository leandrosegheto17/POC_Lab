import type { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { abrirRepositorioParaTeste } from "../../src/armazenamento/repositorio-teste.js";
import { importar } from "../../src/importacao/importar.js";
import type { PedidoVendas } from "../../src/fontes/leitura-vendas.js";
import { obrigatorio } from "apoio-teste/obrigatorio.js";

/** Pedido de vendas mínimo válido (sem achado de qualidade: formato curto, com data de envio). */
function criarPedidoVendas(idPedido: string, transportadora = "1"): PedidoVendas {
  return {
    idPedido,
    itens: [{ precoUnitario: 10, quantidade: 1, desconto: 0 }],
    dataPedido: { iso: "2026-01-01T00:00:00.000Z", formato: "curto" },
    dataEnvio: "2026-01-02T00:00:00.000Z",
    dataLimite: "2026-01-10T00:00:00.000Z",
    transportadora,
  };
}

const CABECALHO_PAGAMENTOS = "codigo_transacao,referencia,valor,data_pagamento";
const CABECALHO_RASTREIO =
  "codigo_evento,codigo_rastreio,pedido_venda,tipo,momento_fato,transportadora";

// Uma função por tabela (em vez de receber o nome como parâmetro) porque
// `prepare()` nunca pode receber template literal com expressão interpolada
// (G-08, prevenção de SQL injection — `eslint.config.js`), mesmo em teste.
function contarPedidos(db: DatabaseSync): number {
  const linha = db.prepare(`SELECT COUNT(*) AS total FROM pedido`).get() as { total: number };
  return linha.total;
}

function contarVinculosFonte(db: DatabaseSync): number {
  const linha = db.prepare(`SELECT COUNT(*) AS total FROM vinculo_fonte`).get() as {
    total: number;
  };
  return linha.total;
}

function contarEventos(db: DatabaseSync): number {
  const linha = db.prepare(`SELECT COUNT(*) AS total FROM evento`).get() as { total: number };
  return linha.total;
}

describe("importar", () => {
  describe("validação: idempotência", () => {
    it("importa vendas/pagamentos/rastreio, atribui PED-nnnnnn na ordem certa e repete as mesmas contagens numa 2ª chamada", () => {
      const { repositorio, db } = abrirRepositorioParaTeste(":memory:");

      // Lista em ordem NÃO crescente de propósito: a atribuição de
      // PED-nnnnnn deve seguir o código de vendas crescente ("1" primeiro),
      // não a ordem da lista.
      const vendas: PedidoVendas[] = [
        criarPedidoVendas("2"),
        criarPedidoVendas("1"),
        criarPedidoVendas("3"),
      ];

      const pagamentosCsv = [
        CABECALHO_PAGAMENTOS,
        "TX-1,PV-000001,10,2026-01-01",
        "TX-2,SEM-CODIGO-CONHECIDO,20,2026-01-02",
      ].join("\n");

      const rastreioCsv = [
        CABECALHO_RASTREIO,
        "EVT-1,RS-1,2,coleta,2026-01-01T10:00:00Z,Transportadora X",
      ].join("\n");

      const codigosConhecidos = new Set(["1", "2", "3"]);

      const dados = { vendas, pagamentosCsv, rastreioCsv, codigosConhecidos };

      const relatorio1 = importar(repositorio, dados);

      expect(relatorio1.vendas).toEqual({
        lidas: 3,
        novas: 3,
        jaExistentes: 0,
        rejeitadas: 0,
      });
      expect(relatorio1.rastreio).toEqual({
        lidas: 1,
        novas: 1,
        jaExistentes: 0,
        rejeitadas: 0,
      });
      expect(relatorio1.pagamentos).toEqual({
        lidas: 2,
        novas: 1,
        jaExistentes: 0,
        rejeitadas: 0,
      });

      // PED-000001 atribuído ao 1º código de vendas em ordem crescente ("1"),
      // não ao 1º da lista ("2").
      const vinculoCodigo1 = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'vendas' AND codigo_externo = '1'`,
        )
        .get() as { id_pedido: string };
      const vinculoCodigo2 = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'vendas' AND codigo_externo = '2'`,
        )
        .get() as { id_pedido: string };
      const vinculoCodigo3 = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'vendas' AND codigo_externo = '3'`,
        )
        .get() as { id_pedido: string };

      expect(vinculoCodigo1.id_pedido).toBe("PED-000001");
      expect(vinculoCodigo2.id_pedido).toBe("PED-000002");
      expect(vinculoCodigo3.id_pedido).toBe("PED-000003");

      // Rastreio referenciando pedido_venda "2" aponta para o mesmo
      // id_pedido que vendas atribuiu ao código "2".
      const vinculoRastreio = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'rastreio' AND codigo_externo = 'RS-1'`,
        )
        .get() as { id_pedido: string };
      expect(vinculoRastreio.id_pedido).toBe("PED-000002");

      // Pagamento sem identificação grava evento com id_pedido nulo, sem
      // travar a transação (a importação completou normalmente acima).
      const eventoSemIdentificacao = db
        .prepare(`SELECT id_pedido FROM evento WHERE codigo_evento = 'TX-2'`)
        .get() as { id_pedido: string | null };
      expect(eventoSemIdentificacao.id_pedido).toBeNull();

      const totaisAntes = {
        pedido: contarPedidos(db),
        vinculo_fonte: contarVinculosFonte(db),
        evento: contarEventos(db),
      };
      expect(totaisAntes).toEqual({ pedido: 3, vinculo_fonte: 5, evento: 6 });

      // 2ª chamada, mesmo repositório (não recriado): tudo "já existente".
      const relatorio2 = importar(repositorio, dados);

      expect(relatorio2.vendas).toEqual({
        lidas: 3,
        novas: 0,
        jaExistentes: 3,
        rejeitadas: 0,
      });
      expect(relatorio2.rastreio).toEqual({
        lidas: 1,
        novas: 0,
        jaExistentes: 1,
        rejeitadas: 0,
      });
      expect(relatorio2.pagamentos).toEqual({
        lidas: 2,
        novas: 0,
        jaExistentes: 1,
        rejeitadas: 0,
      });

      const totaisDepois = {
        pedido: contarPedidos(db),
        vinculo_fonte: contarVinculosFonte(db),
        evento: contarEventos(db),
      };
      expect(totaisDepois).toEqual(totaisAntes);
    });
  });

  describe("convergência entre fontes", () => {
    it("rastreio/pagamentos chegando antes da venda convergem para o mesmo id_pedido quando a venda é importada depois", () => {
      const { repositorio, db } = abrirRepositorioParaTeste(":memory:");
      const codigosConhecidos = new Set(["5"]);

      const pagamentosCsv = [CABECALHO_PAGAMENTOS, "TX-9,PV-000005,15,2026-01-05"].join("\n");
      const rastreioCsv = [
        CABECALHO_RASTREIO,
        "EVT-9,RS-9,5,coleta,2026-01-05T10:00:00Z,Transportadora Y",
      ].join("\n");

      // 1ª chamada: só rastreio/pagamentos, vendas ainda não disponível.
      const relatorioSoFontesSecundarias = importar(repositorio, {
        vendas: [],
        pagamentosCsv,
        rastreioCsv,
        codigosConhecidos,
      });

      expect(relatorioSoFontesSecundarias.rastreio.novas).toBe(1);
      expect(relatorioSoFontesSecundarias.pagamentos.novas).toBe(1);

      const vinculoVendasAntes = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'vendas' AND codigo_externo = '5'`,
        )
        .get() as { id_pedido: string } | undefined;
      expect(vinculoVendasAntes).toBeDefined();
      const idPedidoCriadoAntecipadamente = obrigatorio(vinculoVendasAntes).id_pedido;

      expect(contarPedidos(db)).toBe(1);

      // 2ª chamada, mesmo repositório: agora a venda chega.
      const relatorioComVenda = importar(repositorio, {
        vendas: [criarPedidoVendas("5")],
        pagamentosCsv: "",
        rastreioCsv: "",
        codigosConhecidos,
      });

      // O vínculo vendas/5 já existia (criado antecipadamente) — "já existente", não "novo".
      expect(relatorioComVenda.vendas).toEqual({
        lidas: 1,
        novas: 0,
        jaExistentes: 1,
        rejeitadas: 0,
      });

      const vinculoVendasDepois = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'vendas' AND codigo_externo = '5'`,
        )
        .get() as { id_pedido: string };
      expect(vinculoVendasDepois.id_pedido).toBe(idPedidoCriadoAntecipadamente);

      const vinculoRastreioDepois = db
        .prepare(
          `SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'rastreio' AND codigo_externo = 'RS-9'`,
        )
        .get() as { id_pedido: string };
      expect(vinculoRastreioDepois.id_pedido).toBe(idPedidoCriadoAntecipadamente);

      // Nenhum id_pedido duplicado foi criado para o mesmo código de vendas.
      expect(contarPedidos(db)).toBe(1);
    });
  });

  describe("atomicidade", () => {
    it("erro no meio da importação desfaz tudo: nenhuma linha gravada", () => {
      const { repositorio, db } = abrirRepositorioParaTeste(":memory:");
      let eventosGravados = 0;
      const repositorioComFalha = {
        ...repositorio,
        inserirEvento: (evento: Parameters<typeof repositorio.inserirEvento>[0]) => {
          eventosGravados += 1;
          if (eventosGravados === 2) {
            throw new Error("falha simulada");
          }
          return repositorio.inserirEvento(evento);
        },
      };

      expect(() =>
        importar(repositorioComFalha, {
          vendas: [criarPedidoVendas("1"), criarPedidoVendas("2")],
          pagamentosCsv: "",
          rastreioCsv: "",
          codigosConhecidos: new Set(["1", "2"]),
        }),
      ).toThrow("falha simulada");

      expect(contarPedidos(db)).toBe(0);
      expect(contarVinculosFonte(db)).toBe(0);
      expect(contarEventos(db)).toBe(0);
    });
  });
});
