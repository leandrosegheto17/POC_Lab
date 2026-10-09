// Testes do handler `GET /api/v1/resumo`. Monta uma instância
// `Hono()` LOCAL (não a `app` de `web/worker/index.ts`), para isolar o
// handler.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { EsquemaResumo } from "nucleo/contrato/resumo.js";
import { cabecalhos } from "../../worker/cabecalhos.ts";
import { handlerResumo } from "../../worker/rotas/resumo.ts";
import { criarD1Teste } from "../apoio/fixture.ts";

/** Formato mínimo do corpo RFC 9457 usado nas asserções abaixo. */
interface CorpoErroTeste {
  codigo: string;
  status: number;
}

/** Monta um cartão válido mínimo (ver `EsquemaCartao`). */
function cartao(titulo: string) {
  return {
    titulo,
    formula: "numerador / denominador",
    numerador: 1,
    denominador: 1,
    resultado: 1,
  };
}

/** Documento `resumo` válido, que passa em `EsquemaResumo`. */
const RESUMO_VALIDO = {
  dataCorte: "2026-03-01",
  semente: 42,
  versaoContrato: "v1",
  idPublicacao: "PUB-0001",
  totais: {
    pedidos: cartao("Pedidos"),
    pedidosComDivergencia: cartao("Pedidos com divergência"),
    porTipo: [
      { tipo: "duplicado", cartao: cartao("Duplicado") },
      { tipo: "parcial", cartao: cartao("Parcial") },
    ],
    valorEmAberto: cartao("Valor em aberto"),
    pagoAMais: cartao("Pago a mais"),
    entregasNoPrazo: cartao("Entregas no prazo"),
  },
};

/** Monta a app de teste local, só com a rota deste handler registrada. */
function montarAppDeTeste() {
  const app = new Hono();
  app.use("*", cabecalhos);
  app.get("/api/v1/resumo", handlerResumo);
  return app;
}

describe("GET /api/v1/resumo", () => {
  it("200: documento `resumo` presente — corpo passa em EsquemaResumo", async () => {
    const db = criarD1Teste();
    db.prepare("INSERT INTO documento (chave, conteudo) VALUES (?, ?)")
      .bind("resumo", JSON.stringify(RESUMO_VALIDO))
      .run();

    const app = montarAppDeTeste();
    const resposta = await app.request("/api/v1/resumo", {}, { DB: db });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("public, max-age=60");
    const corpo = await resposta.json();
    expect(EsquemaResumo.safeParse(corpo).success).toBe(true);
  });

  it("500 erro_interno: documento `resumo` ausente — sem SQL/stack no corpo", async () => {
    // `criarD1Teste()` (fixture padrão) não carrega nenhuma linha
    // com chave='resumo' — serve diretamente como cenário de ausência.
    const db = criarD1Teste();

    const app = montarAppDeTeste();
    const resposta = await app.request("/api/v1/resumo", {}, { DB: db });

    expect(resposta.status).toBe(500);
    const corpo = await resposta.json<CorpoErroTeste>();
    expect(corpo.codigo).toBe("erro_interno");

    const textoCompleto = JSON.stringify(corpo).toLowerCase();
    expect(textoCompleto).not.toContain("select");
    expect(textoCompleto).not.toContain("sqlite");
    expect(textoCompleto).not.toContain(" at ");
  });

  it("HEAD: não cai em 405 (Hono deriva HEAD do GET automaticamente)", async () => {
    const db = criarD1Teste();
    db.prepare("INSERT INTO documento (chave, conteudo) VALUES (?, ?)")
      .bind("resumo", JSON.stringify(RESUMO_VALIDO))
      .run();

    const app = montarAppDeTeste();
    const resposta = await app.request(
      "/api/v1/resumo",
      { method: "HEAD" },
      { DB: db },
    );

    expect(resposta.status).toBe(200);
  });
});
