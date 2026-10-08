// TP-0048 — GET /api/v1/pedidos/{codigo}/linha-do-tempo.
//
// NÃO registrado em `web/worker/index.ts` por este arquivo (outra etapa do
// orquestrador liga todas as rotas do lote de uma vez) — aqui só exportamos
// o handler/sub-app Hono já montado, pronto para ser `app.route(...)`
// ou reaproveitado por `app.get(...)` em `index.ts`.
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { EsquemaParametroCodigo, normalizarCodigo } from "processamento/contrato/codigo.js";
import { EsquemaLinhaDoTempoV1 } from "processamento/contrato/linha-do-tempo-v1.js";

import { hookValidacaoZod, problema } from "../erros.js";
import {
  listarDivergenciasDoPedido,
  listarLinhaDoTempo,
  resolverPedidoComResumo,
} from "../consultas.js";

/** Formato armazenado em `pedido_resumo.fontes` (TP-0032/TP-0039). */
interface FontesPedido {
  vendas?: string;
  pagamentos?: string;
  rastreio?: string;
}

const CHAVES_FONTE = ["vendas", "pagamentos", "rastreio"] as const;

/**
 * Sub-app Hono só com esta rota — montado isoladamente para que o teste
 * possa registrá-la numa instância local (ver plano de teste da tarefa) e
 * para que `index.ts` possa compor via `app.route('/', rotaLinhaDoTempo)`
 * sem este arquivo precisar saber nada sobre o restante do roteamento.
 */
export const rotaLinhaDoTempo = new Hono<{ Bindings: { DB: D1Database } }>();

rotaLinhaDoTempo.get(
  "/api/v1/pedidos/:codigo/linha-do-tempo",
  zValidator("param", z.object({ codigo: EsquemaParametroCodigo }), hookValidacaoZod),
  async (c) => {
    // O código CRU enviado na URL (antes de normalizar) — é o valor que a
    // resposta devolve em `pedido.codigoBuscado` (aceite da tarefa), nunca
    // o normalizado.
    const codigo = c.req.valid("param").codigo;
    const codigoNormalizado = normalizarCodigo(codigo);

    // 1ª consulta: resolve `vinculo_codigo` + `pedido_resumo` num JOIN só.
    const pedidoResumo = await resolverPedidoComResumo(c.env.DB, codigoNormalizado);
    if (pedidoResumo === null) {
      return problema("pedido_nao_encontrado", 404);
    }

    // 2ª consulta: eventos da linha do tempo, já em ordem canônica
    // (`ORDER BY posicao`).
    //
    // 3ª consulta (adicional ao orçamento "≤ 2 consultas" da resolução +
    // timeline): divergências do pedido. O orçamento de "≤ 2 consultas" do
    // aceite da TP-0048 cobre resolução+resumo (1) e a linha do tempo em si
    // (2); a consulta de divergências é uma leitura extra, justificada por
    // SDD §2 — a tela de linha do tempo também mostra as divergências já
    // detectadas do mesmo pedido, como parte da mesma experiência. As duas
    // últimas consultas não dependem uma da outra, por isso disparam em
    // paralelo.
    const [linhaDoTempo, divergencias] = await Promise.all([
      listarLinhaDoTempo(c.env.DB, pedidoResumo.id_pedido),
      listarDivergenciasDoPedido(c.env.DB, pedidoResumo.id_pedido),
    ]);

    const fontes = JSON.parse(pedidoResumo.fontes) as FontesPedido;
    const fontesResposta = CHAVES_FONTE.filter((chave) => fontes[chave] !== undefined).map(
      (chave) => ({ fonte: chave, codigo: fontes[chave] as string }),
    );

    const resposta = EsquemaLinhaDoTempoV1.parse({
      pedido: {
        identidade: pedidoResumo.id_pedido,
        codigoBuscado: codigo,
        fontes: fontesResposta,
        devido: pedidoResumo.valor_devido,
        pago: pedidoResumo.valor_pago,
        dataLimite: pedidoResumo.data_limite,
        divergencias: divergencias.map((linha) => ({
          tipo: linha.tipo,
          motivo: linha.motivo,
        })),
      },
      // `JSON.parse(linha.dados)` já tem `tipo`/campos específicos do
      // payload do evento; espalhamos por cima o envelope (`fonte`,
      // `codigoEvento`, `momentoFato`, `chegouForaDeOrdem`). NÃO incluímos
      // `versao_schema` manualmente — se o payload de `dados` já carregar
      // essa chave (ou qualquer outra desconhecida, ex. de uma v2 futura),
      // ela é descartada pelo `.parse()` de `EsquemaEventoV1` abaixo, que
      // usa `z.object()` simples (sem `.strict()`) de propósito (G-21).
      eventos: linhaDoTempo.map((linha) => ({
        ...(JSON.parse(linha.dados) as Record<string, unknown>),
        fonte: linha.fonte,
        codigoEvento: linha.codigo_evento,
        momentoFato: linha.momento_fato,
        chegouForaDeOrdem: Boolean(linha.fora_de_ordem),
      })),
    });

    return c.json(resposta);
  },
);
