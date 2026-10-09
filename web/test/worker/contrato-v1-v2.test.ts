// Teste "validação: contrato v1 e v2" + demonstração no README.
//
// Objetivo: provar, com o MESMO pedido, que a resposta v1 é idêntica
// independentemente de o pagamento gravado na `linha_do_tempo` estar em
// `versao_schema: 1` ou `versao_schema: 2` (a v1 nunca expõe `versao_schema`
// nem `meio_pagamento` — `EsquemaEventoPagamentoV1`, em
// `nucleo/contrato/linha-do-tempo-v1.ts`, usa `z.object()` não
// estrito, que descarta silenciosamente chaves desconhecidas no `.parse()`);
// e que a v2 continua expondo `versao_schema`/`meio_pagamento` corretamente,
// inclusive com pagamentos de versões diferentes misturados no mesmo pedido.
//
// Mesmo padrão de dataset de `linha-do-tempo-v2.test.ts`: fixture
// LOCAL própria (não edita `web/test/apoio/dados-exemplo.ts`), SQL inicial
// montado pelo mesmo caminho de serialização usado em produção
// (`escreverSqlPublicacao` + `leitura-d1.sql`).
//
// "O site não muda" (aceite desta tarefa): nenhuma mudança foi feita em
// `web/src/`. Confirmado por LEITURA (não execução) de
// `web/test/pedido.test.tsx` e `web/test/estado-em-data.test.tsx`
// — os dois testes de tela que consomem a linha do tempo montam a
// resposta esperada via `vi.fn()`/mock de `fetch` com um objeto literal no
// formato v1 (campos `fonte`, `codigoEvento`, `momentoFato`, `tipo`, etc.,
// SEM `versao_schema` nem `meio_pagamento`), e chamam `Pedido.tsx`, que por
// sua vez usa `/api/v1/pedidos/{codigo}/linha-do-tempo` (nunca `/api/v2/`).
// Nada no contrato v1 mudou de forma até aqui — `EsquemaLinhaDoTempoV1` e a
// rota v1 (`web/worker/rotas/linha-do-tempo.ts`) não foram alterados por
// nenhuma tarefa do contrato v2, então os dois testes de
// tela continuam válidos sem qualquer alteração em `web/src/`.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { TabelasParaPublicacao } from "processamento/publicacao/escritor-sql.js";
import { EsquemaLinhaDoTempoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import { EsquemaLinhaDoTempoV2 } from "nucleo/contrato/linha-do-tempo-v2.js";

import { criarD1TesteComTabelas } from "../apoio/fixture.ts";
import type { CorpoLinhaDoTempoSolto } from "../apoio/corpo-teste.ts";
import { obrigatorio } from "../apoio/obrigatorio.ts";
import { rotaLinhaDoTempo } from "../../worker/rotas/linha-do-tempo.ts";
import { rotaLinhaDoTempoV2 } from "../../worker/rotas/linha-do-tempo-v2.ts";

/** Instância Hono local com as duas rotas (v1 e v2) registradas. */
function criarAppDeTeste() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/", rotaLinhaDoTempo);
  app.route("/", rotaLinhaDoTempoV2);
  return app;
}

const ID_PEDIDO = "PED-300001";

/** Fontes/divergência idênticas nas fixtures A e B — só o pagamento varia. */
const FONTES_COMUNS = JSON.stringify({ vendas: "VENDA-A", pagamentos: "PAG-A" });

const EVENTO_VENDA_COMUM = {
  id_pedido: ID_PEDIDO,
  posicao: 0,
  codigo_evento: "EVT-V-A",
  fonte: "vendas",
  tipo: "fato",
  momento_fato: "2026-03-01T10:00:00Z",
  versao_schema: 1,
  dados: JSON.stringify({
    tipo: "venda",
    valor_devido: 300,
    data_limite: "2026-03-10",
    transportadora: "Transportadora A",
  }),
  fora_de_ordem: 0,
} as const;

const DIVERGENCIA_COMUM = {
  tipo: "parcial",
  id_pedido: ID_PEDIDO,
  motivo: "Pagamento parcial identificado.",
  eventos: "[]",
} as const;

