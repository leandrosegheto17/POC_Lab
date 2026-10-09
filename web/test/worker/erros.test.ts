// Erros centrais e cabeçalhos da API.
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import app from "../../worker/index.ts";
import { cabecalhos } from "../../worker/cabecalhos.ts";
import { hookValidacaoZod, problema } from "../../worker/erros.ts";

/** Formato mínimo do corpo RFC 9457 usado nas asserções abaixo. */
interface CorpoErroTeste {
  codigo: string;
  status: number;
  erros?: Array<{ campo: string; mensagem: string }>;
}

describe("rota desconhecida sob /api/", () => {
  it("devolve 404 rota_nao_encontrada em application/problem+json", async () => {
    const resposta = await app.request("/api/isto-nao-existe");

    expect(resposta.status).toBe(404);
    expect(resposta.headers.get("Content-Type")).toBe(
      "application/problem+json",
    );

    const corpo = await resposta.json<CorpoErroTeste>();
    expect(corpo.codigo).toBe("rota_nao_encontrada");
    expect(corpo.status).toBe(404);
    expect(corpo.erros).toBeUndefined();
  });
});

describe("método diferente de GET/HEAD sob /api/", () => {
  it("devolve 405 metodo_nao_permitido com Allow: GET, HEAD", async () => {
    const resposta = await app.request("/api/qualquer-coisa", {
      method: "POST",
    });

    expect(resposta.status).toBe(405);
    expect(resposta.headers.get("Allow")).toBe("GET, HEAD");
    expect(resposta.headers.get("Content-Type")).toBe(
      "application/problem+json",
    );

    const corpo = await resposta.json<CorpoErroTeste>();
    expect(corpo.codigo).toBe("metodo_nao_permitido");
    expect(corpo.status).toBe(405);
  });
});

describe("hookValidacaoZod", () => {
  it("devolve 400 parametro_invalido com erros não vazio quando a validação falha", async () => {
    const resultadoFalho = {
      success: false as const,
      error: {
        issues: [
          { path: ["nome"], message: "Campo obrigatório." },
          { path: ["idade"], message: "Deve ser um número." },
        ],
      },
    };

    const resposta = hookValidacaoZod(resultadoFalho);

    expect(resposta).toBeInstanceOf(Response);
    expect(resposta?.status).toBe(400);
    expect(resposta?.headers.get("Content-Type")).toBe(
      "application/problem+json",
    );

    const corpo = await obrigatorio(resposta, "resposta").json<CorpoErroTeste>();
    expect(corpo.codigo).toBe("parametro_invalido");
    expect(Array.isArray(corpo.erros)).toBe(true);
    expect(corpo.erros?.length).toBeGreaterThan(0);
    expect(corpo.erros?.[0]).toEqual({
      campo: "nome",
      mensagem: "Campo obrigatório.",
    });
  });

  it("não devolve nada quando a validação é bem-sucedida", () => {
    const resposta = hookValidacaoZod({ success: true });

    expect(resposta).toBeUndefined();
  });
});

describe("exceção não tratada e cabeçalhos", () => {
  // Instância separada de Hono, só para este teste — reaproveita o mesmo
  // middleware de cabeçalhos e os mesmos auxiliares de erro usados pelo
  // `app` real de `worker/index.ts`, sem adicionar rota de teste na app
  // de produção.
  const appDeTeste = new Hono();
  appDeTeste.use("*", cabecalhos);
  appDeTeste.get("/ok", (c) => c.text("ok"));
  appDeTeste.get("/explode", () => {
    throw new Error("segredo interno que não deve aparecer na resposta");
  });
  appDeTeste.onError(() => problema("erro_interno", 500));

  it("devolve 500 erro_interno sem nenhum detalhe da exceção original", async () => {
    const resposta = await appDeTeste.request("/explode");

    expect(resposta.status).toBe(500);
    expect(resposta.headers.get("Content-Type")).toBe(
      "application/problem+json",
    );

    const corpo = await resposta.json<CorpoErroTeste>();
    expect(corpo.codigo).toBe("erro_interno");
    const textoCompleto = JSON.stringify(corpo);
    expect(textoCompleto).not.toContain("segredo interno");
    expect(textoCompleto.toLowerCase()).not.toContain("error:");
  });

  it("aplica os cabeçalhos de segurança em toda resposta (200 e erro)", async () => {
    const respostaOk = await appDeTeste.request("/ok");
    const respostaErro = await appDeTeste.request("/explode");

    for (const resposta of [respostaOk, respostaErro]) {
      expect(resposta.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(resposta.headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(resposta.headers.get("Content-Security-Policy")).toBe(
        "default-src 'none'; frame-ancestors 'none'",
      );
      expect(resposta.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(resposta.headers.get("Access-Control-Allow-Methods")).toBeNull();
    }

    expect(respostaOk.headers.get("Cache-Control")).toBe(
      "public, max-age=60",
    );
    expect(respostaErro.headers.get("Cache-Control")).toBeNull();
  });

  it("nenhuma resposta da app real tem cabeçalho CORS, e 404/405 não usam Cache-Control", async () => {
    const resposta404 = await app.request("/api/isto-nao-existe");
    const resposta405 = await app.request("/api/qualquer-coisa", {
      method: "DELETE",
    });

    for (const resposta of [resposta404, resposta405]) {
      expect(resposta.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(resposta.headers.get("Cache-Control")).toBeNull();
      expect(resposta.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(resposta.headers.get("Referrer-Policy")).toBe("no-referrer");
    }
  });
});
