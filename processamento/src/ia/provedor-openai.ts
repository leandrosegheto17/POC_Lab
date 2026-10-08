import { z } from "zod";

import type { ProvedorSugestao } from "./porta.js";

/**
 * TP-0082 — Provedor de `ProvedorSugestao` (TP-0081) via chamada HTTP direta
 * à API da OpenAI (chat/completions), usando `fetch` nativo — proibido usar
 * SDK de IA (G-17).
 *
 * Decisões de segurança (ADR-010, G-01, G-09):
 *   - A chave só é lida de `process.env.OPENAI_API_KEY`, nunca hardcoded, e
 *     dentro de `sugerir` (não no módulo), para refletir o ambiente no
 *     momento exato da chamada; sem chave, devolve `null` imediatamente, sem
 *     chamar `fetchFn` (defesa em profundidade — quem decide "chamar ou não"
 *     é o chamador desta porta, TP-0083).
 *   - O texto da referência e a lista de candidatos vão SEMPRE dentro do
 *     corpo da requisição como DADO (`content` da mensagem `user`,
 *     serializado em JSON), nunca como instrução de sistema que mude o
 *     comportamento do modelo — a mensagem `system` é fixa e não depende de
 *     nenhum dado de entrada.
 *   - A resposta é validada por um esquema zod local e só é aceita se for
 *     literalmente uma das strings de `candidatos` (`includes` estrito); caso
 *     contrário, ou em qualquer erro de rede/HTTP/parsing, devolve `null`
 *     ("sem sugestão"), nunca lança.
 */

const INSTRUCAO_SISTEMA =
  "Responda apenas com uma das identidades da lista de candidatos, ou a palavra NENHUM se nenhuma for compatível.";

const URL_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";

/** Esquema mínimo da resposta da OpenAI relevante para extrair o texto escolhido. */
const EsquemaRespostaProvedor = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

/**
 * Cria um `ProvedorSugestao` que chama a API de chat/completions da OpenAI.
 *
 * `fetchFn` é injetável para testes (default: `fetch` global); nunca usa SDK
 * oficial de IA (G-17).
 */
export function criarProvedorOpenAI(fetchFn: typeof fetch = fetch): ProvedorSugestao {
  return {
    async sugerir(texto: string, candidatos: string[], modelo: string): Promise<string | null> {
      const chave = process.env.OPENAI_API_KEY;
      if (!chave) {
        return null;
      }

      try {
        const resposta = await fetchFn(URL_CHAT_COMPLETIONS, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${chave}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: "system", content: INSTRUCAO_SISTEMA },
              { role: "user", content: JSON.stringify({ texto, candidatos }) },
            ],
          }),
        });

        if (!resposta.ok) {
          return null;
        }

        const corpo = await resposta.json();
        const validacao = EsquemaRespostaProvedor.safeParse(corpo);
        if (!validacao.success) {
          return null;
        }

        const textoResposta = validacao.data.choices[0].message.content.trim();
        if (!candidatos.includes(textoResposta)) {
          return null;
        }

        return textoResposta;
      } catch {
        return null;
      }
    },
  };
}
