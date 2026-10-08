import { createHash } from "node:crypto";

import type { BlocoIndicador, LinhaIndicador } from "../dominio/indicadores.js";
import type { Totais } from "../dominio/totais.js";
import type { TipoDivergencia } from "../dominio/modelo.js";
import { EsquemaResumo, type Resumo, type Cartao } from "../contrato/resumo.js";
import {
  EsquemaRespostaIndicadores,
  type RespostaIndicadores,
  type BlocoIndicador as EsquemaBlocoIndicadorType,
  type LinhaIndicador as EsquemaLinhaIndicadorType,
} from "../contrato/indicadores.js";

/**
 * TP-0039 — Mapeamento explícito entre as formas do domínio
 * (`dominio/totais.ts`, `dominio/indicadores.ts`) e as formas do contrato
 * (`contrato/resumo.ts`, `contrato/indicadores.ts`).
 *
 * As duas formas são DIFERENTES DE PROPÓSITO, não uma incompatibilidade a
 * corrigir: o domínio carrega o cálculo completo por `BlocoIndicador` (com
 * `linhas[]` e, dentro de cada linha, `rotulos: string[]` no plural — para
 * eventual detalhamento por grupo), enquanto o contrato expõe a forma já
 * "achatada" que o cliente consome (`Cartao` para o `resumo`,
 * `EsquemaBlocoIndicador`/`EsquemaLinhaIndicador` com `rotulo` no singular
 * para `indicadores`). Este módulo só traduz uma forma na outra — não
 * recalcula nada que o domínio já calculou, e não altera `dominio/*.ts` nem
 * `contrato/*.ts`.
 */

/**
 * Soma os numeradores/denominadores das linhas de um `BlocoIndicador` do
 * domínio e devolve um `Cartao` achatado do contrato (`EsquemaCartao`).
 *
 * Usado para blocos que representam UM total só (ex. `pedidos`,
 * `valorEmAberto`): no domínio esses blocos têm 1 ou poucas `linhas[]`
 * (ex. `blocoSimples` sempre gera exatamente 1 linha); somar é o jeito
 * genérico de achatar tanto o caso de 1 linha (soma vira a própria linha)
 * quanto o caso hipotético de mais de uma.
 */
export function mapearBlocoParaCartao(bloco: BlocoIndicador): Cartao {
  const numerador = bloco.linhas.reduce((acumulado, linha) => acumulado + linha.numerador, 0);
  const denominador = bloco.linhas.reduce(
    (acumulado, linha) => acumulado + linha.denominador,
    0,
  );

  return {
    titulo: bloco.titulo,
    formula: bloco.formula,
    numerador,
    denominador,
    resultado: denominador === 0 ? null : numerador / denominador,
  };
}

/**
 * Mapeia o bloco `porTipo` do domínio (1 `BlocoIndicador` com N `linhas[]`,
 * 1 por `TipoDivergencia` — ver `indicadorDivergenciasPorTipo`, que preenche
 * `linha.rotulos` com exatamente 1 elemento: o próprio tipo, em
 * `rotulos[0]`) para a forma de lista que `EsquemaTotais.porTipo` exige:
 * `Array<{ tipo, cartao }>`, um item por linha do bloco de domínio.
 *
 * Cada linha é achatada para um `Cartao` individual (não somada com as
 * demais, diferente de `mapearBlocoParaCartao`) porque aqui cada linha JÁ é
 * o total daquele tipo específico.
 */
export function mapearPorTipoParaContrato(
  bloco: BlocoIndicador,
): Array<{ tipo: TipoDivergencia; cartao: Cartao }> {
  return bloco.linhas.map((linha) => ({
    // `indicadorDivergenciasPorTipo` preenche `rotulos: [tipo]` — a posição
    // 0 é sempre o tipo de divergência (confirmado lendo a função).
    tipo: linha.rotulos[0] as TipoDivergencia,
    cartao: {
      titulo: bloco.titulo,
      formula: bloco.formula,
      numerador: linha.numerador,
      denominador: linha.denominador,
      resultado: linha.resultado,
    },
  }));
}

/**
 * Achata uma `LinhaIndicador` do domínio (`rotulos: string[]`, plural) para
 * uma `EsquemaLinhaIndicador` do contrato (`rotulo: string`, singular).
 * Junta os rótulos com `' / '` como separador legível (ex.
 * `["Transportadora 1", "2026-01"]` → `"Transportadora 1 / 2026-01"`) —
 * decisão desta tarefa, documentada aqui por não haver campo de lista no
 * contrato para preservar a quebra original.
 */
function mapearLinhaParaEsquemaLinha(linha: LinhaIndicador): EsquemaLinhaIndicadorType {
  return {
    rotulo: linha.rotulos.join(" / "),
    numerador: linha.numerador,
    denominador: linha.denominador,
    resultado: linha.resultado,
  };
}

/**
 * Mapeia um `BlocoIndicador` do domínio para a forma completa de
 * `EsquemaBlocoIndicador` do contrato (usada no documento `indicadores`,
 * que expõe a lista inteira de blocos — diferente do `resumo`, que só quer
 * os blocos achatados em `Cartao`).
 *
 * `aParte` no domínio é um objeto `{ rotulo, valor }` (o valor "à parte",
 * fora da quebra principal do bloco); no contrato é só um booleano
 * (`aParte?: boolean`, marca apenas SE existe uma parte separada). Como o
 * esquema de contrato já está fixado (G-21) e não tem campo dedicado para o
 * valor/rótulo da parte separada, esta tarefa decide não perder essa
 * informação: ela entra como uma `linha` extra dentro de `linhas[]`, com
 * `rotulo: bloco.aParte.rotulo`, `denominador: 1` (sem razão natural, mesma
 * convenção de `blocoSimples` no domínio) e `resultado` igual ao próprio
 * valor. Essa linha extra só existe quando `bloco.aParte` está definido.
 */
