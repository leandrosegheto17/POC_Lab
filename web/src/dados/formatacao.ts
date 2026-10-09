// Ajuste Modelo B (2026-10-08) — formatação pura, pt-BR, usada pelas telas
// do web. Não importa de `processamento/src/dominio/formatacao.ts` (o web
// formata só o que exibe; o texto gerado no processamento chega pronto).

const NUMERO = new Intl.NumberFormat("pt-BR");

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MOEDA_COMPACTA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const VALOR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const UMA_CASA = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Troca o espaço sem quebra (U+00A0/U+202F) do Intl por espaço comum. */
function espacoComum(texto: string): string {
  return texto.replace(/[\u00A0\u202F]/g, " ");
}

/** "2016-07-21T20:00:15.260Z" → "2016-07-21" (corta, sem converter fuso). */
export function formatarData(iso: string): string {
  return iso.slice(0, 10);
}

/** 8856 → "8.856". */
export function formatarNumero(n: number): string {
  return NUMERO.format(n);
}

/** Página 1, tamanho 50, total 8856 → "1–50 de 8.856". */
export function resumirPaginacao(p: {
  pagina: number;
  tamanho: number;
  total: number;
}): string {
  const inicio = (p.pagina - 1) * p.tamanho + 1;
  const fim = Math.min(p.pagina * p.tamanho, p.total);
  return `${formatarNumero(inicio)}–${formatarNumero(fim)} de ${formatarNumero(p.total)}`;
}

/** 1234.56 → "R$ 1.234,56". */
export function formatarMoeda(n: number): string {
  return espacoComum(MOEDA.format(n));
}

/** Arredonda para centavos (evita "−R$ 0,00" por resíduo de ponto flutuante). */
export function emCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Saldo em centavos com sinal: "+R$ 440,00", "−R$ 176,00", "R$ 0,00". */
export function formatarSaldo(saldoEmCentavos: number): string {
  const texto = formatarMoeda(Math.abs(saldoEmCentavos) / 100);
  if (saldoEmCentavos > 0) {
    return `+${texto}`;
  }
  if (saldoEmCentavos < 0) {
    return `−${texto}`;
  }
  return texto;
}

/** 65379257.82 → "R$ 65,4 mi"; 412000 → "R$ 412 mil". */
export function formatarMoedaCompacta(n: number): string {
  return espacoComum(MOEDA_COMPACTA.format(n));
}

/** 440 → "440,00" (sem símbolo de moeda). */
export function formatarValor(n: number): string {
  return VALOR.format(n);
}

/** (7775, 16282) → "47,8%"; denominador 0 → `null`. */
export function formatarPercentual(
  numerador: number,
  denominador: number,
): string | null {
  if (denominador === 0) {
    return null;
  }

  return `${UMA_CASA.format((numerador / denominador) * 100)}%`;
}

/** 8.4 → "8,4 dias". */
export function formatarDias(n: number): string {
  return `${UMA_CASA.format(n)} dias`;
}

/** Tira o ponto final, para a frase ganhar o seu próprio sem duplicar. */
export function semPontoFinal(texto: string): string {
  return texto.trim().replace(/\.$/, "");
}
