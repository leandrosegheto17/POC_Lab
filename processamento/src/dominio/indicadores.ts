import type { TipoDivergencia } from "./modelo.js";

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
