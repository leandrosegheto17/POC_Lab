// GET /api/v2/pedidos/{codigo}/linha-do-tempo.
//
// Dataset próprio deste teste (fixture LOCAL, não edita
// `web/test/apoio/dados-exemplo.ts`), mesmo padrão de
// `web/test/worker/linha-do-tempo.test.ts`: carrega o DDL
// (`leitura-d1.sql`) com pelo menos 1 evento de
// pagamento v2 (`versao_schema: 2`, `dados` incluindo `meio_pagamento`).
//
// `node:fs`/`node:sqlite` só são lidos aqui porque este arquivo vive em
// `web/test/` (mesma exceção documentada em `web/test/apoio/d1-teste.ts`).
import { describe, expect, it } from "vitest";

import type { TabelasParaPublicacao } from "nucleo/contrato/tabelas-publicacao.js";
import { EsquemaLinhaDoTempoV2 } from "nucleo/contrato/linha-do-tempo-v2.js";

import { criarD1TesteComTabelas } from "../apoio/fixture.ts";
import type { CorpoLinhaDoTempoSolto } from "../apoio/corpo-teste.ts";
import {
  criarAppDeRota,
  divergenciaParcial,
  pedirLinhaDoTempoComErro,
  type CorpoErroTeste,
} from "../apoio/linha-do-tempo-worker.ts";
import { obrigatorio } from "../apoio/obrigatorio.ts";
import { rotaLinhaDoTempoV2 } from "../../worker/rotas/linha-do-tempo-v2.ts";
import appReal from "../../worker/index.ts";

const ID_PEDIDO = "PED-200001";

/**
 * Dataset mínimo deste teste: 1 pedido pago, 2 códigos (`PED-200001` e
 * `VENDA-2`) apontando para o mesmo `id_pedido`, 1 evento de venda e 1
 * evento de pagamento com `versao_schema: 2` (payload incluindo
 * `meio_pagamento`), e 1 divergência com tipo válido.
 */
const TABELAS: TabelasParaPublicacao = {
  pedido_resumo: [
    {
      id_pedido: ID_PEDIDO,
      valor_devido: 250,
      valor_pago: 250,
      data_limite: "2026-02-10",
      situacao_pagamento: "pago",
      fontes: JSON.stringify({ vendas: "VENDA-2", pagamentos: "PAG-2" }),
    },
  ],
  vinculo_codigo: [
    { codigo: ID_PEDIDO, fonte: "pedido", id_pedido: ID_PEDIDO },
    { codigo: "VENDA-2", fonte: "vendas", id_pedido: ID_PEDIDO },
  ],
  linha_do_tempo: [
    {
      id_pedido: ID_PEDIDO,
      posicao: 0,
      codigo_evento: "EVT-10",
      fonte: "vendas",
      tipo: "fato",
      momento_fato: "2026-02-01T10:00:00Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "venda",
        valor_devido: 250,
        data_limite: "2026-02-10",
        transportadora: "Transportadora Y",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: ID_PEDIDO,
      posicao: 1,
      codigo_evento: "EVT-11",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-02-05T10:00:00Z",
      versao_schema: 2,
      dados: JSON.stringify({
        tipo: "pagamento",
        versao_schema: 2,
        valor: 250,
        referencia_original: "PAG-2",
        meio_pagamento: "pix",
      }),
      fora_de_ordem: 0,
    },
  ],
  divergencia: [divergenciaParcial(ID_PEDIDO)],
  documento: [],
};

/** Instância Hono local só para este teste, com a rota v2 registrada. */
const criarAppDeTeste = () => criarAppDeRota(rotaLinhaDoTempoV2);

