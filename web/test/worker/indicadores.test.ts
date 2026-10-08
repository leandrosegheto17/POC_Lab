// TP-0049 — Rota `GET /api/v1/indicadores`.
//
// RTP-0022 — usa a app real de `worker/index.ts` (rota já registrada e
// cabeçalhos centrais aplicados), não uma instância Hono local.
import { describe, expect, it } from "vitest";

import { EsquemaRespostaIndicadores } from "processamento/contrato/indicadores.js";
import appReal from "../../worker/index.ts";
import { criarD1Teste } from "../apoio/fixture.ts";
import type { D1Teste } from "../apoio/d1-teste.ts";

/** Conteúdo válido (passa em `EsquemaRespostaIndicadores`) para a fixture. */
const CONTEUDO_INDICADORES_VALIDO = JSON.stringify([
  {
    chave: "taxa_pagamento",
    titulo: "Taxa de pagamento",
    formula: "pedidos pagos / total de pedidos",
    linhas: [
      {
        rotulo: "Geral",
        numerador: 1,
        denominador: 2,
        resultado: 0.5,
      },
    ],
  },
]);

/** `D1Teste` da fixture padrão + uma linha `indicadores` em `documento`. */
function criarD1ComIndicadores(): D1Teste {
  const db = criarD1Teste();
  db.prepare("INSERT INTO documento (chave, conteudo) VALUES (?, ?)")
    .bind("indicadores", CONTEUDO_INDICADORES_VALIDO)
    .run();
  return db;
}

function montarApp() {
  return appReal;
}

describe("GET /api/v1/indicadores", () => {
  it("200: documento presente, corpo passa no esquema de resposta", async () => {
    const app = montarApp();
    const db = criarD1ComIndicadores();

    const resposta = await app.request("/api/v1/indicadores", {}, { DB: db });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("public, max-age=60");
    const corpo = await resposta.json();
    const validacao = EsquemaRespostaIndicadores.safeParse(corpo);
    expect(validacao.success).toBe(true);
  });

  it("500 erro_interno: documento 'indicadores' ausente, sem detalhe técnico", async () => {
    const app = montarApp();
    const db = criarD1Teste(); // fixture padrão, SEM a chave 'indicadores'

    const resposta = await app.request("/api/v1/indicadores", {}, { DB: db });

    expect(resposta.status).toBe(500);
    const corpo = (await resposta.json()) as { codigo: string; detail: string };
    expect(corpo.codigo).toBe("erro_interno");
    expect(corpo.detail).not.toMatch(/sql|sqlite|stack|exception/i);
  });

  it("HEAD: não cai em 405 (método derivado do GET pelo Hono)", async () => {
    const app = montarApp();
    const db = criarD1ComIndicadores();

    const resposta = await app.request(
      "/api/v1/indicadores",
      { method: "HEAD" },
      { DB: db },
    );

    expect(resposta.status).toBe(200);
    expect(await resposta.text()).toBe("");
  });
});
