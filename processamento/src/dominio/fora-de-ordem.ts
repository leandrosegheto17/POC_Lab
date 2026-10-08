import type { Evento } from "./evento.js";
import type { AchadoQualidade } from "./modelo.js";
import { ordenarEventos } from "./ordenacao.js";

/**
 * Resultado da detecção de RN-08 (eventos fora de ordem) para um conjunto de
 * eventos de um único pedido.
 */
export type ResultadoForaDeOrdem = {
  achados: AchadoQualidade[];
  marcados: Map<string, boolean>;
};

/**
 * Chave do `Map` de marcação: combina `fonte` e `codigoEvento` para evitar
 * colisão entre fontes diferentes que (em teoria) reutilizem o mesmo código.
 */
function chave(evento: Evento): string {
  return `${evento.fonte}:${evento.codigoEvento}`;
}

/**
 * Posição de chegada de cada evento, assumindo que todo evento recebido por
 * esta função tem `ordemChegada` preenchido pelo chamador (o campo é opcional
 * no tipo `EnvelopeEvento` para não quebrar código que não lida com RN-08,
 * mas é obrigatório, por contrato, para quem chama `detectarForaDeOrdem`).
 */
function posicaoChegada(evento: Evento): number {
  return evento.ordemChegada as number;
}

/**
 * Detecta RN-08: eventos recebidos fora de ordem, por pedido e por fonte.
 *
 * Recebe os eventos já pertencentes a um único pedido (quem chama já filtrou
 * por pedido); esta função agrupa internamente apenas por `fonte`, já que a
 * regra compara ordem de chegada x ordem canônica dentro da mesma fonte.
 *
 * Para cada fonte: ordena o grupo por `ordemChegada` (ordem de chegada) e,
 * separadamente, pela ordenação canônica (`ordenarEventos`, RN-07). Se a
 * posição relativa de um evento diferir entre as duas ordenações, ele é
 * marcado `fora_de_ordem` e gera um achado de qualidade (nunca uma
 * `Divergencia`).
 *
 * Função pura, sem I/O. Não decide se o achado configura divergência — isso
 * é responsabilidade de outra camada.
 */
export function detectarForaDeOrdem(eventos: Evento[]): ResultadoForaDeOrdem {
  const achados: AchadoQualidade[] = [];
  const marcados = new Map<string, boolean>();

  const porFonte = new Map<string, Evento[]>();
  for (const evento of eventos) {
    const grupo = porFonte.get(evento.fonte);
    if (grupo) {
      grupo.push(evento);
    } else {
      porFonte.set(evento.fonte, [evento]);
    }
  }

  for (const grupo of porFonte.values()) {
    if (grupo.length <= 1) {
      for (const evento of grupo) {
        marcados.set(chave(evento), false);
      }
      continue;
    }

    const ordemChegada = [...grupo].sort(
      (a, b) => posicaoChegada(a) - posicaoChegada(b),
    );
    const ordemCanonica = ordenarEventos(grupo);

    const posicaoNaChegada = new Map<string, number>();
    ordemChegada.forEach((evento, indice) => {
      posicaoNaChegada.set(chave(evento), indice);
    });

    const posicaoNaCanonica = new Map<string, number>();
    ordemCanonica.forEach((evento, indice) => {
      posicaoNaCanonica.set(chave(evento), indice);
    });

    for (const evento of grupo) {
      const chaveEvento = chave(evento);
      const foraDeOrdem =
        posicaoNaChegada.get(chaveEvento) !== posicaoNaCanonica.get(chaveEvento);

      marcados.set(chaveEvento, foraDeOrdem);

      if (foraDeOrdem) {
        achados.push({
          tipo: "fora_de_ordem",
          fonte: evento.fonte,
          referencia: evento.codigoEvento,
          regra:
            "ordem de chegada diverge da ordem canônica (momentoFato, tipo, codigoEvento) dentro da mesma fonte",
          detalhe: `evento recebido na posição ${String(posicaoNaChegada.get(
            chaveEvento,
          ))} da ordem de chegada, mas sua posição na ordem canônica é ${String(posicaoNaCanonica.get(
            chaveEvento,
          ))}`,
        });
      }
    }
  }

  return { achados, marcados };
}