/** Fixture A: pagamento gravado como v1 (sem `meio_pagamento`). */
const TABELAS_A: TabelasParaPublicacao = {
  pedido_resumo: [
    {
      id_pedido: ID_PEDIDO,
      valor_devido: 300,
      valor_pago: 300,
      data_limite: "2026-03-10",
      situacao_pagamento: "pago",
      fontes: FONTES_COMUNS,
    },
  ],
  vinculo_codigo: [
    { codigo: ID_PEDIDO, fonte: "pedido", id_pedido: ID_PEDIDO },
    { codigo: "VENDA-A", fonte: "vendas", id_pedido: ID_PEDIDO },
  ],
  linha_do_tempo: [
    EVENTO_VENDA_COMUM,
    {
      id_pedido: ID_PEDIDO,
      posicao: 1,
      codigo_evento: "EVT-P-A",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-03-05T10:00:00Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "pagamento",
        valor: 300,
        referencia_original: "PAG-A",
      }),
      fora_de_ordem: 0,
    },
  ],
  divergencia: [DIVERGENCIA_COMUM],
  documento: [],
};

/**
 * Fixture B: MESMO pedido/valor, mas o pagamento é gravado como v2
 * (`versao_schema: 2`, `dados` com `meio_pagamento: 'pix'`).
 */
const TABELAS_B: TabelasParaPublicacao = {
  pedido_resumo: TABELAS_A.pedido_resumo,
  vinculo_codigo: TABELAS_A.vinculo_codigo,
  linha_do_tempo: [
    EVENTO_VENDA_COMUM,
    {
      id_pedido: ID_PEDIDO,
      posicao: 1,
      codigo_evento: "EVT-P-A",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-03-05T10:00:00Z",
      versao_schema: 2,
      dados: JSON.stringify({
        tipo: "pagamento",
        versao_schema: 2,
        valor: 300,
        referencia_original: "PAG-A",
        meio_pagamento: "pix",
      }),
      fora_de_ordem: 0,
    },
  ],
  divergencia: [DIVERGENCIA_COMUM],
  documento: [],
};

const ID_PEDIDO_MISTO = "PED-300002";

/**
 * Fixture mista (caso de borda): 2 transações de pagamento no mesmo pedido,
 * uma v1 e uma v2. `pedido_resumo.valor_pago` já vem pronto como a soma dos
 * dois (100 + 150 = 250) — essa soma é responsabilidade da projeção
 * `pedido_resumo`, não desta rota, então a fixture já a traz calculada.
 */
const TABELAS_MISTA: TabelasParaPublicacao = {
  pedido_resumo: [
    {
      id_pedido: ID_PEDIDO_MISTO,
      valor_devido: 250,
      valor_pago: 250,
      data_limite: "2026-03-20",
      situacao_pagamento: "pago",
      fontes: JSON.stringify({ vendas: "VENDA-M", pagamentos: "PAG-M1" }),
    },
  ],
  vinculo_codigo: [
    { codigo: ID_PEDIDO_MISTO, fonte: "pedido", id_pedido: ID_PEDIDO_MISTO },
  ],
  linha_do_tempo: [
    {
      id_pedido: ID_PEDIDO_MISTO,
      posicao: 0,
      codigo_evento: "EVT-V-M",
      fonte: "vendas",
      tipo: "fato",
      momento_fato: "2026-03-11T10:00:00Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "venda",
        valor_devido: 250,
        data_limite: "2026-03-20",
        transportadora: "Transportadora M",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: ID_PEDIDO_MISTO,
      posicao: 1,
      codigo_evento: "EVT-P-M1",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-03-12T10:00:00Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "pagamento",
        valor: 100,
        referencia_original: "PAG-M1",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: ID_PEDIDO_MISTO,
      posicao: 2,
      codigo_evento: "EVT-P-M2",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-03-13T10:00:00Z",
      versao_schema: 2,
      dados: JSON.stringify({
        tipo: "pagamento",
        versao_schema: 2,
        valor: 150,
        referencia_original: "PAG-M2",
        meio_pagamento: "cartao",
      }),
      fora_de_ordem: 0,
    },
  ],
  divergencia: [],
  documento: [],
};

