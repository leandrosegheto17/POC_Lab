import type { TipoDivergencia } from "./modelo.js";
import type { SituacaoPagamento } from "./quitacao.js";

/**
 * Linha de um bloco de indicador: um numerador e um denominador que, juntos,
 * compõem um resultado (ou `null` quando o denominador é 0).
 */
export type LinhaIndicador = {
  rotulos: string[];
  numerador: number;
  denominador: number;
  resultado: number | null;
};

/**
 * Bloco de indicador: agrupamento de linhas sob uma mesma fórmula, com um
 * valor "à parte" opcional (fora da quebra principal do bloco).
 */
export type BlocoIndicador = {
  chave: string;
  titulo: string;
  formula: string;
  linhas: LinhaIndicador[];
  aParte?: { rotulo: string; valor: number };
};

/**
 * Pedido com os dados mínimos necessários para o indicador de entregas no
 * prazo: transportadora, data limite de entrega e (quando conhecido) o
 * evento de entrega.
 */
export type PedidoParaIndicadorEntrega = {
  transportadora: string;
  dataLimite: string;
  eventoEntrega?: { momento_fato: string };
};

type GrupoEntrega = {
  transportadora: string;
  mes: string;
  numerador: number;
  denominador: number;
};

/**
 * Bloco "entregas no prazo por transportadora e mês" (RF a que a TP-0033 se
 * refere). Agrupa por `(transportadora, mês da entrega)`; só gera linha para
 * grupos com pelo menos uma entrega conhecida. Pedidos sem entrega conhecida
 * entram apenas no total "à parte", sem quebra por transportadora/mês.
 */
export function indicadorEntregasNoPrazo(
  pedidos: PedidoParaIndicadorEntrega[],
): BlocoIndicador {
  const grupos = new Map<string, GrupoEntrega>();
  let semEntrega = 0;

  for (const pedido of pedidos) {
    if (!pedido.eventoEntrega) {
      semEntrega += 1;
      continue;
    }

    const mes = pedido.eventoEntrega.momento_fato.slice(0, 7);
    const chave = `${pedido.transportadora}|${mes}`;

    let grupo = grupos.get(chave);
    if (!grupo) {
      grupo = { transportadora: pedido.transportadora, mes, numerador: 0, denominador: 0 };
      grupos.set(chave, grupo);
    }

    grupo.denominador += 1;
    if (pedido.eventoEntrega.momento_fato <= pedido.dataLimite) {
      grupo.numerador += 1;
    }
  }

  const linhas: LinhaIndicador[] = Array.from(grupos.values())
    .sort((a, b) => {
      if (a.transportadora !== b.transportadora) {
        return a.transportadora < b.transportadora ? -1 : 1;
      }
      return a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0;
    })
    .map((grupo) => ({
      rotulos: [grupo.transportadora, grupo.mes],
      numerador: grupo.numerador,
      denominador: grupo.denominador,
      resultado: grupo.denominador === 0 ? null : grupo.numerador / grupo.denominador,
    }));

  return {
    chave: "entregas_no_prazo",
    titulo: "Entregas no prazo por transportadora e mês",
    formula:
      "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida, por transportadora e mes da entrega",
    linhas,
    aParte: { rotulo: "Pedidos sem entrega", valor: semEntrega },
  };
}

const ORDEM_TIPOS_DIVERGENCIA: readonly TipoDivergencia[] = [
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
];

/**
 * Bloco "divergências por tipo". Sempre contém uma linha por tipo declarado
 * em `TipoDivergencia`, na ordem em que o tipo os declara, mesmo quando a
 * contagem é 0.
 */
export function indicadorDivergenciasPorTipo(
  divergencias: { tipo: TipoDivergencia }[],
): BlocoIndicador {
  const contagens = new Map<TipoDivergencia, number>(
    ORDEM_TIPOS_DIVERGENCIA.map((tipo) => [tipo, 0]),
  );

  for (const divergencia of divergencias) {
    contagens.set(divergencia.tipo, (contagens.get(divergencia.tipo) ?? 0) + 1);
  }

  const total = divergencias.length;

  const linhas: LinhaIndicador[] = ORDEM_TIPOS_DIVERGENCIA.map((tipo) => {
    const numerador = contagens.get(tipo) ?? 0;
    return {
      rotulos: [tipo],
      numerador,
      denominador: total,
      resultado: total === 0 ? null : numerador / total,
    };
  });

  return {
    chave: "divergencias_por_tipo",
    titulo: "Divergências por tipo",
    formula: "numero de divergencias do tipo / total de divergencias",
    linhas,
  };
}

/**
 * Pedido com os dados mínimos necessários para o indicador de tempo médio
 * pedido→envio e envio→entrega: a data do pedido e, quando conhecidas, a
 * data de envio e a de entrega.
 */
export type PedidoParaIndicadorTempoMedio = {
  dataPedido: string;
  dataEnvio?: string;
  dataEntrega?: string;
};

/**
 * Diferença em dias entre duas datas ISO, calculada de forma determinística
 * (sem depender do relógio do sistema): ambas as datas vêm de dados
 * conhecidos do próprio pedido.
 */
