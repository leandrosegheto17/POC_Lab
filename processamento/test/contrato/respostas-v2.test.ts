import { describe, expect, it } from "vitest";
import {
  EsquemaEventoV2,
  EsquemaLinhaDoTempoV2,
} from "../../src/contrato/linha-do-tempo-v2.js";

/**
 * TP-0076: esquema v2 da linha do tempo — `versao_schema` explícito em cada
 * variante de evento, e `pagamento` como união por `versao_schema` (1 ou 2),
 * expondo `meioPagamento` quando `versao_schema: 2`.
 *
 * `linha-do-tempo-v1.ts` não é alterado por esta tarefa (G-21) — ver
 * `linha-do-tempo-v1.ts`, intocado.
 */
describe("linha-do-tempo-v2", () => {
  describe("EsquemaEventoV2 - pagamento", () => {
    const eventoPagamentoV1 = {
      fonte: "pagamentos",
      codigoEvento: "evt-pagamento-1",
      momentoFato: "2026-01-01T10:05:00Z",
      tipo: "pagamento",
      versao_schema: 1,
      valor: 199.9,
      referencia_original: "ref-pedido-1",
      chegouForaDeOrdem: false,
    };

    const eventoPagamentoV2 = {
      fonte: "pagamentos",
      codigoEvento: "evt-pagamento-2",
      momentoFato: "2026-01-02T10:05:00Z",
      tipo: "pagamento",
      versao_schema: 2,
      valor: 250,
      referencia_original: "ref-pedido-2",
      meio_pagamento: "pix",
      chegouForaDeOrdem: false,
    };

    it("evento 'pagamento' v1 válido (versao_schema: 1, sem meio_pagamento) passa", () => {
      const resultado = EsquemaEventoV2.parse(eventoPagamentoV1);

      expect(resultado.tipo).toBe("pagamento");
      if (resultado.tipo === "pagamento" && resultado.versao_schema === 1) {
        expect(resultado.valor).toBe(199.9);
      }
    });

    it("evento 'pagamento' v2 válido (versao_schema: 2, com meio_pagamento) passa e mantém 'meio_pagamento' no resultado", () => {
      const resultado = EsquemaEventoV2.parse(eventoPagamentoV2);

      expect(resultado.tipo).toBe("pagamento");
      expect(resultado).toHaveProperty("meio_pagamento");
      if (resultado.tipo === "pagamento" && resultado.versao_schema === 2) {
        expect(resultado.meio_pagamento).toBe("pix");
      }
    });

    it("evento 'pagamento' v2 sem 'meio_pagamento' rejeita", () => {
      const eventoSemCampo: Record<string, unknown> = { ...eventoPagamentoV2 };
      delete eventoSemCampo.meio_pagamento;

      expect(() => EsquemaEventoV2.parse(eventoSemCampo)).toThrow();
    });
  });

  describe("EsquemaLinhaDoTempoV2", () => {
    const eventoPagamentoV1 = {
      fonte: "pagamentos",
      codigoEvento: "evt-pagamento-1",
      momentoFato: "2026-01-01T10:05:00Z",
      tipo: "pagamento",
      versao_schema: 1,
      valor: 199.9,
      referencia_original: "ref-pedido-1",
      chegouForaDeOrdem: false,
    };

    const eventoPagamentoV2 = {
      fonte: "pagamentos",
      codigoEvento: "evt-pagamento-2",
      momentoFato: "2026-01-02T10:05:00Z",
      tipo: "pagamento",
      versao_schema: 2,
      valor: 250,
      referencia_original: "ref-pedido-2",
      meio_pagamento: "pix",
      chegouForaDeOrdem: false,
    };

    const eventoVenda = {
      fonte: "vendas",
      codigoEvento: "evt-venda-1",
      momentoFato: "2026-01-01T09:00:00Z",
      tipo: "venda",
      versao_schema: 1,
      valor_devido: 449.9,
      data_limite: "2026-01-10T00:00:00Z",
      transportadora: "transportadora-1",
      chegouForaDeOrdem: false,
    };

    const eventoColeta = {
      fonte: "rastreio",
      codigoEvento: "evt-coleta-1",
      momentoFato: "2026-01-02T09:00:00Z",
      tipo: "coleta",
      versao_schema: 1,
      transportadora: "transportadora-1",
      codigo_rastreio: "rastreio-1",
      chegouForaDeOrdem: false,
    };

    it("lista mista de eventos (pagamento v1 + pagamento v2 + venda + coleta) passa inteira", () => {
      const resultado = EsquemaLinhaDoTempoV2.parse({
        pedido: {
          identidade: "pedido-1",
          codigoBuscado: "ped-externo-1",
          fontes: [
            { fonte: "vendas", codigo: "venda-1" },
            { fonte: "pagamentos", codigo: "pagamento-1" },
          ],
          devido: 449.9,
          pago: 449.9,
          dataLimite: "2026-01-10T00:00:00Z",
          divergencias: [],
        },
        eventos: [eventoVenda, eventoColeta, eventoPagamentoV1, eventoPagamentoV2],
      });

      expect(resultado.eventos).toHaveLength(4);
      expect(resultado.pedido.identidade).toBe("pedido-1");
    });
  });
});