describe("validação: contrato v1 e v2", () => {
  it("v1 devolve a mesma resposta para o mesmo pedido, com o pagamento gravado como v1 ou v2", async () => {
    const appA = criarAppDeTeste();
    const DB_A = criarD1TesteComTabelas(TABELAS_A) as unknown as D1Database;
    const respostaA = await appA.request(
      `/api/v1/pedidos/${ID_PEDIDO}/linha-do-tempo`,
      undefined,
      { DB: DB_A },
    );
    expect(respostaA.status).toBe(200);
    const corpoA = await respostaA.json<CorpoLinhaDoTempoSolto>();

    const appB = criarAppDeTeste();
    const DB_B = criarD1TesteComTabelas(TABELAS_B) as unknown as D1Database;
    const respostaB = await appB.request(
      `/api/v1/pedidos/${ID_PEDIDO}/linha-do-tempo`,
      undefined,
      { DB: DB_B },
    );
    expect(respostaB.status).toBe(200);
    const corpoB = await respostaB.json<CorpoLinhaDoTempoSolto>();

    // Igualdade estrutural profunda — as duas respostas v1 são IDÊNTICAS: o
    // pagamento v2 (fixture B) fica indistinguível do v1 (fixture A) na
    // resposta v1, porque `versao_schema`/`meio_pagamento` nunca são
    // expostos por `EsquemaEventoPagamentoV1`.
    expect(corpoB).toEqual(corpoA);

    const validacaoA = EsquemaLinhaDoTempoV1.safeParse(corpoA);
    const validacaoB = EsquemaLinhaDoTempoV1.safeParse(corpoB);
    expect(validacaoA.success).toBe(true);
    expect(validacaoB.success).toBe(true);

    // Nenhum dos dois eventos de pagamento expõe versao_schema/meio_pagamento.
    for (const corpo of [corpoA, corpoB]) {
      const eventoPagamento = obrigatorio(corpo.eventos.find(
        (e) => e.tipo === "pagamento",
      ))
      expect(eventoPagamento).toBeDefined();
      expect(eventoPagamento).not.toHaveProperty("versao_schema");
      expect(eventoPagamento).not.toHaveProperty("meio_pagamento");
    }
  });

  it("v2 traz versao_schema e meio_pagamento para o pagamento gravado como v2 (fixture B)", async () => {
    const app = criarAppDeTeste();
    const DB = criarD1TesteComTabelas(TABELAS_B) as unknown as D1Database;

    const resposta = await app.request(
      `/api/v2/pedidos/${ID_PEDIDO}/linha-do-tempo`,
      undefined,
      { DB },
    );
    expect(resposta.status).toBe(200);
    const corpo = await resposta.json<CorpoLinhaDoTempoSolto>();

    const validacao = EsquemaLinhaDoTempoV2.safeParse(corpo);
    expect(validacao.success).toBe(true);

    const eventoPagamento = obrigatorio(corpo.eventos.find(
      (e) => e.tipo === "pagamento",
    ))
    expect(eventoPagamento).toBeDefined();
    expect(eventoPagamento.versao_schema).toBe(2);
    expect(eventoPagamento.meio_pagamento).toBe("pix");
  });

  it("caso de borda — pedido com pagamentos v1 e v2 misturados: v1 mostra os 2 sem versão, v2 mostra cada um com a sua versão", async () => {
    const appV1 = criarAppDeTeste();
    const DB_V1 = criarD1TesteComTabelas(TABELAS_MISTA) as unknown as D1Database;
    const respostaV1 = await appV1.request(
      `/api/v1/pedidos/${ID_PEDIDO_MISTO}/linha-do-tempo`,
      undefined,
      { DB: DB_V1 },
    );
    expect(respostaV1.status).toBe(200);
    const corpoV1 = await respostaV1.json<CorpoLinhaDoTempoSolto>();

    const validacaoV1 = EsquemaLinhaDoTempoV1.safeParse(corpoV1);
    expect(validacaoV1.success).toBe(true);

    const pagamentosV1 = corpoV1.eventos.filter(
      (e) => e.tipo === "pagamento",
    );
    expect(pagamentosV1).toHaveLength(2);
    for (const evento of pagamentosV1) {
      expect(evento).not.toHaveProperty("versao_schema");
      expect(evento).not.toHaveProperty("meio_pagamento");
    }
    expect(pagamentosV1.map((e) => e.valor)).toEqual([100, 150]);
    expect(corpoV1.pedido.pago).toBe(250);

    const appV2 = criarAppDeTeste();
    const DB_V2 = criarD1TesteComTabelas(TABELAS_MISTA) as unknown as D1Database;
    const respostaV2 = await appV2.request(
      `/api/v2/pedidos/${ID_PEDIDO_MISTO}/linha-do-tempo`,
      undefined,
      { DB: DB_V2 },
    );
    expect(respostaV2.status).toBe(200);
    const corpoV2 = await respostaV2.json<CorpoLinhaDoTempoSolto>();

    const validacaoV2 = EsquemaLinhaDoTempoV2.safeParse(corpoV2);
    expect(validacaoV2.success).toBe(true);

    const pagamentosV2 = corpoV2.eventos.filter(
      (e) => e.tipo === "pagamento",
    );
    expect(pagamentosV2).toHaveLength(2);
    expect(pagamentosV2.map((e) => e.versao_schema)).toEqual([
      1, 2,
    ]);
    expect(pagamentosV2[0]).not.toHaveProperty("meio_pagamento");
    expect(obrigatorio(pagamentosV2[1]).meio_pagamento).toBe("cartao");
  });
});