function diasEntre(dataInicio: string, dataFim: string): number {
  return (new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / 86400000;
}

function arredondarDuasCasas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Bloco "tempo médio pedido→envio e envio→entrega". Duas linhas
 * independentes: um pedido sem `dataEnvio` fica fora do denominador de
 * `pedido→envio`; um pedido sem `dataEnvio` ou sem `dataEntrega` fica fora
 * do denominador de `envio→entrega` (a diferença exige as duas datas). Um
 * pedido pode entrar numa linha e não na outra.
 */
export function calcularTempoMedioPedidoEnvioEntrega(
  pedidos: PedidoParaIndicadorTempoMedio[],
): BlocoIndicador {
  let somaPedidoEnvio = 0;
  let contagemPedidoEnvio = 0;
  let somaEnvioEntrega = 0;
  let contagemEnvioEntrega = 0;

  for (const pedido of pedidos) {
    if (pedido.dataEnvio !== undefined) {
      somaPedidoEnvio += diasEntre(pedido.dataPedido, pedido.dataEnvio);
      contagemPedidoEnvio += 1;

      if (pedido.dataEntrega !== undefined) {
        somaEnvioEntrega += diasEntre(pedido.dataEnvio, pedido.dataEntrega);
        contagemEnvioEntrega += 1;
      }
    }
  }

  const linhas: LinhaIndicador[] = [
    {
      rotulos: ["pedido→envio"],
      numerador: somaPedidoEnvio,
      denominador: contagemPedidoEnvio,
      resultado:
        contagemPedidoEnvio === 0 ? null : arredondarDuasCasas(somaPedidoEnvio / contagemPedidoEnvio),
    },
    {
      rotulos: ["envio→entrega"],
      numerador: somaEnvioEntrega,
      denominador: contagemEnvioEntrega,
      resultado:
        contagemEnvioEntrega === 0 ? null : arredondarDuasCasas(somaEnvioEntrega / contagemEnvioEntrega),
    },
  ];

  return {
    chave: "tempoMedioPedidoEnvioEntrega",
    titulo: "Tempo médio pedido→envio e envio→entrega",
    formula: "soma de dias entre as datas ÷ contagem de pedidos elegíveis, por etapa",
    linhas,
  };
}

/**
 * Pedido com os dados mínimos necessários para o indicador de valor pago ×
 * valor devido: o valor devido, o total pago e a situação de quitação já
 * classificada (vinda de `calcularQuitacao`, RN-02).
 */
export type PedidoParaIndicadorValorPagoVsDevido = {
  devido: number;
  pago: number;
  situacao: SituacaoPagamento;
};

const ORDEM_SITUACOES_PAGAMENTO: readonly SituacaoPagamento[] = [
  "sem_pagamento",
  "parcial",
  "quitado",
  "excedente",
];

/**
 * Bloco "valor pago × valor devido", total e por situação de quitação.
 *
 * RN-11: esta função nunca lê nem aceita nenhum campo relacionado a
 * sugestão de IA (ex. `qualidade.ia.sugestoes`) — itera apenas sobre
 * `devido`, `pago` e `situacao` de cada pedido, ignorando qualquer outro
 * campo presente no objeto de entrada. Sugestões da IA nunca entram no
 * cálculo deste indicador.
 *
 * Não reaplica a tolerância de R$ 0,01 da RN-02: a `situacao` já vem
 * classificada corretamente por quem monta a lista de entrada (ver
 * `calcularQuitacao`); esta função só soma os valores como vierem.
 */
export function calcularValorPagoVsDevido(
  pedidos: PedidoParaIndicadorValorPagoVsDevido[],
): BlocoIndicador {
  let totalPago = 0;
  let totalDevido = 0;

  const somasPorSituacao = new Map<SituacaoPagamento, { pago: number; devido: number }>(
    ORDEM_SITUACOES_PAGAMENTO.map((situacao) => [situacao, { pago: 0, devido: 0 }]),
  );

  for (const pedido of pedidos) {
    totalPago += pedido.pago;
    totalDevido += pedido.devido;

    const soma = somasPorSituacao.get(pedido.situacao);
    if (soma) {
      soma.pago += pedido.pago;
      soma.devido += pedido.devido;
    }
  }

  const linhas: LinhaIndicador[] = [
    {
      rotulos: ["Total"],
      numerador: totalPago,
      denominador: totalDevido,
      resultado: totalDevido === 0 ? null : arredondarDuasCasas(totalPago / totalDevido),
    },
    ...ORDEM_SITUACOES_PAGAMENTO.map((situacao) => {
      const soma = somasPorSituacao.get(situacao)!;
      return {
        rotulos: [situacao],
        numerador: soma.pago,
        denominador: soma.devido,
        resultado: soma.devido === 0 ? null : arredondarDuasCasas(soma.pago / soma.devido),
      };
    }),
  ];

  return {
    chave: "valorPagoVsDevido",
    titulo: "Valor pago × valor devido",
    formula: "Σ pago ÷ Σ devido",
    linhas,
  };
}
