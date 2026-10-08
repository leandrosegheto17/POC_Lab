import { describe, expect, it } from "vitest";
import { detectarDuplicado } from "../../../src/dominio/divergencias/duplicado.js";

describe("validação: parcial e duplicado", () => {
  describe("detectarDuplicado (RN-03)", () => {
    it("2 transações de código distinto, cada uma com valor integral → achado duplicado com as 2", () => {
      const valorDevido = 100;
      const pagamentos = [
        { codigoEvento: "evt-1", valor: 100 },
        { codigoEvento: "evt-2", valor: 100 },
      ];

      const achado = detectarDuplicado(valorDevido, pagamentos);

      expect(achado).toBeDefined();
      expect(achado?.tipo).toBe("duplicado");
      expect(achado?.idsEventos).toEqual(["evt-1", "evt-2"]);
      expect(achado?.motivo).toContain("200.00");
      expect(achado?.motivo).toContain("100.00");
    });

    it("2 transações que somam exatamente ao devido (parcelas, nenhuma integral) → nenhum achado", () => {
      const valorDevido = 100;
      const pagamentos = [
        { codigoEvento: "evt-1", valor: 60 },
        { codigoEvento: "evt-2", valor: 40 },
      ];

      const achado = detectarDuplicado(valorDevido, pagamentos);

      expect(achado).toBeUndefined();
    });

    it("1 pagamento integral só (quitado) → nenhum achado", () => {
      const valorDevido = 100;
      const pagamentos = [{ codigoEvento: "evt-1", valor: 100 }];

      const achado = detectarDuplicado(valorDevido, pagamentos);

      expect(achado).toBeUndefined();
    });

    it("pagamento integral dentro da tolerância de R$ 0,01 ainda conta como integral", () => {
      const valorDevido = 100;
      const pagamentos = [
        { codigoEvento: "evt-1", valor: 100.01 },
        { codigoEvento: "evt-2", valor: 99.99 },
      ];

      const achado = detectarDuplicado(valorDevido, pagamentos);

      expect(achado).toBeDefined();
      expect(achado?.tipo).toBe("duplicado");
      expect(achado?.idsEventos).toEqual(["evt-1", "evt-2"]);
    });

    it("3 transações integrais → achado único com os 3 idsEventos", () => {
      const valorDevido = 50;
      const pagamentos = [
        { codigoEvento: "evt-1", valor: 50 },
        { codigoEvento: "evt-2", valor: 50 },
        { codigoEvento: "evt-3", valor: 50 },
      ];

      const achado = detectarDuplicado(valorDevido, pagamentos);

      expect(achado).toBeDefined();
      expect(achado?.idsEventos).toEqual(["evt-1", "evt-2", "evt-3"]);
    });
  });
});
