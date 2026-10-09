import { arredondarMoeda, calcularValorDevido } from "nucleo/dominio/valores.js";
import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import { particionarPedidos, type TipoParticao } from "./particao-pagamentos.js";
import type { EntradaGabarito } from "./problemas-plantados.js";

/**
 * Fração das linhas finais de `pagamentos.csv` que recebe um valor
 * de `meio_pagamento` (coluna opcional, aditiva — ver `PayloadPagamentoV2`
 * em `dominio/evento.ts`). Aplicada por igual a QUALQUER linha final, sem
 * distinção entre linha "limpa" e linha já alterada por algum dos casos
 * plantados acima — por isso o sorteio roda só no final desta função, depois
 * de todo o plantio já ter sido aplicado sobre `linhas`.
 */
export const PROPORCAO_COM_MEIO_PAGAMENTO = 0.4;

/** Vocabulário fixo sorteado para a coluna `meio_pagamento`. */
const MEIOS_PAGAMENTO = ["pix", "boleto", "cartao"] as const;

/** Fração do valor devido usada na transação única do caso "parcial" (RN-04). */
const FRACAO_PAGAMENTO_PARCIAL = 0.6;

/** Multiplicador do valor devido usado no caso "pagamento fora do padrão" (RN-10). */
const FATOR_VALOR_FORA_DO_PADRAO = 2.5;

/** Texto genérico usado na referência do caso "texto livre" (RN-09): sem nenhum código `PV-` reconhecível. */
export const TEXTO_REFERENCIA_LIVRE = "pagamento via boleto";

/** Valor não numérico usado para corromper a linha do caso "linha inválida". */
const VALOR_NAO_NUMERICO = "N/A";

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

/** `valor` em texto é escrito como veio (usado para corromper a linha de propósito). */
function formatarLinhaCsv(
  codigoTransacao: string,
  referencia: string,
  valor: number | string,
  dataPagamento: string,
): string {
  const valorEscrito = typeof valor === "number" ? formatarValor(valor) : valor;
  return `${codigoTransacao},${referencia},${valorEscrito},${dataPagamento}`;
}

type EstadoPlantio = { linhas: string[]; proximoTransacaoSeq: number };

function removerLinhasDaReferencia(linhas: string[], referencia: string): string[] {
  return linhas.filter((linha) => linha.split(",")[1] !== referencia);
}

/** Acrescenta ao fim uma transação com o próximo código sequencial livre. */
function acrescentarTransacao(
  estado: EstadoPlantio,
  referencia: string,
  valor: number | string,
  dataPagamento: string,
): void {
  estado.linhas.push(
    formatarLinhaCsv(formatarCodigoTransacao(estado.proximoTransacaoSeq), referencia, valor, dataPagamento),
  );
  estado.proximoTransacaoSeq += 1;
}

/**
 * Sorteia, a partir do PRNG recebido, se uma linha final recebe
 * `meio_pagamento` e, em caso positivo, qual dos 3 valores do vocabulário
 * fixo. Devolve `null` quando a linha não recebe o campo (fica
 * vazio no CSV, decodificado como v1 pelo adaptador).
 */
