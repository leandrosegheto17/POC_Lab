import { describe, expect, it } from "vitest";
import { EsquemaRespostaDivergencias } from "../../src/contrato/divergencias.js";
import { EsquemaBlocoIndicador } from "../../src/contrato/indicadores.js";
import { EsquemaEventoV1, EsquemaLinhaDoTempoV1 } from "../../src/contrato/linha-do-tempo-v1.js";
import { EsquemaRespostaQualidade } from "../../src/contrato/qualidade.js";
import { EsquemaResumo } from "../../src/contrato/resumo.js";

/**
 * TP-0030: esquemas de resposta v1 (resumo, divergências e linha do tempo).
 *
 * Nota: este `describe` é exclusivo da TP-0030. A TP-0031 acrescenta outro
 * `describe` neste mesmo arquivo, nomeado conforme o escopo dela — não
 * altera o bloco abaixo.
 */
describe("resumo/divergencias/linha-do-tempo-v1", () => {
  describe("EsquemaResumo", () => {
    const cartaoValido = {
      titulo: "Pedidos com divergência",
      formula: "pedidosComDivergencia / pedidos",
      numerador: 10,
      denominador: 100,
      resultado: 0.1,
    };

    it("objeto válido completo passa", () => {
      const resultado = EsquemaResumo.parse({
        dataCorte: "2026-01-31T23:59:59Z",
        semente: 42,
        versaoContrato: "1.0.0",
        idPublicacao: "pub-2026-01-31",
        totais: {
          pedidos: cartaoValido,
          pedidosComDivergencia: cartaoValido,
          porTipo: [
            { tipo: "duplicado", cartao: cartaoValido },
            { tipo: "parcial", cartao: cartaoValido },
          ],
          valorEmAberto: cartaoValido,
          pagoAMais: cartaoValido,
          entregasNoPrazo: cartaoValido,
        },
      });

      expect(resultado.semente).toBe(42);
      expect(resultado.totais.porTipo).toHaveLength(2);
    });

    it("cartão com denominador 0 e resultado null passa", () => {
      const cartaoSemDenominador = {
        titulo: "Entregas no prazo",
        formula: "entregasNoPrazo / entregasTotais",
        numerador: 0,
        denominador: 0,
        resultado: null,
      };

      const resultado = EsquemaResumo.parse({
        dataCorte: "2026-01-31T23:59:59Z",
        semente: 42,
        versaoContrato: "1.0.0",
        idPublicacao: "pub-2026-01-31",
        totais: {
          pedidos: cartaoValido,
          pedidosComDivergencia: cartaoValido,
          porTipo: [],
          valorEmAberto: cartaoValido,
          pagoAMais: cartaoValido,
          entregasNoPrazo: cartaoSemDenominador,
        },
      });

      expect(resultado.totais.entregasNoPrazo.resultado).toBeNull();
    });

    it("campo faltando (idPublicacao) rejeita", () => {
      expect(() =>
        EsquemaResumo.parse({
          dataCorte: "2026-01-31T23:59:59Z",
          semente: 42,
          versaoContrato: "1.0.0",
          totais: {
            pedidos: cartaoValido,
            pedidosComDivergencia: cartaoValido,
            porTipo: [],
            valorEmAberto: cartaoValido,
            pagoAMais: cartaoValido,
            entregasNoPrazo: cartaoValido,
          },
        }),
      ).toThrow();
    });
  });

  describe("EsquemaRespostaDivergencias", () => {
    it("'dados' vazio com paginação válida passa", () => {
      const resultado = EsquemaRespostaDivergencias.parse({
        dados: [],
        paginacao: { pagina: 1, tamanho: 50, total: 0, totalPaginas: 0 },
      });

      expect(resultado.dados).toHaveLength(0);
    });

    it("evento com tipo fora do enum rejeita", () => {
      expect(() =>
        EsquemaRespostaDivergencias.parse({
          dados: [
            {
              pedido: "pedido-1",
              tipo: "tipo_inexistente",
              motivo: "motivo qualquer",
              eventos: [],
            },
          ],
          paginacao: { pagina: 1, tamanho: 50, total: 1, totalPaginas: 1 },
        }),
      ).toThrow();
    });

    it("paginação com 'totalPaginas' ausente rejeita", () => {
      expect(() =>
        EsquemaRespostaDivergencias.parse({
          dados: [],
          paginacao: { pagina: 1, tamanho: 50, total: 0 },
        }),
      ).toThrow();
    });
  });

  describe("EsquemaLinhaDoTempoV1", () => {
    const eventoPagamentoV1 = {
      fonte: "pagamentos",
      codigoEvento: "evt-pagamento-1",
      momentoFato: "2026-01-01T10:05:00Z",
      tipo: "pagamento",
      valor: 199.9,
      referencia_original: "ref-pedido-1",
      chegouForaDeOrdem: false,
    };

    it("evento 'pagamento' v1 válido (sem versao_schema) passa", () => {
      const resultado = EsquemaEventoV1.parse(eventoPagamentoV1);

      expect(resultado.tipo).toBe("pagamento");
      expect(resultado.chegouForaDeOrdem).toBe(false);
    });

    it("o mesmo evento com 'meio_pagamento' extra também passa e o campo desaparece (descarte silencioso)", () => {
      const eventoComCampoExtra = {
        ...eventoPagamentoV1,
        meio_pagamento: "pix",
      };

      const resultado = EsquemaEventoV1.parse(eventoComCampoExtra);

      expect(resultado).not.toHaveProperty("meio_pagamento");
      expect(Object.keys(resultado).sort()).toEqual(
        Object.keys(eventoPagamentoV1).sort(),
      );
    });

    it("evento com 'chegouForaDeOrdem' ausente rejeita", () => {
      const { chegouForaDeOrdem, ...eventoSemCampo } = eventoPagamentoV1;

      expect(() => EsquemaEventoV1.parse(eventoSemCampo)).toThrow();
    });

    it("linha do tempo v1 completa com eventos passa", () => {
      const resultado = EsquemaLinhaDoTempoV1.parse({
        pedido: {
          identidade: "pedido-1",
          codigoBuscado: "ped-externo-1",
          fontes: [
            { fonte: "vendas", codigo: "venda-1" },
            { fonte: "pagamentos", codigo: "pagamento-1" },
          ],
          devido: 199.9,
          pago: 199.9,
          dataLimite: "2026-01-10T00:00:00Z",
          divergencias: [],
        },
        eventos: [eventoPagamentoV1],
      });

      expect(resultado.pedido.identidade).toBe("pedido-1");
      expect(resultado.eventos).toHaveLength(1);
    });
  });
});

