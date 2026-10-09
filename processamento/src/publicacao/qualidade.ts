/**
 * Projeção do documento `qualidade` (RF-07/RF-08, contrato
 * `contrato/qualidade.ts`).
 *
 * Lê os achados já gravados em `achado_qualidade` (6 dos 7 tipos de
 * `TipoAchado` — ver `dominio/modelo.ts`) e recalcula `fora_de_ordem` (RN-08)
 * a partir dos eventos consolidados, já que esse achado nunca é persistido em
 * `achado_qualidade` por quem grava os eventos (ver `dominio/fora-de-ordem.ts`
 * e `publicacao/linha-do-tempo.ts`, que o recalculam para outro fim). Monta o
 * documento com os 7 tipos sempre presentes (contagem 0 quando não há
 * ocorrência), valida contra `EsquemaRespostaQualidade` e devolve.
 *
 * Os achados, eventos e a cache de IA vêm das consultas do repositório.
 *
 * Projeta também `ia.utilizada`/`ia.sugestoes` a partir de `cache_ia` (ver
 * "Reconstrução das sugestões de IA" mais abaixo).
 * Fora de escopo: os demais documentos (`resumo`/`indicadores`) nunca são
 * tocados por este módulo.
 */
import type { Consultas } from "../armazenamento/consultas.js";
import type { Repositorio } from "../armazenamento/repositorio.js";
import { conferirSugestao } from "../dominio/conferencia-sugestao.js";
import { montarCandidatos } from "../ia/candidatos.js";
import { calcularChaveCache, RESPOSTA_CACHE_SEM_SUGESTAO } from "../ia/chave-cache.js";
import { detectarForaDeOrdem } from "../dominio/fora-de-ordem.js";
import { TIPOS_ACHADO, type AchadoQualidade, type TipoAchado } from "../dominio/modelo.js";
import {
  EsquemaRespostaQualidade,
  type RespostaQualidade,
} from "../contrato/qualidade.js";
import { EsquemaSugestaoIA, type SugestaoIA } from "../contrato/sugestao-ia.js";
import { agruparEventosPorPedido } from "./eventos-por-pedido.js";
import { montarPedidosEVinculos } from "./pedidos.js";

/**
 * Texto fixo da regra por tipo de achado — um por tipo, o mesmo para todas as
 * ocorrências desse tipo (não é copiado do `regra` gravado em cada linha de
 * `achado_qualidade`, que pode variar por achado individual).
 */
const REGRAS: Record<TipoAchado, string> = {
  fora_de_ordem:
    "RN-08: evento recebido fora da ordem canônica (momentoFato, tipo, codigoEvento) dentro da mesma fonte.",
  sem_identificacao:
    "RN-09: referência de pagamento não casou com exatamente 1 código de pedido conhecido.",
  registro_repetido:
    "Código de evento/transação repetido dentro da mesma importação; só a primeira ocorrência gera vínculo/evento.",
  linha_invalida:
    "Linha de CSV malformada (campo obrigatório ausente, tipo fora do enum esperado ou data inválida).",
  valor_fora_do_padrao:
    "RN-10: valor/desconto de item ou pagamento fora do padrão esperado (ex.: preço <= 0, desconto fora de [0,1], valor de pagamento incompatível).",
  formato_data:
    "dataPedido fora do formato curto (YYYY-MM-DD) esperado como padrão da base de vendas.",
  pedido_sem_envio:
    "Pedido sem data de envio (ShippedDate nula na base de vendas de origem).",
};

/** Um achado já com o `id_pedido` resolvido (quando possível), para montar o exemplo. */
type AchadoComPedido = AchadoQualidade & { pedido?: string };

/**
 * Recalcula RN-08 (fora de ordem) a partir de todos os eventos gravados:
 * agrupa por `id_pedido` e chama `detectarForaDeOrdem` por pedido (a função
 * espera eventos já de um único pedido), agregando os achados resultantes com
 * o `id_pedido` correspondente anexado.
 */
