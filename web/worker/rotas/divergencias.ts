// TP-0047 — GET /api/v1/divergencias.
//
// NÃO registrado em `web/worker/index.ts` por este arquivo — outra etapa do
// orquestrador liga todas as rotas do Lote 9 (TP-0046 a TP-0050) numa única
// edição sequencial, para evitar conflito de edição concorrente em
// `index.ts`. Este arquivo só exporta o sub-app Hono já com a rota
// registrada (caminho completo, `/api/v1/divergencias`), pronto para ser
// composto via `app.route('/', rotaDivergencias)` em `index.ts` — mesma
// convenção de `./linha-do-tempo.ts` (TP-0048), que também precisa de um
// `zValidator` como middleware (aqui, de `query`, não de `param`) e por
// isso não pode ser só uma função `handler` solta como em `./resumo.ts`,
// `./qualidade.ts` ou `./indicadores.ts` (essas não validam parâmetro
// nenhum).
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { EsquemaConsultaDivergencias } from "processamento/contrato/parametros.js";
import { EsquemaRespostaDivergencias } from "processamento/contrato/divergencias.js";

import { hookValidacaoZod } from "../erros.js";
import { contarDivergencias, listarDivergencias } from "../consultas.js";

/**
 * Sub-app Hono só com esta rota — montado isoladamente para que o teste
 * possa registrá-la numa instância local (mesma convenção de
 * `./linha-do-tempo.ts`/`erros.test.ts`) e para que `index.ts` possa compor
 * via `app.route('/', rotaDivergencias)` sem este arquivo precisar saber
 * nada sobre o restante do roteamento.
 */
export const rotaDivergencias = new Hono<{ Bindings: { DB: D1Database } }>();

rotaDivergencias.get(
  "/api/v1/divergencias",
  zValidator("query", EsquemaConsultaDivergencias, hookValidacaoZod),
  async (c) => {
    // `tipo`/`pagina`/`tamanho` já validados e coagidos pelo zod
    // (`EsquemaConsultaDivergencias`): `pagina`/`tamanho` sempre números
    // inteiros aqui, com os padrões (1/50) já aplicados quando ausentes;
    // parâmetro desconhecido ou `tipo` fora do enum já teria devolvido 400
    // via `hookValidacaoZod`, antes de chegar neste handler.
    const { tipo, pagina, tamanho } = c.req.valid("query");

    // `contarDivergencias`/`listarDivergencias` (TP-0047, `../consultas.ts`)
    // não dependem uma da outra — disparam em paralelo. O `offset` é
    // calculado internamente por `listarDivergencias` a partir de
    // `pagina`/`tamanho`.
    const [total, linhas] = await Promise.all([
      contarDivergencias(c.env.DB, tipo),
      listarDivergencias(c.env.DB, tipo, pagina, tamanho),
    ]);

    // Página além da última: `LIMIT/OFFSET` já devolve `linhas: []`
    // naturalmente — nenhuma lógica extra necessária aqui; `total`/
    // `totalPaginas` continuam refletindo o total real (nunca zerado só
    // porque a página pedida está vazia).
    const resposta = EsquemaRespostaDivergencias.parse({
      dados: linhas.map((linha) => ({
        pedido: linha.id_pedido,
        tipo: linha.tipo,
        motivo: linha.motivo,
        eventos: JSON.parse(linha.eventos) as unknown,
      })),
      paginacao: {
        pagina,
        tamanho,
        total,
        totalPaginas: total === 0 ? 0 : Math.ceil(total / tamanho),
      },
    });

    return c.json(resposta);
  },
);
