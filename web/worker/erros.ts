// Erros centrais da API (RFC 9457 / application/problem+json).
//
// `EsquemaErro`/`CodigoErro` vêm de `processamento/src/contrato/erro.ts`,
// importados via especificador de pacote
// (`processamento/contrato/erro.js`), resolvido pelo campo `exports` de
// `processamento/package.json` através do symlink do workspace
// (`web/package.json` declara `"processamento": "workspace:*"`). Isso NÃO
// está sujeito à checagem de `rootDir` do `web/tsconfig.json`, porque o
// TypeScript trata arquivos resolvidos via `node_modules` como dependências,
// não como arquivos de entrada do programa — diferente de um import
// relativo profundo (`../../../processamento/src/...`), que continuaria
// disparando `TS6059`.
import { EsquemaErro, type CodigoErro } from "processamento/contrato/erro.js";

interface ItemErroCampo {
  campo: string;
  mensagem: string;
}

// Texto fixo em português por código de erro. NUNCA interpolar aqui
// mensagem de exceção, stack trace ou erro de SQL — `detail` é sempre um
// texto genérico e estático.
const DETALHE_POR_CODIGO: Record<CodigoErro, string> = {
  parametro_invalido: "Um ou mais parâmetros da requisição são inválidos.",
  pedido_nao_encontrado: "O pedido solicitado não foi encontrado.",
  rota_nao_encontrada: "A rota solicitada não existe.",
  metodo_nao_permitido: "O método HTTP usado não é permitido para esta rota.",
  erro_interno: "Ocorreu um erro interno ao processar a requisição.",
};

const TITULO_POR_CODIGO: Record<CodigoErro, string> = {
  parametro_invalido: "Parâmetro inválido",
  pedido_nao_encontrado: "Pedido não encontrado",
  rota_nao_encontrada: "Rota não encontrada",
  metodo_nao_permitido: "Método não permitido",
  erro_interno: "Erro interno",
};

/**
 * Monta e devolve uma `Response` de erro no formato RFC 9457 (Problem
 * Details), com `Content-Type: application/problem+json`.
 *
 * `erros` só é aceito (e deve ser não vazio) quando `status` é 400 — fora
 * disso, não é incluído no corpo. `detail` é sempre o texto fixo do
 * código (nunca contém detalhe de exceção real).
 */
export function problema(
  codigo: CodigoErro,
  status: number,
  erros?: ItemErroCampo[],
): Response {
  const corpo = {
    type: `https://poc-lab.dev/erros/${codigo}`,
    title: TITULO_POR_CODIGO[codigo],
    status,
    detail: DETALHE_POR_CODIGO[codigo],
    codigo,
    ...(erros !== undefined ? { erros } : {}),
  };

  // Garante, internamente, que nunca devolvemos um corpo fora do formato
  // esperado (ex.: 400 sem `erros`, ou `erros` vazio, ou status != 400 com
  // `erros` informado).
  EsquemaErro.parse(corpo);

  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
}

/**
 * Formato mínimo do resultado de validação que o `hook` do
 * `@hono/zod-validator` recebe (sucesso ou falha), o suficiente para este
 * auxiliar sem depender dos tipos exatos exportados pelo pacote.
 */
interface ResultadoValidacaoZod {
  success: boolean;
  error?: {
    issues: Array<{ path: PropertyKey[]; message: string }>;
  };
}

/**
 * Auxiliar para usar como `hook` do `@hono/zod-validator`: em caso de
 * falha de validação, devolve 400 `parametro_invalido` com `erros`
 * (campo + mensagem) extraído dos issues do zod. Em caso de sucesso, não
 * devolve nada (deixa o Hono seguir o fluxo normal).
 *
 * Uso:
 *
 * ```ts
 * app.get('/api/pedidos', zValidator('query', esquema, hookValidacaoZod), (c) => { ... })
 * ```
 */
export function hookValidacaoZod(
  resultado: ResultadoValidacaoZod,
): Response | undefined {
  if (resultado.success) {
    return undefined;
  }

  const issues = resultado.error?.issues ?? [];
  const erros: ItemErroCampo[] =
    issues.length > 0
      ? issues.map((issue) => ({
          campo: issue.path.length > 0 ? issue.path.map(String).join(".") :"(desconhecido)",
          mensagem: issue.message,
        }))
      : [{ campo: "(desconhecido)", mensagem: "Falha de validação." }];

  return problema("parametro_invalido", 400, erros);
}
