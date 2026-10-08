// TP-0058 — Cartões de resumo: 4 indicadores agregados vindos de
// `useResumo()` (mesmo contexto da TP-0056/FaixaResumo, sem chamada de rede
// própria). Enquanto a consulta carrega ou falha, cada cartão mostra "—"
// (em mono, mesma fonte do valor em sucesso) + "indisponível agora" — nunca
// `role="alert"`/`aria-live`, nunca a mensagem técnica do erro, mesmo
// padrão de silêncio de `FaixaResumo`.
//
// Decisão sobre `Cartao.resultado` (processamento/contrato/resumo.ts): o
// campo já chega como fração 0–1 (numerador/denominador), não como
// percentual pronto — confirmado pela forma do esquema (`resultado` é só
// `numerador / denominador`, sem multiplicação por 100 em nenhum produtor
// conhecido do contrato). Por isso os dois indicadores percentuais
// multiplicam por 100 aqui antes de formatar. Quando `resultado` é `null`
// (caso de `denominador: 0`, ver comentário do esquema), também tratamos
// como "—"/"indisponível agora" para esse cartão específico, para nunca
// renderizar "NaN%".
import "./CartoesResumo.css";
import { useResumo } from "../dados/contexto-resumo.tsx";
import type { Cartao } from "processamento/contrato/resumo.js";

const FORMATADOR_NUMERO = new Intl.NumberFormat("pt-BR");
const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const FORMATADOR_PERCENTUAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatarPercentual(resultado: number): string {
  return `${FORMATADOR_PERCENTUAL.format(resultado * 100)}%`;
}

type LinhaCartao = {
  titulo: string;
  /** `null` quando não há resumo disponível ou o indicador não pôde ser calculado. */
  valor: string | null;
  /** `null` no mesmo caso de `valor`; nunca renderizado sem `valor`. */
  base: string | null;
};

function CartaoResumo({ titulo, valor, base }: LinhaCartao) {
  return (
    <div className="cartao-resumo">
      <p className="cartao-resumo-titulo">{titulo}</p>
      <p className="cartao-resumo-valor">{valor ?? "—"}</p>
      <p className="cartao-resumo-base">{base ?? "indisponível agora"}</p>
    </div>
  );
}

function linhaPercentualDePedidos(
  titulo: string,
  cartao: Cartao,
  baseFraseFinal: string,
): LinhaCartao {
  if (cartao.resultado === null) {
    return { titulo, valor: null, base: null };
  }

  return {
    titulo,
    valor: formatarPercentual(cartao.resultado),
    base: `${FORMATADOR_NUMERO.format(cartao.numerador)} de ${FORMATADOR_NUMERO.format(
      cartao.denominador,
    )} ${baseFraseFinal}`,
  };
}

function linhaMoeda(titulo: string, cartao: Cartao, baseFixa: string): LinhaCartao {
  return {
    titulo,
    valor: FORMATADOR_MOEDA.format(cartao.numerador),
    base: baseFixa,
  };
}

export function CartoesResumo() {
  const { resumo, estado } = useResumo();

  const semResumo = estado !== "sucesso" || resumo === null;

  const linhas: LinhaCartao[] = semResumo
    ? [
        { titulo: "Com divergência", valor: null, base: null },
        { titulo: "Valor em aberto", valor: null, base: null },
        { titulo: "Pago a mais", valor: null, base: null },
        { titulo: "Entregas no prazo", valor: null, base: null },
      ]
    : [
        linhaPercentualDePedidos(
          "Com divergência",
          resumo.totais.pedidosComDivergencia,
          "pedidos",
        ),
        linhaMoeda(
          "Valor em aberto",
          resumo.totais.valorEmAberto,
          "Soma do que falta pagar em pedidos parciais ou não pagos.",
        ),
        linhaMoeda(
          "Pago a mais",
          resumo.totais.pagoAMais,
          "Soma do excedente em pagamentos duplicados.",
        ),
        linhaPercentualEntregas(resumo.totais.entregasNoPrazo),
      ];

  return (
    <div className="cartoes-resumo">
      {linhas.map((linha) => (
        <CartaoResumo key={linha.titulo} {...linha} />
      ))}
    </div>
  );
}

function linhaPercentualEntregas(cartao: Cartao): LinhaCartao {
  if (cartao.resultado === null) {
    return { titulo: "Entregas no prazo", valor: null, base: null };
  }

  return {
    titulo: "Entregas no prazo",
    valor: formatarPercentual(cartao.resultado),
    base: `${FORMATADOR_NUMERO.format(cartao.numerador)} de ${FORMATADOR_NUMERO.format(
      cartao.denominador,
    )}`,
  };
}
