// TP-0052 — Cliente de API do frontend: `fetch` com tempo limite, validação
// do corpo pelo esquema do contrato e tradução para um resultado que nunca
// expõe `detail`/status/corpo bruto ao usuário.
//
// `EsquemaErro` vem de `processamento/src/contrato/erro.ts` (TP-0029),
// importado via especificador de pacote (`processamento/contrato/erro.js`),
// resolvido pelo campo `exports` de `processamento/package.json` através do
// symlink do workspace (`web/package.json` declara
// `"processamento": "workspace:*"`) — mesmo padrão usado em
// `web/worker/erros.ts`.
import type { z } from "zod";
import { EsquemaErro } from "processamento/contrato/erro.js";

const TEMPO_LIMITE_MS = 10_000;

/** Resultado de uma consulta à API — nunca contém `detail`, status HTTP ou corpo bruto. */
export type ResultadoConsulta<T> =
  | { tipo: "sucesso"; dados: T }
  | { tipo: "erro"; mensagem: string; codigo?: string }
  | { tipo: "cancelada" };

// Texto fixo em português. NUNCA interpolar aqui `detail`, `title`, `type`
// do corpo RFC 9457, status HTTP ou qualquer corpo bruto da resposta — só
// estas mensagens estáticas e, quando houver, o `codigo` curto do contrato.
export const MENSAGEM_FORMATO_INESPERADO =
  "Os dados recebidos estão em formato inesperado.";
export const MENSAGEM_CONSULTA_INVALIDA =
  "Não foi possível processar essa consulta.";
export const MENSAGEM_INDISPONIVEL =
  "Não foi possível consultar os dados agora. Tente de novo em alguns segundos.";
export const MENSAGEM_TEMPO_ESGOTADO = "A consulta demorou demais.";
export const MENSAGEM_SEM_CONEXAO = "Sem conexão com o servidor.";

interface OpcoesConsulta {
  /** Sinal externo (ex.: cancelamento por troca de URL/desmonte). */
  signal?: AbortSignal;
}

/**
 * Consulta `caminho` via `fetch`, com tempo limite interno de 10s, e valida
 * a resposta com `esquema`. Combina um `AbortController` próprio (para o
 * tempo limite) com o `signal` externo opcional — abortar por qualquer um
 * dos dois motivos aborta a mesma requisição, mas o resultado devolvido
 * distingue os dois casos (timeout gera mensagem; cancelamento externo é
 * silencioso).
 */
export async function consultarApi<T>(
  caminho: string,
  esquema: z.ZodType<T>,
  opcoes?: OpcoesConsulta,
): Promise<ResultadoConsulta<T>> {
  const controller = new AbortController();
  // Flag própria para distinguir o motivo do abort — não depender do nome
  // do erro do DOM (`AbortError`), que varia entre ambientes/mocks.
  let abortadoPorTempoLimite = false;

  const temporizador = setTimeout(() => {
    abortadoPorTempoLimite = true;
    controller.abort();
  }, TEMPO_LIMITE_MS);

  const signalExterno = opcoes?.signal;
  const aoAbortarExterno = () => controller.abort();
  if (signalExterno) {
    if (signalExterno.aborted) {
      controller.abort();
    } else {
      signalExterno.addEventListener("abort", aoAbortarExterno);
    }
  }

  try {
    const resposta = await fetch(caminho, { signal: controller.signal });

    if (resposta.ok) {
      let corpo: unknown;
      try {
        corpo = await resposta.json();
      } catch {
        return { tipo: "erro", mensagem: MENSAGEM_FORMATO_INESPERADO };
      }

      const resultado = esquema.safeParse(corpo);
      if (!resultado.success) {
        return { tipo: "erro", mensagem: MENSAGEM_FORMATO_INESPERADO };
      }

      return { tipo: "sucesso", dados: resultado.data };
    }

    let corpoErro: unknown;
    try {
      corpoErro = await resposta.json();
    } catch {
      return { tipo: "erro", mensagem: MENSAGEM_FORMATO_INESPERADO };
    }

    const resultadoErro = EsquemaErro.safeParse(corpoErro);
    if (!resultadoErro.success) {
      return { tipo: "erro", mensagem: MENSAGEM_FORMATO_INESPERADO };
    }

    const { codigo, status } = resultadoErro.data;
    if (status >= 500) {
      return { tipo: "erro", mensagem: MENSAGEM_INDISPONIVEL, codigo };
    }
    return { tipo: "erro", mensagem: MENSAGEM_CONSULTA_INVALIDA, codigo };
  } catch {
    if (controller.signal.aborted) {
      if (abortadoPorTempoLimite) {
        return { tipo: "erro", mensagem: MENSAGEM_TEMPO_ESGOTADO };
      }
      // Cancelada pelo `signal` externo (ou já abortada antes de chamar) —
      // silenciosa: nenhuma mensagem é exposta.
      return { tipo: "cancelada" };
    }
    // Qualquer outro motivo de falha do `fetch` (sem rede, DNS, etc.).
    return { tipo: "erro", mensagem: MENSAGEM_SEM_CONEXAO };
  } finally {
    clearTimeout(temporizador);
    if (signalExterno) {
      signalExterno.removeEventListener("abort", aoAbortarExterno);
    }
  }
}
