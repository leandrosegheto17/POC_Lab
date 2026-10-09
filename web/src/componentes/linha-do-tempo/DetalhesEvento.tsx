import type { EventoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import { formatarMoeda } from "../../dados/formatacao.ts";
import { rotuloFonte, type Fonte } from "../../dados/rotulos.ts";

/** Linha de detalhe do PC: valor da venda; código + valor do pagamento;
 * nada para a transportadora (o código já está no cabeçalho). */
export function DetalhePc({ evento }: { evento: EventoV1 }) {
  if (evento.tipo === "venda") {
    return (
      <span className="evento__linha evento__linha--pc">
        <span className="mono">{formatarMoeda(evento.valor_devido)}</span>
      </span>
    );
  }
  if (evento.tipo === "pagamento") {
    return (
      <span className="evento__linha evento__linha--pc">
        <span className="mono">{evento.codigoEvento}</span> ·{" "}
        <span className="mono">{formatarMoeda(evento.valor)}</span>
      </span>
    );
  }
  return null;
}

/** Linha de código do celular: "#10248 · R$ 440,00", "TX-… · R$ 264,00",
 * "RS-000001". */
export function textoCodigoCelular(evento: EventoV1): string {
  if (evento.tipo === "venda") {
    return `#${evento.codigoEvento} · ${formatarMoeda(evento.valor_devido)}`;
  }
  if (evento.tipo === "pagamento") {
    return `${evento.codigoEvento} · ${formatarMoeda(evento.valor)}`;
  }
  return evento.codigo_rastreio;
}

/** Texto oculto com a fonte (no PC a fonte é dada só pela coluna). Para
 * venda e transportadora inclui o código, que no PC só aparece no
 * cabeçalho `aria-hidden`. */
export function textoFonteOculta(evento: EventoV1, fonte: Fonte): string {
  if (evento.tipo === "venda") {
    return `fonte: ${rotuloFonte(fonte)}, #${evento.codigoEvento}`;
  }
  if (evento.tipo === "pagamento") {
    return `fonte: ${rotuloFonte(fonte)}`;
  }
  return `fonte: ${rotuloFonte(fonte)}, ${evento.codigo_rastreio}`;
}
