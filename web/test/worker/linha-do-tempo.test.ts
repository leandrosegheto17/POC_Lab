// GET /api/v1/pedidos/{codigo}/linha-do-tempo.
//
// Dataset próprio deste teste (não reaproveita `web/test/apoio/dados-exemplo.ts`):
// aqueles dados têm `linha_do_tempo.dados = "{}"` e tipos de divergência que
// não existem em `TipoDivergencia` (ex. "valor_divergente") — não dá para
// validar a resposta real da rota (que usa `EsquemaEventoV1`/discriminated
// union por `tipo`, e `TIPOS_DIVERGENCIA` do esquema v1) contra esse dataset.
// Em vez disso, montamos aqui um dataset mínimo com payloads de evento e
// tipo de divergência válidos, pelo mesmo caminho de serialização usado em
// produção (`escreverSqlPublicacao` + `leitura-d1.sql`),
// igual ao padrão de `web/test/apoio/fixture.ts`.
//
// `node:fs`/`node:sqlite` só são lidos aqui porque este arquivo vive em
// `web/test/` (mesma exceção documentada em `web/test/apoio/d1-teste.ts`).
import { describe, expect, it } from "vitest";

import type { TabelasParaPublicacao } from "processamento/publicacao/escritor-sql.js";
import { EsquemaLinhaDoTempoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";

import { criarD1TesteComTabelas } from "../apoio/fixture.ts";
import type { CorpoLinhaDoTempoSolto } from "../apoio/corpo-teste.ts";
import {
  criarAppDeRota,
  divergenciaParcial,
  pedirLinhaDoTempoComErro,
} from "../apoio/linha-do-tempo-worker.ts";
import { obrigatorio } from "../apoio/obrigatorio.ts";
import { rotaLinhaDoTempo } from "../../worker/rotas/linha-do-tempo.ts";

const ID_PEDIDO = "PED-100001";

/**
 * Dataset mínimo deste teste: 1 pedido pago, 2 códigos (`PED-100001` e
 * `VENDA-1`) apontando para o mesmo `id_pedido`, 3 eventos reais (venda,
 * pagamento com campo fictício extra — simula uma v2 futura, coleta fora de
 * ordem) e 1 divergência com `tipo` válido (`parcial`).
 */
const TABELAS: TabelasParaPublicacao = {
  pedido_resumo: [
    {
      id_pedido: ID_PEDIDO,
      valor_devido: 100,
      valor_pago: 100,
      data_limite: "2026-01-10",
      situacao_pagamento: "pago",
      fontes: JSON.stringify({ vendas: "VENDA-1", pagamentos: "PAG-1" }),
    },
  ],
  vinculo_codigo: [
    { codigo: ID_PEDIDO, fonte: "pedido", id_pedido: ID_PEDIDO },
    { codigo: "VENDA-1", fonte: "vendas", id_pedido: ID_PEDIDO },
  ],
  linha_do_tempo: [
    {
      id_pedido: ID_PEDIDO,
      posicao: 0,
      codigo_evento: "EVT-1",
      fonte: "vendas",
      tipo: "fato",
      momento_fato: "2026-01-01T10:00:00Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "venda",
        valor_devido: 100,
        data_limite: "2026-01-10",
        transportadora: "Transportadora X",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: ID_PEDIDO,
      posicao: 1,
      codigo_evento: "EVT-2",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-01-05T10:00:00Z",
      versao_schema: 1,
      // `meio_pagamento` é um campo fictício que não existe no esquema v1 de
      // pagamento — simula uma v2 futura (G-21): deve ser descartado
      // silenciosamente na resposta final da rota, não rejeitado.
      dados: JSON.stringify({
        tipo: "pagamento",
        valor: 100,
        referencia_original: "PAG-1",
        meio_pagamento: "pix",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: ID_PEDIDO,
      posicao: 2,
      codigo_evento: "EVT-3",
      fonte: "rastreio",
      tipo: "fato",
      momento_fato: "2026-01-02T10:00:00Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "coleta",
        transportadora: "Transportadora X",
        codigo_rastreio: "RAST-1",
      }),
      fora_de_ordem: 1,
    },
  ],
  divergencia: [divergenciaParcial(ID_PEDIDO)],
  documento: [],
};

/** Instância Hono local só para este teste, com a rota v1 registrada. */
const criarAppDeTeste = () => criarAppDeRota(rotaLinhaDoTempo);

describe("GET /api/v1/pedidos/{codigo}/linha-do-tempo", () => {
  it("devolve 200 com a linha do tempo completa para o código de identidade (PED-)", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const resposta = await app.request(
      `/api/v1/pedidos/${ID_PEDIDO}/linha-do-tempo`,
      undefined,
      { DB },
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json<CorpoLinhaDoTempoSolto>();

    const validacao = EsquemaLinhaDoTempoV1.safeParse(corpo);
    expect(validacao.success).toBe(true);

    expect(corpo.pedido.codigoBuscado).toBe(ID_PEDIDO);
    expect(corpo.pedido.identidade).toBe(ID_PEDIDO);

    // Ordem canônica (por `posicao`): venda, pagamento, coleta.
    expect(corpo.eventos.map((e) => e.tipo)).toEqual([
      "venda",
      "pagamento",
      "coleta",
    ]);

    // Evento fora de ordem reportado corretamente.
    expect(obrigatorio(corpo.eventos[2]).chegouForaDeOrdem).toBe(true);
    expect(obrigatorio(corpo.eventos[0]).chegouForaDeOrdem).toBe(false);

    // Divergência com tipo válido presente.
    expect(corpo.pedido.divergencias).toEqual([
      { tipo: "parcial", motivo: "Pagamento parcial identificado." },
    ]);

    // Fontes convertidas de objeto para array {fonte, codigo}.
    expect(corpo.pedido.fontes).toEqual(
      expect.arrayContaining([
        { fonte: "vendas", codigo: "VENDA-1" },
        { fonte: "pagamentos", codigo: "PAG-1" },
      ]),
    );
  });

  it("campo fictício extra no payload de um evento (simulando v2) não aparece na resposta final (G-21)", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const resposta = await app.request(
      `/api/v1/pedidos/${ID_PEDIDO}/linha-do-tempo`,
      undefined,
      { DB },
    );

    const corpo = await resposta.json<CorpoLinhaDoTempoSolto>();
    const eventoPagamento = obrigatorio(corpo.eventos.find(
      (e) => e.tipo === "pagamento",
    ))

    expect(eventoPagamento).toBeDefined();
    expect(eventoPagamento).not.toHaveProperty("meio_pagamento");
    expect(eventoPagamento).not.toHaveProperty("versao_schema");
  });

  it("resolve pelo código alternativo (fonte vendas) apontando para o mesmo pedido, devolvendo o código CRU enviado", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const resposta = await app.request(
      "/api/v1/pedidos/VENDA-1/linha-do-tempo",
      undefined,
      { DB },
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json<CorpoLinhaDoTempoSolto>();

    expect(corpo.pedido.identidade).toBe(ID_PEDIDO);
    // Código buscado é o CRU enviado na URL, não o normalizado.
    expect(corpo.pedido.codigoBuscado).toBe("VENDA-1");
  });

  it("resolve com variação de caixa/espaço, igual ao código normalizado", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const codigoComVariacao = " venda-1 ";
    const resposta = await app.request(
      `/api/v1/pedidos/${encodeURIComponent(codigoComVariacao)}/linha-do-tempo`,
      undefined,
      { DB },
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json<CorpoLinhaDoTempoSolto>();

    expect(corpo.pedido.identidade).toBe(ID_PEDIDO);
    // Código buscado é o CRU enviado (com espaços/caixa originais), não o
    // normalizado — mesmo assim resolve para o pedido correto.
    expect(corpo.pedido.codigoBuscado).toBe(codigoComVariacao);
  });

  it("devolve 404 pedido_nao_encontrado para um código inexistente, mas válido no formato", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v1", "PED-999999");

    expect(status).toBe(404);
    expect(corpo.codigo).toBe("pedido_nao_encontrado");
  });

  it("devolve 400 parametro_invalido para código com mais de 40 caracteres, sem consultar o banco", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const codigoMuitoLongo = "A".repeat(41);
    const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v1", codigoMuitoLongo);

    expect(status).toBe(400);
    expect(corpo.codigo).toBe("parametro_invalido");
  });

  it("devolve 400 parametro_invalido para tentativa de injeção SQL, NUNCA 200 com outro pedido", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const tentativaInjecao = "' OR 1=1 --";
    const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v1", tentativaInjecao);

    expect(status).toBe(400);
    expect(status).not.toBe(200);
    expect(corpo.codigo).toBe("parametro_invalido");
  });

  it.each(["PED-000001%", "PED-000001;", "PED;000001"])(
    "devolve 400 parametro_invalido para %s, sem consultar o D1",
    async (codigoInvalido) => {
      const app = criarAppDeTeste();
      let consultas = 0;
      const DB = {
        prepare: () => {
          consultas += 1;
          throw new Error("D1 não deveria ser consultado");
        },
      } as unknown as D1Database;

      const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v1", codigoInvalido);

      expect(status).toBe(400);
      expect(corpo.codigo).toBe("parametro_invalido");
      expect(consultas).toBe(0);
    },
  );
});
