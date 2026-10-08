// TP-0047 — Rota `GET /api/v1/divergencias`.
//
// Instância LOCAL de Hono, só para este teste (mesma convenção de
// `qualidade.test.ts`/`erros.test.ts`): registra apenas o sub-app sob
// teste, sem tocar na app real de `worker/index.ts` (o registro ali é
// feito pelo orquestrador numa edição única, junto das demais rotas do
// Lote 9).
//
// `criarD1Teste()` (TP-0043) traz, por padrão, 5 linhas de `divergencia`
// para PED-000002 cujo `tipo` ("valor_divergente", "data_divergente" etc.)
// NÃO pertence ao enum `TipoDivergencia` do domínio
// (`duplicado`/`parcial`/`pago_nao_enviado`/`enviado_nao_pago`/
// `entrega_atrasada`, `../../../processamento/src/dominio/modelo.ts`) nem
// ao `EsquemaConsultaDivergencias` (`processamento/src/contrato/
// parametros.ts`), e cujo `eventos` é um array de strings cruas
// (`["EV-0001"]`), não no formato de objeto exigido por
// `EsquemaRespostaDivergencias`/`EsquemaEventoDivergencia`
// (`{ tipo, data, fonte, codigo }`, o mesmo que a projeção real monta em
// `processamento/src/publicacao/divergencias.ts`, função
// `montarEventosSustentacao`). Ou seja: a fixture compartilhada, como
// está, é incompatível com o contrato de resposta desta rota — isso vale
// para qualquer rota que devolva `divergencia.eventos` tal como gravado
// (reportado ao coordenador; ver relato de entrega desta tarefa).
//
// Para não travar esta tarefa nem editar a fixture compartilhada
// `dados-exemplo.ts` (usada por outras rotas em paralelo, TP-0046/48/49/50),
// substituímos aqui o conteúdo de `divergencia` por linhas próprias, com
// `tipo` e `eventos` no formato correto — mesma técnica já usada por
// `qualidade.test.ts` (inserir linha extra direto via `db.prepare(...)`,
// sem tocar na fixture compartilhada), só que aqui limpamos as 5 linhas
// pré-existentes (incompatíveis com o contrato) antes de inserir as
// nossas, via `DELETE FROM divergencia` (mesma API usada por
// `d1-teste.test.ts`, que já demonstra `DELETE` direto na conexão de
// teste).
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import {
  EsquemaRespostaDivergencias,
  type RespostaDivergencias,
} from "processamento/contrato/divergencias.js";

import { rotaDivergencias } from "../../worker/rotas/divergencias.ts";
import { criarD1Teste } from "../apoio/fixture.ts";
import type { D1Teste } from "../apoio/d1-teste.ts";

/** Formato mínimo do corpo RFC 9457 usado nas asserções de erro abaixo. */
interface CorpoErroTeste {
  codigo: string;
  status: number;
  erros?: Array<{ campo: string; mensagem: string }>;
}

/** Uma linha de `divergencia` de teste, já no formato correto de `eventos`. */
interface DivergenciaTeste {
  tipo: string;
  id_pedido: string;
  motivo: string;
  eventos: Array<{ tipo: string; data: string; fonte: string; codigo: string }>;
}

// 3 linhas, ordenadas por (id_pedido, tipo) na ordem em que a rota deve
// devolvê-las: PED-000001/duplicado, PED-000001/parcial,
// PED-000002/pago_nao_enviado.
const DIVERGENCIAS_TESTE: DivergenciaTeste[] = [
  {
    tipo: "duplicado",
    id_pedido: "PED-000001",
    motivo: "Mesmo pedido registrado duas vezes em vendas.",
    eventos: [
      { tipo: "fato", data: "2026-01-02T10:00:00Z", fonte: "vendas", codigo: "EV-0001" },
    ],
  },
  {
    tipo: "parcial",
    id_pedido: "PED-000001",
    motivo: "Pagamento recebido é menor que o valor devido.",
    eventos: [
      { tipo: "fato", data: "2026-01-03T10:00:00Z", fonte: "pagamentos", codigo: "EV-0002" },
    ],
  },
  {
    tipo: "pago_nao_enviado",
    id_pedido: "PED-000002",
    motivo: "Pagamento confirmado, mas sem evento de envio.",
    eventos: [
      { tipo: "fato", data: "2026-02-02T10:00:00Z", fonte: "rastreio", codigo: "EV-0003" },
    ],
  },
];

/**
 * `criarD1Teste()` com a tabela `divergencia` substituída pelas 3 linhas
 * de `DIVERGENCIAS_TESTE` (ver nota no topo do arquivo sobre por que a
 * fixture compartilhada não serve, tal como está, para esta rota).
 */