function recalcularForaDeOrdem(consultas: Pick<Consultas, "listarEventos">): AchadoComPedido[] {
  const eventosPorPedido = agruparEventosPorPedido(consultas.listarEventos());

  const achados: AchadoComPedido[] = [];
  for (const [idPedido, armazenados] of eventosPorPedido) {
    const resultado = detectarForaDeOrdem(armazenados.map((armazenado) => armazenado.evento));
    for (const achado of resultado.achados) {
      achados.push({ ...achado, pedido: idPedido });
    }
  }
  return achados;
}

/**
 * Mapa `fonte:codigoExterno` → `id_pedido`, lido uma vez. Nem todo achado tem
 * vínculo resolvível (ex.: `sem_identificacao` é, por definição, uma
 * referência que não casou com nenhum pedido) — nesses casos a busca no mapa
 * devolve `undefined`.
 */
function lerPedidoPorVinculo(consultas: Pick<Consultas, "listarVinculos">): Map<string, string> {
  return new Map(
    consultas
      .listarVinculos()
      .map((vinculo) => [`${vinculo.fonte}:${vinculo.codigoExterno}`, vinculo.idPedido]),
  );
}

/** Lê os achados gravados de um tipo específico em `achado_qualidade`, com `pedido` resolvido quando possível. */
function lerAchadosGravados(
  consultas: Pick<Consultas, "listarAchadosPorTipo">,
  pedidoPorVinculo: Map<string, string>,
  tipo: TipoAchado,
): AchadoComPedido[] {
  return consultas.listarAchadosPorTipo(tipo).map((achado): AchadoComPedido => ({
    ...achado,
    pedido: pedidoPorVinculo.get(`${achado.fonte}:${achado.referencia}`),
  }));
}

/** Monta até 10 exemplos `{ fonte, referencia, detalhe, pedido? }` a partir da lista de achados de um tipo. */
function montarExemplos(
  achados: AchadoComPedido[],
): RespostaQualidade["achados"][number]["exemplos"] {
  return achados.slice(0, 10).map((achado) => {
    const exemplo: RespostaQualidade["achados"][number]["exemplos"][number] = {
      fonte: achado.fonte,
      referencia: achado.referencia,
      detalhe: achado.detalhe,
    };
    if (achado.pedido !== undefined) {
      exemplo.pedido = achado.pedido;
    }
    return exemplo;
  });
}

/**
 * Reconstrução das sugestões de IA (`ia.sugestoes`) a partir de `cache_ia`.
 *
 * `cache_ia` só guarda `{ chave, resposta, criado_em, modelo }`; `chave` é um
 * hash SHA-256 não reversível, então não há como ir de uma linha de `cache_ia`
 * direto para "qual pagamento/candidatos geraram esta entrada". A alternativa
 * é refazer, com as mesmas funções de `ia/` (`montarCandidatos`,
 * `calcularChaveCache`), a busca de pagamentos `sem_identificacao` e a
 * montagem de candidatos, recalcular a chave de cache de cada pagamento e
 * conferir se ela existe em `cache_ia`; se existir e não for "sem sugestão", a
 * sugestão é reconstituída e `conferirSugestao` (RN-11) é aplicada na hora —
 * a decisão de conferência nunca é cacheada, só a resposta bruta do provedor.
 *
 * A chave inclui o `modelo`, persistido em `cache_ia.modelo`; a reconstrução
 * tenta os modelos gravados. Entradas antigas (modelo NULL) só são
 * reconstituídas se usaram os modelos de `MODELOS_RECONSTITUICAO`.
 */
const MODELOS_RECONSTITUICAO: readonly string[] = ["falso", "gpt-4o-mini"];

/**
 * Monta `ia.utilizada`/`ia.sugestoes`: `cache_ia` vazia → `{ utilizada:
 * false, sugestoes: [] }`. Com 1+ entradas, `utilizada` é sempre `true`;
 * `sugestoes` só inclui os pagamentos cuja chave recalculada bate com uma
 * entrada de `cache_ia` que não seja "sem sugestão".
 */
