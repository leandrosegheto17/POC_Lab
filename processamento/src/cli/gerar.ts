import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { lerBaseDeVendas, type PedidoVendas } from "../fontes/leitura-vendas.js";
import { calcularDivergenciasNaturais } from "../gerador/divergencias-naturais.js";
import { escreverGabarito, type EntradaGabarito } from "../gerador/problemas-plantados.js";
import { pedidosLimpos } from "../gerador/gerar.js";
import { gerarPagamentos } from "../gerador/pagamentos.js";
import { plantarCasosPagamento } from "../gerador/plantar-pagamentos.js";
import { plantarCasosRastreio } from "../gerador/plantar-rastreio.js";
import { mulberry32, SEMENTE_PADRAO } from "../gerador/prng.js";
import { gerarRastreio } from "../gerador/rastreio.js";

/** Caminho padrão da base de origem (Northwind), relativo ao cwd do processo. */
export const CAMINHO_BASE_PADRAO = path.join("dados", "origem", "northwind.db");

/** Diretório padrão de saída dos arquivos gerados. */
export const DIR_SAIDA_PADRAO = path.join("dados", "gerado");

export const NOME_PAGAMENTOS_CSV = "pagamentos.csv";
export const NOME_RASTREIO_CSV = "rastreio.csv";
export const NOME_GABARITO_JSON = "problemas-plantados.json";

const CABECALHO_PAGAMENTOS_CSV =
  "codigo_transacao,referencia,valor,data_pagamento,meio_pagamento";

const CABECALHO_RASTREIO_CSV =
  "codigo_evento,codigo_rastreio,pedido_venda,tipo,momento_fato,transportadora";

/**
 * Lê o argumento `--semente N` de uma lista de argumentos de linha de
 * comando (ex. `process.argv.slice(2)`). Devolve `SEMENTE_PADRAO` quando o
 * argumento não é informado ou não é um número válido.
 */
export function obterSemente(argv: string[]): number {
  const indice = argv.indexOf("--semente");
  if (indice === -1 || indice + 1 >= argv.length) {
    return SEMENTE_PADRAO;
  }
  const valor = Number(argv[indice + 1]);
  return Number.isFinite(valor) ? valor : SEMENTE_PADRAO;
}

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
 * problemas plantados (TP-0025 em diante). Função pura — não escreve em
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
 * parte que efetivamente escreve em disco (`main`, abaixo) — para que os
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
  // Pedidos já usados por algum caso de pagamento (TP-0025) não podem também
  // receber um caso de rastreio (TP-0026): ver comentário em
  // `gerador/plantar-rastreio.ts` (verificação de 2026-10-08, TP-0028).
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

  // Verificação de 2026-10-08 (TP-0028): além das divergências plantadas
  // acima, alguns pedidos "limpos" já ficam organicamente divergentes só
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

async function main(): Promise<void> {
  try {
    const semente = obterSemente(process.argv.slice(2));
    const pedidos = lerBaseDeVendas(CAMINHO_BASE_PADRAO);
    const { pagamentosCsv, rastreioCsv, gabaritoJson } = gerarConteudo(pedidos, semente);

    await mkdir(DIR_SAIDA_PADRAO, { recursive: true });
    await writeFile(path.join(DIR_SAIDA_PADRAO, NOME_PAGAMENTOS_CSV), pagamentosCsv, "utf-8");
    await writeFile(path.join(DIR_SAIDA_PADRAO, NOME_RASTREIO_CSV), rastreioCsv, "utf-8");
    await writeFile(path.join(DIR_SAIDA_PADRAO, NOME_GABARITO_JSON), gabaritoJson, "utf-8");

    console.log(
      `Dados gerados com semente ${String(semente)} em "${DIR_SAIDA_PADRAO}" (${NOME_PAGAMENTOS_CSV}, ${NOME_RASTREIO_CSV}, ${NOME_GABARITO_JSON}).`,
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao gerar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