export function mapearBlocoParaEsquemaBloco(
  bloco: BlocoIndicador,
  chave: string,
): EsquemaBlocoIndicadorType {
  const linhas = bloco.linhas.map(mapearLinhaParaEsquemaLinha);

  if (bloco.aParte !== undefined) {
    linhas.push({
      rotulo: bloco.aParte.rotulo,
      numerador: bloco.aParte.valor,
      denominador: 1,
      resultado: bloco.aParte.valor,
    });
  }

  return {
    chave,
    titulo: bloco.titulo,
    formula: bloco.formula,
    linhas,
    aParte: bloco.aParte !== undefined,
  };
}

/**
 * Ordena recursivamente as chaves de um valor JSON-serializável, para que
 * `JSON.stringify` produza sempre a mesma string a partir do mesmo
 * conteúdo lógico, independente da ordem em que as chaves foram inseridas.
 * Usado só para calcular `idPublicacao` — nunca para o conteúdo publicado
 * em si (que segue a ordem natural dos objetos JS/TS).
 */
function ordenarChavesRecursivamente(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(ordenarChavesRecursivamente);
  }
  if (valor !== null && typeof valor === "object") {
    const chavesOrdenadas = Object.keys(valor).sort();
    const resultado: Record<string, unknown> = {};
    for (const chave of chavesOrdenadas) {
      resultado[chave] = ordenarChavesRecursivamente((valor as Record<string, unknown>)[chave]);
    }
    return resultado;
  }
  return valor;
}

/**
 * Hash SHA-256 determinístico de um conteúdo JSON-serializável: ordena as
 * chaves recursivamente antes de `JSON.stringify` para que a mesma entrada
 * lógica produza sempre o mesmo hash, independente da ordem de inserção das
 * chaves nos objetos de origem. Nunca usa `Date.now()` nem qualquer fonte
 * não determinística (RNF-05/ADR-002).
 */
function calcularHashDeterministico(conteudo: unknown): string {
  const serializado = JSON.stringify(ordenarChavesRecursivamente(conteudo));
  return createHash("sha256").update(serializado).digest("hex");
}

/**
 * Argumentos para montar o documento `resumo` (ver `montarDocumentoResumo`).
 */
export type ArgsMontarDocumentoResumo = {
  dataCorte: string;
  semente: number;
  totais: Totais;
  /**
   * Conteúdo (já determinístico na ordem de montagem — ex. totais +
   * indicadores + qualidade) usado para calcular `idPublicacao`. A ordenação
   * recursiva de chaves em `calcularHashDeterministico` cobre variações de
   * ordem de inserção de objeto; listas devem já vir na ordem final
   * desejada pelo chamador.
   */
  conteudoParaHash: unknown;
};

/**
 * Monta o documento `resumo` (`contrato/resumo.ts`), mapeando `Totais` do
 * domínio (`dominio/totais.ts`, TP-0034) para `EsquemaTotais` do contrato, e
 * valida o resultado contra `EsquemaResumo.parse(...)` antes de devolver.
 */
export function montarDocumentoResumo(args: ArgsMontarDocumentoResumo): Resumo {
  const { dataCorte, semente, totais, conteudoParaHash } = args;

  const documento: Resumo = {
    dataCorte,
    semente,
    versaoContrato: "v1",
    idPublicacao: calcularHashDeterministico(conteudoParaHash),
    totais: {
      pedidos: mapearBlocoParaCartao(totais.pedidos),
      pedidosComDivergencia: mapearBlocoParaCartao(totais.pedidosComDivergencia),
      porTipo: mapearPorTipoParaContrato(totais.porTipo),
      valorEmAberto: mapearBlocoParaCartao(totais.valorEmAberto),
      pagoAMais: mapearBlocoParaCartao(totais.pagoAMais),
      // `entregasNoPrazoTotal` (domínio) → `entregasNoPrazo` (contrato, sem
      // o sufixo "Total"): mapeamento 1:1 de nome de campo, mesma lógica de
      // achatamento de `mapearBlocoParaCartao`.
      entregasNoPrazo: mapearBlocoParaCartao(totais.entregasNoPrazoTotal),
    },
  };

  return EsquemaResumo.parse(documento);
}

/**
 * Monta o documento `indicadores` (`contrato/indicadores.ts`): lista de
 * `EsquemaBlocoIndicador`, um item por `BlocoIndicador` do domínio (ex.
 * `indicadorEntregasNoPrazo(...)`, `indicadorDivergenciasPorTipo(...)`).
 * Reaproveita a `chave` já presente em cada bloco de domínio (ex.
 * `"entregas_no_prazo"`, `"divergencias_por_tipo"` — ver
 * `dominio/indicadores.ts`) como `chave` do contrato, por já ser estável e
 * curta. Valida o resultado contra `EsquemaRespostaIndicadores.parse(...)`
 * antes de devolver.
 */
export function montarDocumentoIndicadores(blocos: BlocoIndicador[]): RespostaIndicadores {
  const documento = blocos.map((bloco) => mapearBlocoParaEsquemaBloco(bloco, bloco.chave));

  return EsquemaRespostaIndicadores.parse(documento);
}