describe("GET /api/v2/pedidos/{codigo}/linha-do-tempo", () => {
  it("devolve 200 com a linha do tempo v2, incluindo versao_schema e meio_pagamento no evento de pagamento v2", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const resposta = await app.request(
      `/api/v2/pedidos/${ID_PEDIDO}/linha-do-tempo`,
      undefined,
      { DB },
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json<CorpoLinhaDoTempoSolto>();

    const validacao = EsquemaLinhaDoTempoV2.safeParse(corpo);
    expect(validacao.success).toBe(true);

    expect(corpo.pedido.codigoBuscado).toBe(ID_PEDIDO);
    expect(corpo.pedido.identidade).toBe(ID_PEDIDO);

    // Todo evento inclui `versao_schema` (lido da coluna, não do payload).
    expect(corpo.eventos.map((e) => e.versao_schema)).toEqual([
      1, 2,
    ]);

    const eventoPagamento = obrigatorio(corpo.eventos.find(
      (e) => e.tipo === "pagamento",
    ))
    expect(eventoPagamento).toBeDefined();
    expect(eventoPagamento.versao_schema).toBe(2);
    expect(eventoPagamento.meio_pagamento).toBe("pix");
  });

  it("resolve com código alternativo (fonte vendas) e com variação de caixa/espaço, para o mesmo id_pedido", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const respostaAlternativo = await app.request(
      "/api/v2/pedidos/VENDA-2/linha-do-tempo",
      undefined,
      { DB },
    );
    expect(respostaAlternativo.status).toBe(200);
    const corpoAlternativo = await respostaAlternativo.json<CorpoLinhaDoTempoSolto>();
    expect(corpoAlternativo.pedido.identidade).toBe(ID_PEDIDO);
    expect(corpoAlternativo.pedido.codigoBuscado).toBe("VENDA-2");

    const codigoComVariacao = " venda-2 ";
    const respostaVariacao = await app.request(
      `/api/v2/pedidos/${encodeURIComponent(codigoComVariacao)}/linha-do-tempo`,
      undefined,
      { DB },
    );
    expect(respostaVariacao.status).toBe(200);
    const corpoVariacao = await respostaVariacao.json<CorpoLinhaDoTempoSolto>();
    expect(corpoVariacao.pedido.identidade).toBe(ID_PEDIDO);
    expect(corpoVariacao.pedido.codigoBuscado).toBe(codigoComVariacao);
  });

  it("devolve 404 pedido_nao_encontrado para um código inexistente, mas válido no formato", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v2", "PED-999999");

    expect(status).toBe(404);
    expect(corpo.codigo).toBe("pedido_nao_encontrado");
  });

  it("devolve 400 parametro_invalido para código com mais de 40 caracteres, sem consultar o banco", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const codigoMuitoLongo = "A".repeat(41);
    const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v2", codigoMuitoLongo);

    expect(status).toBe(400);
    expect(corpo.codigo).toBe("parametro_invalido");
  });

  it("devolve 400 parametro_invalido para tentativa de injeção SQL, NUNCA 200 com outro pedido", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const tentativaInjecao = "' OR 1=1 --";
    const { status, corpo } = await pedirLinhaDoTempoComErro(app, DB, "v2", tentativaInjecao);

    expect(status).toBe(400);
    expect(status).not.toBe(200);
    expect(corpo.codigo).toBe("parametro_invalido");
  });

  it("qualquer outro caminho sob /api/v2/ devolve 404 rota_nao_encontrada no app REAL (só esta rota existe sob /api/v2)", async () => {
    // Usa a instância `app` real de `web/worker/index.ts` (não uma sub-app
    // isolada), para provar que nenhum prefixo genérico /api/v2/* foi
    // registrado e que só a rota desta tarefa existe de fato sob /api/v2.
    const DB = criarD1TesteComTabelas(TABELAS) as unknown as D1Database;

    const caminhos = ["/api/v2/resumo", "/api/v2/pedidos", "/api/v2/indicadores"];

    for (const caminho of caminhos) {
      const resposta = await appReal.request(caminho, undefined, { DB });
      expect(resposta.status).toBe(404);
      const corpo = await resposta.json<CorpoErroTeste>();
      expect(corpo.codigo).toBe("rota_nao_encontrada");
    }
  });
});