/**
 * TP-0031: esquemas de resposta v1 (indicadores e qualidade).
 *
 * Nota: este `describe` é irmão do `describe` da TP-0030 acima — não altera
 * o bloco dela.
 */
describe("indicadores/qualidade", () => {
  describe("EsquemaBlocoIndicador", () => {
    const linhaComDenominador = {
      rotulo: "Pedidos com divergência",
      numerador: 10,
      denominador: 100,
      resultado: 0.1,
    };

    it("bloco válido com 'aParte' ausente passa", () => {
      const resultado = EsquemaBlocoIndicador.parse({
        chave: "pedidos-divergencia",
        titulo: "Pedidos com divergência",
        formula: "pedidosComDivergencia / pedidos",
        linhas: [linhaComDenominador],
      });

      expect(resultado.aParte).toBeUndefined();
    });

    it("bloco válido com 'aParte' presente passa", () => {
      const resultado = EsquemaBlocoIndicador.parse({
        chave: "pedidos-divergencia",
        titulo: "Pedidos com divergência",
        formula: "pedidosComDivergencia / pedidos",
        linhas: [linhaComDenominador],
        aParte: true,
      });

      expect(resultado.aParte).toBe(true);
    });

    it("linha com 'denominador: 0' e 'resultado: null' passa", () => {
      const resultado = EsquemaBlocoIndicador.parse({
        chave: "entregas-no-prazo",
        titulo: "Entregas no prazo",
        formula: "entregasNoPrazo / entregasTotais",
        linhas: [
          {
            rotulo: "Entregas no prazo",
            numerador: 0,
            denominador: 0,
            resultado: null,
          },
        ],
      });

      expect(resultado.linhas[0]?.resultado).toBeNull();
    });

    it("'resultado' não-nulo com 'denominador: 0' também é aceito (esquema não valida a aritmética)", () => {
      // Decisão documentada: este esquema não aplica `.refine` aritmético
      // para garantir `resultado === null` quando `denominador === 0`.
      // Validar a consistência numérica entre numerador/denominador/
      // resultado é responsabilidade do domínio (quem calcula o indicador),
      // não deste esquema de contrato — que só garante a forma dos dados.
      const resultado = EsquemaBlocoIndicador.parse({
        chave: "indicador-inconsistente",
        titulo: "Indicador inconsistente",
        formula: "a / b",
        linhas: [
          {
            rotulo: "Linha inconsistente",
            numerador: 5,
            denominador: 0,
            resultado: 42,
          },
        ],
      });

      expect(resultado.linhas[0]?.resultado).toBe(42);
    });
  });

  describe("EsquemaRespostaQualidade", () => {
    const TIPOS_ACHADO = [
      "fora_de_ordem",
      "sem_identificacao",
      "registro_repetido",
      "linha_invalida",
      "valor_fora_do_padrao",
      "formato_data",
      "pedido_sem_envio",
    ] as const;

    const exemploValido = {
      fonte: "vendas",
      referencia: "linha-10",
      detalhe: "detalhe qualquer",
    };

    function achadosValidos() {
      return TIPOS_ACHADO.map((tipo) => ({
        tipo,
        contagem: 1,
        regra: "regra qualquer",
        exemplos: [exemploValido],
      }));
    }

    it("array com os 7 tipos (incluindo 'formato_data' e 'pedido_sem_envio') passa", () => {
      const resultado = EsquemaRespostaQualidade.parse({
        achados: achadosValidos(),
        ia: { utilizada: false, sugestoes: [] },
      });

      expect(resultado.achados).toHaveLength(7);
      expect(resultado.achados.map((a) => a.tipo)).toContain("formato_data");
      expect(resultado.achados.map((a) => a.tipo)).toContain(
        "pedido_sem_envio",
      );
    });

    it("array com só 5 tipos falha ('.length(7)')", () => {
      expect(() =>
        EsquemaRespostaQualidade.parse({
          achados: achadosValidos().slice(0, 5),
          ia: { utilizada: false, sugestoes: [] },
        }),
      ).toThrow();
    });

    it("tipo fora do enum falha", () => {
      const achados = achadosValidos();
      achados[0] = { ...achados[0], tipo: "tipo_inexistente" as never };

      expect(() =>
        EsquemaRespostaQualidade.parse({
          achados,
          ia: { utilizada: false, sugestoes: [] },
        }),
      ).toThrow();
    });

    it("'exemplos' com 11 itens falha ('.max(10)')", () => {
      const achados = achadosValidos();
      achados[0] = {
        ...achados[0],
        exemplos: Array.from({ length: 11 }, () => exemploValido),
      };

      expect(() =>
        EsquemaRespostaQualidade.parse({
          achados,
          ia: { utilizada: false, sugestoes: [] },
        }),
      ).toThrow();
    });

    it("'ia.sugestoes' vazio passa", () => {
      const resultado = EsquemaRespostaQualidade.parse({
        achados: achadosValidos(),
        ia: { utilizada: true, sugestoes: [] },
      });

      expect(resultado.ia.sugestoes).toEqual([]);
    });
  });
});