function sortearMeioPagamento(prng: () => number): string | null {
  if (prng() >= PROPORCAO_COM_MEIO_PAGAMENTO) {
    return null;
  }
  const indice = Math.floor(prng() * MEIOS_PAGAMENTO.length);
  return MEIOS_PAGAMENTO[indice] as string;
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
 * para outros tipos de problema (plantio de rastreio).
 *
 * Recebe as linhas de `pagamentos.csv` já geradas por `gerarPagamentos`
 * e devolve uma nova lista de linhas (substituindo/acrescentando
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
  const estado: EstadoPlantio = {
    linhas: linhasCsvBase.slice(),
    proximoTransacaoSeq: calcularProximoTransacaoSeq(linhasCsvBase),
  };
  const gabarito: EntradaGabarito[] = [];

  function registrarGabarito(idPedido: string, tipoParticao: TipoParticao): void {
    gabarito.push({
      pedido_venda: idPedido,
      tipo: TIPO_GABARITO_POR_TIPO_PARTICAO[tipoParticao],
    });
  }

  // Duplicado (RN-03): troca a(s) linha(s) original(is) por 2 transações de
  // valor integral, com codigo_transacao novos e distintos.
  for (const pedido of grupos.duplicado) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const valorDevido = calcularValorDevido(pedido.itens);
    estado.linhas = removerLinhasDaReferencia(estado.linhas, referencia);
    acrescentarTransacao(estado, referencia, valorDevido, pedido.dataPedido.iso);
    acrescentarTransacao(estado, referencia, valorDevido, pedido.dataPedido.iso);
    registrarGabarito(pedido.idPedido, "duplicado");
  }

  // Parcial (RN-04): troca a linha original por 1 transação com
  // 0 < pago < devido.
  for (const pedido of grupos.parcial) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const valorParcial = arredondarMoeda(calcularValorDevido(pedido.itens) * FRACAO_PAGAMENTO_PARCIAL);
    estado.linhas = removerLinhasDaReferencia(estado.linhas, referencia);
    acrescentarTransacao(estado, referencia, valorParcial, pedido.dataPedido.iso);
    registrarGabarito(pedido.idPedido, "parcial");
  }

  // Enviado e não pago (RN-05): remove a(s) linha(s) do pedido — a ausência
  // de pagamento é o próprio caso.
  for (const pedido of grupos.enviado_nao_pago) {
    estado.linhas = removerLinhasDaReferencia(estado.linhas, referenciaDoPedido(pedido.idPedido));
    registrarGabarito(pedido.idPedido, "enviado_nao_pago");
  }

  // Os três casos a seguir (texto livre, dois códigos, linha inválida)
  // ACRESCENTAM uma transação extra e mantêm a original intocada: apagar a
  // quitação do pedido criaria uma divergência RN-05 não plantada quando o
  // pedido também tem rastreio.

  // Referência em texto livre (RN-09): sem nenhum código `PV-` reconhecível.
  for (const pedido of grupos.texto_livre) {
    acrescentarTransacao(
      estado,
      TEXTO_REFERENCIA_LIVRE,
      calcularValorDevido(pedido.itens),
      pedido.dataPedido.iso,
    );
    registrarGabarito(pedido.idPedido, "texto_livre");
  }

  // Referência com dois códigos (RN-09): o `PV-` do próprio pedido e o de
  // outro pedido existente.
  for (const pedido of grupos.dois_codigos) {
    const outroPedido = pedidos.find((candidato) => candidato.idPedido !== pedido.idPedido) ?? pedido;
    const referenciaComDoisCodigos = `${referenciaDoPedido(pedido.idPedido)} ${referenciaDoPedido(outroPedido.idPedido)}`;
    acrescentarTransacao(
      estado,
      referenciaComDoisCodigos,
      calcularValorDevido(pedido.itens),
      pedido.dataPedido.iso,
    );
    registrarGabarito(pedido.idPedido, "dois_codigos");
  }

  // codigo_transacao repetido: duplica a linha de pagamento desse pedido.
  for (const pedido of grupos.repetido) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const indice = estado.linhas.findIndex((linha) => linha.split(",")[1] === referencia);
    if (indice !== -1) {
      estado.linhas.splice(indice + 1, 0, estado.linhas[indice] as string);
    }
    registrarGabarito(pedido.idPedido, "repetido");
  }

  // Linha inválida: valor não numérico no campo `valor`.
  for (const pedido of grupos.linha_invalida) {
    acrescentarTransacao(estado, referenciaDoPedido(pedido.idPedido), VALOR_NAO_NUMERICO, pedido.dataPedido.iso);
    registrarGabarito(pedido.idPedido, "linha_invalida");
  }

  // Pagamento fora do padrão (RN-10): colapsa as linhas do pedido em UMA
  // única, com valor de mais de 2x o devido.
  for (const pedido of grupos.fora_padrao) {
    const referencia = referenciaDoPedido(pedido.idPedido);
    const linhaOriginal = estado.linhas.find((linha) => linha.split(",")[1] === referencia);
    estado.linhas = removerLinhasDaReferencia(estado.linhas, referencia);
    if (linhaOriginal) {
      const partes = linhaOriginal.split(",");
      const valorForaDoPadrao = arredondarMoeda(calcularValorDevido(pedido.itens) * FATOR_VALOR_FORA_DO_PADRAO);
      estado.linhas.push(formatarLinhaCsv(partes[0] as string, partes[1] as string, valorForaDoPadrao, partes[3] as string));
    }
    registrarGabarito(pedido.idPedido, "fora_padrao");
  }

  // meio_pagamento: sorteado por igual sobre todas as linhas
  // finais (base + plantadas), DEPOIS de todo o plantio acima já ter sido
  // aplicado — cada linha final recebe uma 5ª coluna, vazia quando o sorteio
  // não a seleciona. O sorteio é indexado por `codigo_transacao` (não 1
  // sorteio por linha física): assim, as 2 linhas físicas do caso
  // "repetido" (mesmo codigo_transacao de propósito) sempre recebem o MESMO
  // valor, preservando a igualdade esperada entre as 2 ocorrências.
  const meioPagamentoPorTransacao = new Map<string, string | null>();
  const linhasCsv = estado.linhas.map((linha) => {
    const codigoTransacao = linha.split(",")[0] ?? "";
    if (!meioPagamentoPorTransacao.has(codigoTransacao)) {
      meioPagamentoPorTransacao.set(codigoTransacao, sortearMeioPagamento(prng));
    }
    const meioPagamento = meioPagamentoPorTransacao.get(codigoTransacao) ?? null;
    return `${linha},${meioPagamento ?? ""}`;
  });

  return { linhasCsv, gabarito };
}
