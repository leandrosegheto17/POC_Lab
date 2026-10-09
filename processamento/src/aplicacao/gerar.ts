import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NOME_GABARITO_JSON, NOME_PAGAMENTOS_CSV, NOME_RASTREIO_CSV } from "../config/caminhos.js";
import { lerBaseDeVendas, type PedidoVendas } from "../fontes/leitura-vendas.js";
import { calcularDivergenciasNaturais } from "../gerador/divergencias-naturais.js";
import { escreverGabarito, type EntradaGabarito } from "../gerador/problemas-plantados.js";
import { pedidosLimpos } from "../gerador/gerar.js";
import { gerarPagamentos } from "../gerador/pagamentos.js";
import { plantarCasosPagamento } from "../gerador/plantar-pagamentos.js";
import { plantarCasosRastreio } from "../gerador/plantar-rastreio.js";
import { mulberry32 } from "../gerador/prng.js";
import { gerarRastreio } from "../gerador/rastreio.js";

const CABECALHO_PAGAMENTOS_CSV =
  "codigo_transacao,referencia,valor,data_pagamento,meio_pagamento";

const CABECALHO_RASTREIO_CSV =
  "codigo_evento,codigo_rastreio,pedido_venda,tipo,momento_fato,transportadora";

/**
 * Monta o conteúdo completo (string) do `pagamentos.csv`, com cabeçalho,
 * uma linha por transação e fim de linha `\n`. Função pura — não escreve em
 * disco.
 */
export function montarConteudoPagamentosCsv(linhasCsv: string[]): string {
  return [CABECALHO_PAGAMENTOS_CSV, ...linhasCsv]
    .map((linha) => `${linha}\n`)
    .join("");
}

/**
 * Monta o conteúdo completo (string) do `rastreio.csv`, com cabeçalho, uma
 * linha por evento e fim de linha `\n`. Função pura — não escreve em disco.
 */
export function montarConteudoRastreioCsv(linhasCsv: string[]): string {
  return [CABECALHO_RASTREIO_CSV, ...linhasCsv]
    .map((linha) => `${linha}\n`)
    .join("");
}

/**
 * Monta o conteúdo completo (string) do `problemas-plantados.json` a partir dos
 * problemas plantados . Função pura — não escreve em
 * disco.
 */
export function montarConteudoGabaritoJson(problemas: EntradaGabarito[]): string {
  return escreverGabarito(problemas);
}

export type ConteudoGerado = {
  pagamentosCsv: string;
  rastreioCsv: string;
  gabaritoJson: string;
};

/**
 * Monta, de forma determinística e sem nenhum efeito colateral de I/O, o
 * conteúdo dos arquivos de saída do gerador (`pagamentos.csv`,
 * `rastreio.csv`, `problemas-plantados.json`) a partir dos pedidos lidos da base e de
 * uma semente.
 *
 * Toda a lógica de montagem de conteúdo fica concentrada aqui, separada da
 * parte que efetivamente escreve em disco (`gerarEEscrever`, abaixo) — para que os
 * testes exercitem esta função sem depender de `node:fs`.
 */
export function gerarConteudo(
  pedidos: PedidoVendas[],
  semente: number,
): ConteudoGerado {
  const prng = mulberry32(semente);
  const limpos = pedidosLimpos(pedidos, prng);
  const pagamentosGerados = gerarPagamentos(limpos, prng);
  // Reaproveita a MESMA instância do PRNG (não recria nem reinicia a
  // semente) para manter a sequência de números contínua entre
  // gerarPagamentos, plantarCasosPagamento, gerarRastreio e
  // plantarCasosRastreio — nessa ordem.
  const pagamentosPlantados = plantarCasosPagamento(limpos, pagamentosGerados.linhasCsv, prng);
  // Pedidos já usados por algum caso de pagamento não podem também
  // receber um caso de rastreio: ver comentário em `gerador/plantar-rastreio.ts`.
  const pedidosUsadosPagamento = new Set(
    pagamentosPlantados.gabarito.map((entrada) => entrada.pedido_venda),
  );
  const rastreioGerado = gerarRastreio(limpos, prng);
  const rastreioPlantado = plantarCasosRastreio(
    limpos,
    rastreioGerado.linhasCsv,
    prng,
    pedidosUsadosPagamento,
  );

  // Além das divergências plantadas acima, alguns pedidos "limpos" já ficam organicamente divergentes só
  // pela combinação dataEnvio/dataLimite da base real (ex. dataEnvio
  // ausente, ou posterior à própria dataLimite) — ver
  // `gerador/divergencias-naturais.ts` para as regras de exclusão por tipo.
  const pedidosSemEntregaOuJaAtrasadaNoRastreio = new Set(
    rastreioPlantado.gabarito
      .filter((entrada) => entrada.tipo === "pago_nao_enviado" || entrada.tipo === "entrega_atrasada")
      .map((entrada) => entrada.pedido_venda),
  );
  const divergenciasNaturais = calcularDivergenciasNaturais(
    limpos,
    pedidosUsadosPagamento,
    pedidosSemEntregaOuJaAtrasadaNoRastreio,
  );

  return {
    pagamentosCsv: montarConteudoPagamentosCsv(pagamentosPlantados.linhasCsv),
    rastreioCsv: montarConteudoRastreioCsv(rastreioPlantado.linhasCsv),
    gabaritoJson: montarConteudoGabaritoJson([
      ...pagamentosPlantados.gabarito,
      ...rastreioPlantado.gabarito,
      ...divergenciasNaturais,
    ]),
  };
}

/**
 * Passo "gerar": lê a base de vendas, monta o conteúdo determinístico para a
 * semente e escreve os três arquivos em `dirSaida`. Devolve o conteúdo gerado.
 */
export async function gerarEEscrever(
  caminhoBase: string,
  dirSaida: string,
  semente: number,
): Promise<ConteudoGerado> {
  const pedidos = lerBaseDeVendas(caminhoBase);
  const conteudo = gerarConteudo(pedidos, semente);

  await mkdir(dirSaida, { recursive: true });
  await writeFile(path.join(dirSaida, NOME_PAGAMENTOS_CSV), conteudo.pagamentosCsv, "utf-8");
  await writeFile(path.join(dirSaida, NOME_RASTREIO_CSV), conteudo.rastreioCsv, "utf-8");
  await writeFile(path.join(dirSaida, NOME_GABARITO_JSON), conteudo.gabaritoJson, "utf-8");

  return conteudo;
}
