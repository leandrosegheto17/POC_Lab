import { describe, expect, it } from "vitest";
import type {
  Evento,
  PayloadColetaV1,
  PayloadEntregaV1,
  PayloadPagamentoV1,
  PayloadTransporteV1,
  PayloadVendaV1,
} from "../../src/dominio/evento.js";
import type {
  AchadoQualidade,
  Divergencia,
  Fonte,
  TipoDivergencia,
  VinculoFonte,
} from "../../src/dominio/modelo.js";

const eventoVenda: Evento = {
  fonte: "vendas",
  codigoEvento: "evt-venda-1",
  momentoFato: "2026-01-01T10:00:00Z",
  tipo: "venda",
  versao_schema: 1,
  valor_devido: 199.9,
  data_limite: "2026-01-10T00:00:00Z",
  transportadora: "Transportadora 1",
};

const eventoPagamento: Evento = {
  fonte: "pagamentos",
  codigoEvento: "evt-pagamento-1",
  momentoFato: "2026-01-01T10:05:00Z",
  tipo: "pagamento",
  versao_schema: 1,
  valor: 199.9,
  referencia_original: "ref-pedido-1",
};

const eventoColeta: Evento = {
  fonte: "rastreio",
  codigoEvento: "evt-coleta-1",
  momentoFato: "2026-01-02T08:00:00Z",
  tipo: "coleta",
  versao_schema: 1,
  transportadora: "Transportadora 1",
  codigo_rastreio: "BR123456789",
};

const eventoTransporte: Evento = {
  fonte: "rastreio",
  codigoEvento: "evt-transporte-1",
  momentoFato: "2026-01-03T08:00:00Z",
  tipo: "transporte",
  versao_schema: 1,
  transportadora: "Transportadora 1",
  codigo_rastreio: "BR123456789",
};

const eventoEntrega: Evento = {
  fonte: "rastreio",
  codigoEvento: "evt-entrega-1",
  momentoFato: "2026-01-05T08:00:00Z",
  tipo: "entrega",
  versao_schema: 1,
  transportadora: "Transportadora 1",
  codigo_rastreio: "BR123456789",
};

describe("união discriminada de evento", () => {
  it("narrowing por switch distingue cada variante pelos seus campos obrigatórios", () => {
    const eventos: Evento[] = [
      eventoVenda,
      eventoPagamento,
      eventoColeta,
      eventoTransporte,
      eventoEntrega,
    ];

    for (const evento of eventos) {
      switch (evento.tipo) {
        case "venda": {
          const payload: PayloadVendaV1 = evento;
          expect(typeof payload.valor_devido).toBe("number");
          expect(typeof payload.data_limite).toBe("string");
          expect(typeof payload.transportadora).toBe("string");
          break;
        }
        case "pagamento": {
          const payload: PayloadPagamentoV1 = evento;
          expect(typeof payload.valor).toBe("number");
          expect(typeof payload.referencia_original).toBe("string");
          break;
        }
        case "coleta": {
          const payload: PayloadColetaV1 = evento;
          expect(typeof payload.transportadora).toBe("string");
          expect(typeof payload.codigo_rastreio).toBe("string");
          break;
        }
        case "transporte": {
          const payload: PayloadTransporteV1 = evento;
          expect(typeof payload.transportadora).toBe("string");
          expect(typeof payload.codigo_rastreio).toBe("string");
          break;
        }
        case "entrega": {
          const payload: PayloadEntregaV1 = evento;
          expect(typeof payload.transportadora).toBe("string");
          expect(typeof payload.codigo_rastreio).toBe("string");
          break;
        }
        default: {
          const _exaustivo: never = evento;
          throw new Error(`tipo de evento não tratado: ${String(_exaustivo)}`);
        }
      }

      expect(evento.versao_schema).toBe(1);
      expect(typeof evento.fonte).toBe("string");
      expect(typeof evento.codigoEvento).toBe("string");
      expect(typeof evento.momentoFato).toBe("string");
    }
  });

  it("todas as variantes v1 têm versao_schema igual a 1", () => {
    const versoes = [
      eventoVenda.versao_schema,
      eventoPagamento.versao_schema,
      eventoColeta.versao_schema,
      eventoTransporte.versao_schema,
      eventoEntrega.versao_schema,
    ];

    for (const versao of versoes) {
      expect(versao).toBe(1);
    }
  });

  it("não aceita campo de outra variante na variante errada (discriminação funciona)", () => {
    // @ts-expect-error `valor_devido` é campo de venda, não de pagamento.
    const pagamentoInvalido: PayloadPagamentoV1 = {
      tipo: "pagamento",
      versao_schema: 1,
      valor_devido: 10,
      referencia_original: "ref",
    };
    expect(pagamentoInvalido).toBeDefined();
  });
});

describe("tipos do modelo comum", () => {
  it("Fonte, VinculoFonte, AchadoQualidade, TipoDivergencia e Divergencia compilam e são usáveis", () => {
    const fonte: Fonte = "vendas";

    const vinculo: VinculoFonte = {
      fonte,
      codigoExterno: "ext-1",
      idPedido: "pedido-1",
    };

    const tipoDivergencia: TipoDivergencia = "pago_nao_enviado";

    const divergencia: Divergencia = {
      tipo: tipoDivergencia,
      motivo: "pagamento recebido sem evento de transporte correspondente",
      idsEventos: [eventoPagamento.codigoEvento],
    };

    const achado: AchadoQualidade = {
      tipo: "fora_de_ordem",
      fonte,
      referencia: eventoVenda.codigoEvento,
      regra: "momentoFato decrescente em relação ao evento anterior",
      detalhe: "evento recebido com momentoFato anterior ao último processado",
    };

    expect(vinculo.fonte).toBe("vendas");
    expect(divergencia.tipo).toBe("pago_nao_enviado");
    expect(achado.tipo).toBe("fora_de_ordem");
  });
});
