// Converte o evento da API v1 no evento do domínio. A API não expõe
// `versao_schema` (a forma v1 é, por definição, a versão 1) nem devolve
// `ordemChegada`; os demais campos seguem iguais.
import type { EventoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import type { Evento } from "nucleo/dominio/evento.js";

export function eventoV1ParaDominio(evento: EventoV1): Evento {
  const envelope = {
    fonte: evento.fonte,
    codigoEvento: evento.codigoEvento,
    momentoFato: evento.momentoFato,
  };

  switch (evento.tipo) {
    case "venda":
      return {
        ...envelope,
        tipo: "venda",
        versao_schema: 1,
        valor_devido: evento.valor_devido,
        data_limite: evento.data_limite,
        transportadora: evento.transportadora,
      };
    case "pagamento":
      return {
        ...envelope,
        tipo: "pagamento",
        versao_schema: 1,
        valor: evento.valor,
        referencia_original: evento.referencia_original,
      };
    case "coleta":
    case "transporte":
    case "entrega":
      return {
        ...envelope,
        tipo: evento.tipo,
        versao_schema: 1,
        transportadora: evento.transportadora,
        codigo_rastreio: evento.codigo_rastreio,
      };
  }
}
