// Teste de fumaça do esqueleto do Worker: confirma só que o app Hono
// é importável e responde a uma requisição básica. Não valida formato de
// rota/erro (isso é escopo de tarefa futura) — mesmo um 404 é aceitável aqui.
import { describe, expect, it } from "vitest";
import app from "../../worker/index.ts";

describe("Worker (esqueleto Hono)", () => {
  it("responde a uma requisição básica sem lançar erro", async () => {
    const resposta = await app.request("/");

    expect(resposta).toBeInstanceOf(Response);
    expect(typeof resposta.status).toBe("number");
  });
});
