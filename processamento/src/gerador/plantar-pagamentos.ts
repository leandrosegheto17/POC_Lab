import { arredondarMoeda, calcularValorDevido } from "../dominio/valores.js";
import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import type { EntradaGabarito } from "./problemas-plantados.js";

/**
 * Plantio de casos de pagamento (TP-0025), feito SOMENTE sobre pedidos
 * "limpos" (já passados por `pedidosLimpos`). Cada constante abaixo é a
 * fração do total de pedidos recebidos que recebe aquele tipo de caso — os
 * subconjuntos sorteados são sempre DISJUNTOS entre si (cada pedido recebe
 * no máximo 1 caso), particionados na mesma ordem fixa listada em
 * `ORDEM_TIPOS_PARTICAO` para que o determinismo do PRNG não dependa da
 * ordem de iteração de um objeto.
 *
 * Valores de exemplo, escolhidos para somar uma fração minoritária do total
 * (32%), deixando a maior parte dos pedidos "limpos" sem nenhum caso
 * plantado.
 */
export const PROPORCAO_DUPLICADO = 0.05;
export const PROPORCAO_PARCIAL = 0.05;
export const PROPORCAO_ENVIADO_NAO_PAGO = 0.05;
export const PROPORCAO_TEXTO_LIVRE = 0.03;
export const PROPORCAO_DOIS_CODIGOS = 0.03;
export const PROPORCAO_REPETIDO = 0.03;
export const PROPORCAO_LINHA_INVALIDA = 0.03;
export const PROPORCAO_FORA_DO_PADRAO = 0.05;

/**
 * Fração das linhas finais de `pagamentos.csv` (TP-0075) que recebe um valor
 * de `meio_pagamento` (coluna opcional, aditiva — ver `PayloadPagamentoV2`
 * em `dominio/evento.ts`). Aplicada por igual a QUALQUER linha final, sem
 * distinção entre linha "limpa" e linha já alterada por algum dos casos
 * plantados acima — por isso o sorteio roda só no final desta função, depois
 * de todo o plantio já ter sido aplicado sobre `linhas`.
 */
export const PROPORCAO_COM_MEIO_PAGAMENTO = 0.4;

/** Vocabulário fixo sorteado para a coluna `meio_pagamento` (TP-0075). */
const MEIOS_PAGAMENTO = ["pix", "boleto", "cartao"] as const;

/** Fração do valor devido usada na transação única do caso "parcial" (RN-04). */
const FRACAO_PAGAMENTO_PARCIAL = 0.6;

/** Multiplicador do valor devido usado no caso "pagamento fora do padrão" (RN-10). */
const FATOR_VALOR_FORA_DO_PADRAO = 2.5;

/** Texto genérico usado na referência do caso "texto livre" (RN-09): sem nenhum código `PV-` reconhecível. */
export const TEXTO_REFERENCIA_LIVRE = "pagamento via boleto";

/** Valor não numérico usado para corromper a linha do caso "linha inválida". */
const VALOR_NAO_NUMERICO = "N/A";

const ORDEM_TIPOS_PARTICAO = [
  "duplicado",
  "parcial",
  "enviado_nao_pago",
  "texto_livre",
  "dois_codigos",
  "repetido",
  "linha_invalida",
  "fora_padrao",
] as const;

type TipoParticao = (typeof ORDEM_TIPOS_PARTICAO)[number];

const PROPORCOES_POR_TIPO: Record<TipoParticao, number> = {
  duplicado: PROPORCAO_DUPLICADO,
  parcial: PROPORCAO_PARCIAL,
  enviado_nao_pago: PROPORCAO_ENVIADO_NAO_PAGO,
  texto_livre: PROPORCAO_TEXTO_LIVRE,
  dois_codigos: PROPORCAO_DOIS_CODIGOS,
  repetido: PROPORCAO_REPETIDO,
  linha_invalida: PROPORCAO_LINHA_INVALIDA,
  fora_padrao: PROPORCAO_FORA_DO_PADRAO,
};

