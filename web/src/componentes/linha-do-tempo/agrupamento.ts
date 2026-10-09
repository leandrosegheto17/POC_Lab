import type { EventoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import { formatarData } from "../../dados/formatacao.ts";
import type { Fonte } from "../../dados/rotulos.ts";

export type GrupoPorData = {
  data: string;
  eventos: EventoV1[];
};

/** Agrupa por `AAAA-MM-DD`, na ordem de primeira aparição (sem reordenar). */
export function agruparPorData(eventos: EventoV1[]): GrupoPorData[] {
  const grupos = new Map<string, EventoV1[]>();
  for (const evento of eventos) {
    const data = formatarData(evento.momentoFato);
    const lista = grupos.get(data);
    if (lista) {
      lista.push(evento);
    } else {
      grupos.set(data, [evento]);
    }
  }
  return Array.from(grupos, ([data, lista]) => ({ data, eventos: lista }));
}

/** Valores distintos, na ordem de primeira aparição. */
function distintos(valores: string[]): string[] {
  return Array.from(new Set(valores));
}

export function codigosDoCabecalho(
  eventos: EventoV1[],
  codigoVendas: string | undefined,
): Record<Fonte, string> {
  const vendas = codigoVendas
    ? [codigoVendas]
    : distintos(
        eventos
          .filter((evento) => evento.tipo === "venda")
          .map((evento) => evento.codigoEvento),
      );
  const pagamentos = distintos(
    eventos
      .filter((evento) => evento.tipo === "pagamento")
      .map((evento) => evento.codigoEvento),
  );
  const rastreio = distintos(
    eventos.flatMap((evento) =>
      evento.tipo === "coleta" ||
      evento.tipo === "transporte" ||
      evento.tipo === "entrega"
        ? [evento.codigo_rastreio]
        : [],
    ),
  );

  return {
    vendas: vendas.map((codigo) => `#${codigo}`).join(" · "),
    pagamentos: pagamentos.join(" · "),
    rastreio: rastreio.join(" · "),
  };
}

export type MarcaEvento = { variante: "ok" | "alerta" | "ruim" | "neutra"; texto: string };

export function marcasDoEvento(
  evento: EventoV1,
  duplicado: boolean,
  dataLimite: string | undefined,
): MarcaEvento[] {
  const marcas: MarcaEvento[] = [];
  if (duplicado) {
    marcas.push({ variante: "ruim", texto: "duplicado" });
  }
  if (evento.chegouForaDeOrdem) {
    marcas.push({ variante: "alerta", texto: "chegou fora de ordem" });
  }
  if (evento.tipo === "entrega" && dataLimite !== undefined) {
    marcas.push(
      evento.momentoFato <= dataLimite
        ? { variante: "ok", texto: "no prazo" }
        : { variante: "neutra", texto: "atrasada" },
    );
  }
  return marcas;
}
