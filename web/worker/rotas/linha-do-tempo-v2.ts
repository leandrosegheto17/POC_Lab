// TP-0077 — GET /api/v2/pedidos/{codigo}/linha-do-tempo.
//
// Espelha `linha-do-tempo.ts` (TP-0048, v1) na resolução/erros: mesmo
// validador de parâmetro, mesmas consultas reutilizadas de `../consultas.js`
// (NENHUMA consulta nova aqui), mesmo 400/404. A única diferença real é a
// montagem da resposta, validada contra `EsquemaLinhaDoTempoV2` em vez de
// `EsquemaLinhaDoTempoV1`.
//
// NÃO registrado em `web/worker/index.ts` por este arquivo — mesmo padrão de
// `linha-do-tempo.ts`: só exportamos a sub-app Hono já montada.
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { EsquemaParametroCodigo, normalizarCodigo } from "processamento/contrato/codigo.js";
import { EsquemaLinhaDoTempoV2 } from "processamento/contrato/linha-do-tempo-v2.js";

import { hookValidacaoZod, problema } from "../erros.js";
import {
  listarDivergenciasDoPedido,
  listarLinhaDoTempo,
  resolverPedidoComResumo,
} from "../consultas.js";

/**
 * Formato armazenado em `pedido_resumo.fontes` (TP-0032/TP-0039).
 *
 * Repetido aqui (não importado de `linha-do-tempo.ts`) porque aquele módulo
 * não exporta este tipo e não deve ser alterado — G-21, mesma lógica já
 * documentada em `linha-do-tempo-v2.ts` do contrato.
 */
interface FontesPedido {
  vendas?: string;
  pagamentos?: string;
  rastreio?: string;
}

const CHAVES_FONTE = ["vendas", "pagamentos", "rastreio"] as const;

/**
 * Sub-app Hono só com esta rota — mesmo padrão de `linha-do-tempo.ts`, para
 * que o teste possa registrá-la isoladamente e `index.ts` componha via
 * `app.route('/', rotaLinhaDoTempoV2)`.
 */
export const rotaLinhaDoTempoV2 = new Hono<{ Bindings: { DB: D1Database } }>();

rotaLinhaDoTempoV2.get(
  "/api/v2/pedidos/:codigo/linha-do-tempo",
  zValidator("param", z.object({ codigo: EsquemaParametroCodigo }), hookValidacaoZod),
  async (c) => {
    // Mesma resolução da v1: código CRU enviado na URL vai para
    // `pedido.codigoBuscado`, nunca o normalizado.
    const codigo = c.req.valid("param").codigo;
    const codigoNormalizado = normalizarCodigo(codigo);

    const pedidoResumo = await resolverPedidoComResumo(c.env.DB, codigoNormalizado);
    if (pedidoResumo === null) {
      return problema("pedido_nao_encontrado", 404);
    }

    const [linhaDoTempo, divergencias] = await Promise.all([
      listarLinhaDoTempo(c.env.DB, pedidoResumo.id_pedido),
      listarDivergenciasDoPedido(c.env.DB, pedidoResumo.id_pedido),
    ]);

    const fontes = JSON.parse(pedidoResumo.fontes) as FontesPedido;
    const fontesResposta = CHAVES_FONTE.filter((chave) => fontes[chave] !== undefined).map(
      (chave) => ({ fonte: chave, codigo: fontes[chave] as string }),
    );

    const resposta = EsquemaLinhaDoTempoV2.parse({
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
      // Diferença real frente à v1: expomos `versao_schema` (lido direto da
      // coluna `versao_schema` da linha SQL, não do payload) e preservamos
      // os campos específicos da versão gravada em `dados`, em vez de
      // descartá-los. O payload gravado já usa snake_case
      // (`referencia_original`, `meio_pagamento` — ver `dominio/evento.ts`),
      // e `EsquemaEventoV2` (TP-0076) espera esses mesmos nomes — nenhum
      // remapeamento de campo é necessário, só espalhar `dados` por cima do
      // envelope.
      eventos: linhaDoTempo.map((linha) => {
        const dados = JSON.parse(linha.dados) as Record<string, unknown>;

        return {
          ...dados,
          fonte: linha.fonte,
          codigoEvento: linha.codigo_evento,
          momentoFato: linha.momento_fato,
          versao_schema: linha.versao_schema,
          chegouForaDeOrdem: Boolean(linha.fora_de_ordem),
        };
      }),
    });

    return c.json(resposta);
  },
);