function criarD1TesteComDivergencias(): D1Teste {
  const db = criarD1Teste();

  db.prepare("DELETE FROM divergencia").run();

  for (const linha of DIVERGENCIAS_TESTE) {
    db.prepare(
      "INSERT INTO divergencia (tipo, id_pedido, motivo, eventos) VALUES (?, ?, ?, ?)",
    )
      .bind(linha.tipo, linha.id_pedido, linha.motivo, JSON.stringify(linha.eventos))
      .run();
  }

  return db;
}

/** Monta a app de teste local, só com o sub-app desta rota registrado. */
function montarApp(): Hono {
  const app = new Hono();
  app.route("/", rotaDivergencias);
  return app;
}

describe("GET /api/v1/divergencias", () => {
  it("sem parâmetros: 200, página 1, tamanho 50, ordenado por (id_pedido, tipo)", async () => {
    const app = montarApp();
    const db = criarD1TesteComDivergencias();

    const resposta = await app.request("/api/v1/divergencias", {}, { DB: db });

    expect(resposta.status).toBe(200);

    const corpo = (await resposta.json()) as RespostaDivergencias;
    const validacao = EsquemaRespostaDivergencias.safeParse(corpo);
    expect(validacao.success).toBe(true);

    expect(corpo.paginacao).toEqual({ pagina: 1, tamanho: 50, total: 3, totalPaginas: 1 });
    expect(corpo.dados.map((item) => [item.pedido, item.tipo])).toEqual([
      ["PED-000001", "duplicado"],
      ["PED-000001", "parcial"],
      ["PED-000002", "pago_nao_enviado"],
    ]);
  });

  it("?tipo=duplicado: só as linhas desse tipo", async () => {
    const app = montarApp();
    const db = criarD1TesteComDivergencias();

    const resposta = await app.request(
      "/api/v1/divergencias?tipo=duplicado",
      {},
      { DB: db },
    );

    expect(resposta.status).toBe(200);

    const corpo = (await resposta.json()) as RespostaDivergencias;
    expect(corpo.dados.length).toBe(1);
    expect(corpo.dados[0]?.tipo).toBe("duplicado");
    expect(corpo.dados[0]?.pedido).toBe("PED-000001");
    expect(corpo.paginacao.total).toBe(1);
  });

  it("?tipo=valor_invalido: 400 parametro_invalido com erros não vazio", async () => {
    const app = montarApp();
    const db = criarD1TesteComDivergencias();

    const resposta = await app.request(
      "/api/v1/divergencias?tipo=valor_invalido",
      {},
      { DB: db },
    );

    expect(resposta.status).toBe(400);
    const corpo = (await resposta.json()) as CorpoErroTeste;
    expect(corpo.codigo).toBe("parametro_invalido");
    expect(corpo.erros?.length).toBeGreaterThan(0);
  });

  it("?foo=1 (parâmetro desconhecido): 400 parametro_invalido", async () => {
    const app = montarApp();
    const db = criarD1TesteComDivergencias();

    const resposta = await app.request("/api/v1/divergencias?foo=1", {}, { DB: db });

    expect(resposta.status).toBe(400);
    const corpo = (await resposta.json()) as CorpoErroTeste;
    expect(corpo.codigo).toBe("parametro_invalido");
  });

  it("?pagina=2&tamanho=1: 2ª linha, paginação com total real e totalPaginas corretos", async () => {
    const app = montarApp();
    const db = criarD1TesteComDivergencias();

    const resposta = await app.request(
      "/api/v1/divergencias?pagina=2&tamanho=1",
      {},
      { DB: db },
    );

    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as RespostaDivergencias;
    expect(corpo.dados.length).toBe(1);
    expect(corpo.dados[0]?.pedido).toBe("PED-000001");
    expect(corpo.dados[0]?.tipo).toBe("parcial");
    expect(corpo.paginacao).toEqual({ pagina: 2, tamanho: 1, total: 3, totalPaginas: 3 });
  });

  it("?pagina=999 (além da última): 200, dados vazio, total real (não zero)", async () => {
    const app = montarApp();
    const db = criarD1TesteComDivergencias();

    const resposta = await app.request(
      "/api/v1/divergencias?pagina=999",
      {},
      { DB: db },
    );

    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as RespostaDivergencias;
    expect(corpo.dados).toEqual([]);
    expect(corpo.paginacao.total).toBe(3);
    expect(corpo.paginacao.pagina).toBe(999);
  });
});