function montarBlocoIa(repositorio: Repositorio): RespostaQualidade["ia"] {
  const cache = repositorio.listarCacheIa();
  if (cache.length === 0) {
    return { utilizada: false, sugestoes: [] };
  }

  const cachePorChave = new Map(cache.map((entrada) => [entrada.chave, entrada]));
  const modelosConhecidos = new Set<string>(MODELOS_RECONSTITUICAO);
  for (const entrada of cache) {
    if (entrada.modelo !== null) {
      modelosConhecidos.add(entrada.modelo);
    }
  }
  const { completos: pagamentos } = repositorio.listarPagamentosSemIdentificacao();
  const { pedidoResumo } = montarPedidosEVinculos(repositorio);

  const sugestoes: SugestaoIA[] = [];

  for (const pagamento of pagamentos) {
    const candidatos = montarCandidatos(pedidoResumo, pagamento);
    if (candidatos.length === 0) {
      continue;
    }

    const idsCandidatos = candidatos.map((candidato) => candidato.idPedido);
    let entradaCache: { resposta: string } | undefined;
    for (const modelo of modelosConhecidos) {
      entradaCache = cachePorChave.get(
        calcularChaveCache(pagamento.textoReferencia, idsCandidatos, modelo),
      );
      if (entradaCache !== undefined) {
        break;
      }
    }
    if (entradaCache === undefined || entradaCache.resposta === RESPOSTA_CACHE_SEM_SUGESTAO) {
      continue;
    }

    const candidatoSugerido = candidatos.find(
      (candidato) => candidato.idPedido === entradaCache.resposta,
    );
    if (candidatoSugerido === undefined) {
      // Resposta de provedor que não está entre os candidatos recalculados.
      continue;
    }

    const { conferida, motivo } = conferirSugestao(
      {
        devido: candidatoSugerido.devido,
        pago: candidatoSugerido.pago,
        dataPedido: candidatoSugerido.dataPedido,
      },
      { valor: pagamento.valor, dataPagamento: pagamento.momentoFato },
    );

    sugestoes.push(
      EsquemaSugestaoIA.parse({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: entradaCache.resposta,
        conferida,
        motivo,
      }),
    );
  }

  return { utilizada: true, sugestoes };
}

/**
 * Monta o documento `qualidade`: os 7 tipos de `TipoAchado`, cada um com
 * contagem total, a regra textual fixa e até 10 exemplos (tipo sem nenhuma
 * ocorrência entra com `contagem: 0, exemplos: []`, nunca omitido). `ia` é
 * reconstruída a partir de `cache_ia` (ver `montarBlocoIa`) —
 * `{ utilizada: false, sugestoes: [] }` quando não há nenhuma entrada de
 * cache (Must preservado). Valida o resultado contra
 * `EsquemaRespostaQualidade` antes de devolver — uma falha aqui é bug de
 * montagem, não é absorvida.
 */
export function montarDocumentoQualidade(repositorio: Repositorio): RespostaQualidade {
  const achadosForaDeOrdem = recalcularForaDeOrdem(repositorio);
  const pedidoPorVinculo = lerPedidoPorVinculo(repositorio);

  const achados = TIPOS_ACHADO.map((tipo) => {
    const achadosDoTipo =
      tipo === "fora_de_ordem"
        ? achadosForaDeOrdem
        : lerAchadosGravados(repositorio, pedidoPorVinculo, tipo);

    return {
      tipo,
      contagem: achadosDoTipo.length,
      regra: REGRAS[tipo],
      exemplos: montarExemplos(achadosDoTipo),
    };
  });

  const documento: RespostaQualidade = {
    achados,
    ia: montarBlocoIa(repositorio),
  };

  return EsquemaRespostaQualidade.parse(documento);
}
