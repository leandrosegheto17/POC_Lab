// TP-0050 — Rota `GET /api/v1/qualidade`.
//
// Instância LOCAL de Hono, só para este teste (mesma convenção de
// `erros.test.ts`): registra apenas o handler sob teste, sem tocar na app
// real de `worker/index.ts` (o registro da rota ali é feito pelo
// orquestrador numa edição única, junto das demais rotas do Lote 9).
//
// `criarD1Teste` (TP-0043) já publica um banco sem a chave `qualidade` em
// `documento` — serve, sem alteração nenhuma, como cenário de "documento
// ausente" (500). Para o cenário de sucesso, inserimos a linha `qualidade`
// diretamente aqui, via `db.prepare(...).bind(...).run()` (mesma API usada
// por `buscarDocumento`), sem editar a fixture compartilhada
// `dados-exemplo.ts` (usada por outras rotas em paralelo).
import { describe, expect, it } from "vitest";

import {
  EsquemaRespostaQualidade,
  type RespostaQualidade,
} from "processamento/contrato/qualidade.js";

import appReal from "../../worker/index.ts";
import { criarD1Teste } from "../apoio/fixture.ts";

/** Formato mínimo do corpo RFC 9457 usado nas asserções de erro abaixo. */
interface CorpoErroTeste {
  codigo: string;
  status: number;
}

/** Monta uma resposta de `qualidade` com exatamente os 7 tipos de achado. */
function respostaQualidadeExemplo(): RespostaQualidade {
  const tipos = [
    "fora_de_ordem",
    "sem_identificacao",
    "registro_repetido",
    "linha_invalida",
    "valor_fora_do_padrao",
    "formato_data",
    "pedido_sem_envio",
  ] as const;

  return {
    achados: tipos.map((tipo) => ({
      tipo,
      contagem: 1,
      regra: `Regra de exemplo para ${tipo}.`,
      exemplos: [
        {
          fonte: "vendas",
          referencia: `REF-${tipo}`,
          detalhe: `Detalhe de exemplo para ${tipo}.`,
        },
      ],
    })),
    ia: { utilizada: false, sugestoes: [] },
  };
}

/** `criarD1Teste()` + a linha `qualidade` inserida em `documento`. */
function criarD1TesteComQualidade() {
  const db = criarD1Teste();
  db.prepare("INSERT INTO documento (chave, conteudo) VALUES (?, ?)")
    .bind("qualidade", JSON.stringify(respostaQualidadeExemplo()))
    .run();
  return db;
}

/** RTP-0025 — usa a app real de `worker/index.ts`. */
function montarApp() {
  return appReal;
}

describe("GET /api/v1/qualidade", () => {
  it("devolve 200 com corpo válido conforme EsquemaRespostaQualidade (7 achados)", async () => {
    const app = montarApp();
    const db = criarD1TesteComQualidade();

    const resposta = await app.request("/api/v1/qualidade", {}, { DB: db });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("public, max-age=60");

    const corpo = await resposta.json();
    const validacao = EsquemaRespostaQualidade.safeParse(corpo);
    expect(validacao.success).toBe(true);
    if (validacao.success) {
      expect(validacao.data.achados.length).toBe(7);
    }
  });

  it("devolve 500 erro_interno quando o documento 'qualidade' não existe", async () => {
    const app = montarApp();
    const db = criarD1Teste(); // sem a chave 'qualidade'

    const resposta = await app.request("/api/v1/qualidade", {}, { DB: db });

    expect(resposta.status).toBe(500);
    const corpo = await resposta.json<CorpoErroTeste>();
    expect(corpo.codigo).toBe("erro_interno");

    const textoCompleto = JSON.stringify(corpo).toLowerCase();
    expect(textoCompleto).not.toContain("select");
    expect(textoCompleto).not.toContain("sqlite");
    expect(textoCompleto).not.toContain(" at ");
  });

  it("HEAD não cai em 405 (derivado automaticamente do GET)", async () => {
    const app = montarApp();
    const db = criarD1TesteComQualidade();

    const resposta = await app.request(
      "/api/v1/qualidade",
      { method: "HEAD" },
      { DB: db },
    );

    expect(resposta.status).toBe(200);
    expect(await resposta.text()).toBe("");
  });
});