/** Vocabulário fixo de `tipo` usado no gabarito (texto livre e dois códigos mapeiam para o mesmo tipo). */
const TIPO_GABARITO_POR_TIPO_PARTICAO: Record<TipoParticao, string> = {
  duplicado: "duplicado",
  parcial: "parcial",
  enviado_nao_pago: "enviado_nao_pago",
  texto_livre: "sem_identificacao",
  dois_codigos: "sem_identificacao",
  repetido: "registro_repetido",
  linha_invalida: "linha_invalida",
  fora_padrao: "valor_fora_do_padrao",
};

export type ResultadoPlantioPagamentos = {
  linhasCsv: string[];
  gabarito: EntradaGabarito[];
};

function referenciaDoPedido(idPedido: string): string {
  return `PV-${idPedido.padStart(6, "0")}`;
}

function formatarCodigoTransacao(numero: number): string {
  return `TX-${String(numero).padStart(6, "0")}`;
}

function formatarValor(valor: number): string {
  return valor.toFixed(2);
}

function formatarLinhaCsv(
  codigoTransacao: string,
  referencia: string,
  valor: number,
  dataPagamento: string,
): string {
  return `${codigoTransacao},${referencia},${formatarValor(valor)},${dataPagamento}`;
}

/**
 * Sorteia, a partir do PRNG recebido, se uma linha final recebe
 * `meio_pagamento` e, em caso positivo, qual dos 3 valores do vocabulário
 * fixo (TP-0075). Devolve `null` quando a linha não recebe o campo (fica
 * vazio no CSV, decodificado como v1 pelo adaptador).
 */
function sortearMeioPagamento(prng: () => number): string | null {
  if (prng() >= PROPORCAO_COM_MEIO_PAGAMENTO) {
    return null;
  }
  const indice = Math.floor(prng() * MEIOS_PAGAMENTO.length);
  return MEIOS_PAGAMENTO[indice] as string;
}

/** Embaralha uma lista de forma determinística (Fisher-Yates) a partir do PRNG recebido, sem mutar a lista original. */
function embaralhar<T>(itens: T[], prng: () => number): T[] {
  const copia = itens.slice();
  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const sorteado = Math.floor(prng() * (indice + 1));
    const temporario = copia[indice] as T;
    copia[indice] = copia[sorteado] as T;
    copia[sorteado] = temporario;
  }
  return copia;
}

/**
 * Particiona os pedidos recebidos em subconjuntos DISJUNTOS, um por tipo de
 * caso, sempre na mesma ordem fixa (`ORDEM_TIPOS_PARTICAO`): a cada tipo,
 * embaralha o que resta do "pool" (via PRNG) e retira do início a
 * quantidade correspondente à proporção daquele tipo (sobre o total
 * original de pedidos recebidos); o restante do pool segue para o próximo
 * tipo. Como cada pedido só pode ser retirado do pool uma vez, nenhum
 * pedido recebe mais de 1 tipo de caso.
 */
function particionarPedidos(
  pedidos: PedidoVendas[],
  prng: () => number,
): Record<TipoParticao, PedidoVendas[]> {
  const total = pedidos.length;
  let pool = pedidos.slice();
  const grupos = {} as Record<TipoParticao, PedidoVendas[]>;

  for (const tipo of ORDEM_TIPOS_PARTICAO) {
    const quantidade = Math.floor(PROPORCOES_POR_TIPO[tipo] * total);
    const embaralhado = embaralhar(pool, prng);
    grupos[tipo] = embaralhado.slice(0, quantidade);
    pool = embaralhado.slice(quantidade);
  }

  return grupos;
}

/** Calcula o próximo número de sequência de `codigo_transacao` livre, a partir do maior já usado nas linhas base. */
function calcularProximoTransacaoSeq(linhasCsvBase: string[]): number {
  let maior = 0;
  for (const linha of linhasCsvBase) {
    const codigo = linha.split(",")[0] ?? "";
    const correspondencia = /^TX-(\d+)$/.exec(codigo);
    if (correspondencia) {
      const numero = Number(correspondencia[1]);
      if (numero > maior) {
        maior = numero;
      }
    }
  }
  return maior + 1;
}

/**
 * Planta, de forma determinística, casos de problema de pagamento SOMENTE
 * sobre os pedidos "limpos" recebidos — nunca sobre pedidos já reservados
 * para outros tipos de problema por tarefas futuras.
 *
 * Recebe as linhas de `pagamentos.csv` já geradas por `gerarPagamentos`
 * (TP-0023) e devolve uma nova lista de linhas (substituindo/acrescentando
 * conforme o caso) junto com as entradas de gabarito correspondentes.
 *
 * Função pura: não lê nem escreve nada em disco.
 */
export function plantarCasosPagamento(
  pedidos: PedidoVendas[],
  linhasCsvBase: string[],
  prng: () => number,
): ResultadoPlantioPagamentos {
  const grupos = particionarPedidos(pedidos, prng);
  let linhas = linhasCsvBase.slice();
  const gabarito: EntradaGabarito[] = [];
  let proximoTransacaoSeq = calcularProximoTransacaoSeq(linhasCsvBase);

  function registrarGabarito(idPedido: string, tipoParticao: TipoParticao): void {
    gabarito.push({
      pedido_venda: idPedido,
      tipo: TIPO_GABARITO_POR_TIPO_PARTICAO[tipoParticao],
    });
  }

  // Duplicado (RN-03): remove a(s) linha(s) original(is) e escreve 2
  // transações de valor integral, com codigo_transacao novos e distintos.
  for (const pedido of grupos.duplicado) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const valorDevido = calcularValorDevido(pedido.itens);
    const dataPagamento = pedido.dataPedido.iso;

    linhas = linhas.filter((linha) => linha.split(",")[1] !== referencia);
    for (let vez = 0; vez < 2; vez += 1) {
      linhas.push(
        formatarLinhaCsv(
          formatarCodigoTransacao(proximoTransacaoSeq),
          referencia,
          valorDevido,
          dataPagamento,
        ),
      );
      proximoTransacaoSeq += 1;
    }
    registrarGabarito(pedido.idPedido, "duplicado");
  }

  // Parcial (RN-04): substitui pela linha original por 1 transação com
  // 0 < pago < devido (60% do devido).
  for (const pedido of grupos.parcial) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const valorDevido = calcularValorDevido(pedido.itens);
    const dataPagamento = pedido.dataPedido.iso;

    linhas = linhas.filter((linha) => linha.split(",")[1] !== referencia);
    const valorParcial = arredondarMoeda(valorDevido * FRACAO_PAGAMENTO_PARCIAL);
    linhas.push(
      formatarLinhaCsv(
        formatarCodigoTransacao(proximoTransacaoSeq),
        referencia,
        valorParcial,
        dataPagamento,
      ),
    );
    proximoTransacaoSeq += 1;
    registrarGabarito(pedido.idPedido, "parcial");
  }

  // Enviado e não pago (RN-05): remove a(s) linha(s) desse pedido — a
  // ausência de pagamento é o próprio caso.
  for (const pedido of grupos.enviado_nao_pago) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    linhas = linhas.filter((linha) => linha.split(",")[1] !== referencia);
    registrarGabarito(pedido.idPedido, "enviado_nao_pago");
  }

  // Referência em texto livre (RN-09): mantém a transação original (válida,
  // quitando o pedido) intocada e ACRESCENTA uma transação extra com
  // referência em texto genérico sem nenhum código reconhecível — em vez de
  // substituir a linha original, para não apagar a quitação do pedido (que
  // criaria uma divergência RN-05 "enviado_nao_pago" não plantada quando o
  // pedido também tem rastreio; achado de verificação de 2026-10-08,
  // TP-0028).
  for (const pedido of grupos.texto_livre) {
    const dataPagamento = pedido.dataPedido.iso;
    linhas.push(
      formatarLinhaCsv(
        formatarCodigoTransacao(proximoTransacaoSeq),
        TEXTO_REFERENCIA_LIVRE,
        calcularValorDevido(pedido.itens),
        dataPagamento,
      ),
    );
    proximoTransacaoSeq += 1;
    registrarGabarito(pedido.idPedido, "texto_livre");
  }

  // Referência com dois códigos (RN-09): mesma lógica acima — ACRESCENTA uma
  // transação extra com referência contendo 2 códigos PV- reconhecíveis (o
  // do próprio pedido e o de outro pedido existente), sem tocar na
  // transação original que já quita o pedido.
  for (const pedido of grupos.dois_codigos) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const outroPedido = pedidos.find((candidato) => candidato.idPedido !== pedido.idPedido) ?? pedido;
    const referenciaComDoisCodigos = `${referencia} ${referenciaDoPedido(outroPedido.idPedido)}`;
    const dataPagamento = pedido.dataPedido.iso;

    linhas.push(
      formatarLinhaCsv(
        formatarCodigoTransacao(proximoTransacaoSeq),
        referenciaComDoisCodigos,
        calcularValorDevido(pedido.itens),
        dataPagamento,
      ),
    );
    proximoTransacaoSeq += 1;
    registrarGabarito(pedido.idPedido, "dois_codigos");
  }

  // codigo_transacao repetido: duplica a linha de pagamento desse pedido.
  for (const pedido of grupos.repetido) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const indice = linhas.findIndex((linha) => linha.split(",")[1] === referencia);
    if (indice !== -1) {
      linhas = [...linhas.slice(0, indice + 1), linhas[indice] as string, ...linhas.slice(indice + 1)];
    }
    registrarGabarito(pedido.idPedido, "repetido");
  }

  // Linha inválida: mantém a transação original (válida, quitando o
  // pedido) intocada e ACRESCENTA uma transação extra corrompida, com um
  // valor não numérico no campo `valor` — em vez de corromper a única linha
  // existente, para não apagar a quitação do pedido (mesma razão do caso
  // "texto livre"/"dois códigos" acima; verificação de 2026-10-08, TP-0028).
  for (const pedido of grupos.linha_invalida) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const dataPagamento = pedido.dataPedido.iso;
    linhas.push(
      [formatarCodigoTransacao(proximoTransacaoSeq), referencia, VALOR_NAO_NUMERICO, dataPagamento].join(","),
    );
    proximoTransacaoSeq += 1;
    registrarGabarito(pedido.idPedido, "linha_invalida");
  }

  // Pagamento fora do padrão (RN-10): colapsa todas as linhas desse pedido
  // (idem acima) em UMA única linha com valor alterado para mais de 2x o
  // valor devido do pedido.
  for (const pedido of grupos.fora_padrao) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const valorDevido = calcularValorDevido(pedido.itens);
    const linhaOriginal = linhas.find((linha) => linha.split(",")[1] === referencia);
    linhas = linhas.filter((linha) => linha.split(",")[1] !== referencia);
    if (linhaOriginal) {
      const partes = linhaOriginal.split(",");
      const valorForaDoPadrao = arredondarMoeda(valorDevido * FATOR_VALOR_FORA_DO_PADRAO);
      linhas.push([partes[0], partes[1], formatarValor(valorForaDoPadrao), partes[3]].join(","));
    }
    registrarGabarito(pedido.idPedido, "fora_padrao");
  }

  // meio_pagamento (TP-0075): sorteado por igual sobre todas as linhas
  // finais (base + plantadas), DEPOIS de todo o plantio acima já ter sido
  // aplicado — cada linha final recebe uma 5ª coluna, vazia quando o sorteio
  // não a seleciona. O sorteio é indexado por `codigo_transacao` (não 1
  // sorteio por linha física): assim, as 2 linhas físicas do caso
  // "repetido" (mesmo codigo_transacao de propósito) sempre recebem o MESMO
  // valor, preservando a igualdade esperada entre as 2 ocorrências.
  const meioPagamentoPorTransacao = new Map<string, string | null>();
  linhas = linhas.map((linha) => {
    const codigoTransacao = linha.split(",")[0] ?? "";
    if (!meioPagamentoPorTransacao.has(codigoTransacao)) {
      meioPagamentoPorTransacao.set(codigoTransacao, sortearMeioPagamento(prng));
    }
    const meioPagamento = meioPagamentoPorTransacao.get(codigoTransacao) ?? null;
    return `${linha},${meioPagamento ?? ""}`;
  });

  return { linhasCsv: linhas, gabarito };
}
