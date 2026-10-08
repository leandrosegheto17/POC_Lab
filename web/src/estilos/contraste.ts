// TP-0051 — Utilitário puro de contraste WCAG 2.x, extraído para reuso
// (usado pelo teste em web/test/contraste.test.ts e, se necessário no
// futuro, por qualquer código que precise validar contraste em runtime).

/** Converte uma cor hex (#rgb ou #rrggbb) em componentes [r, g, b] 0-255. */
export function hexParaRgb(hex: string): [number, number, number] {
  const normalizado = hex.replace("#", "");

  const expandido =
    normalizado.length === 3
      ? normalizado
          .split("")
          .map((c) => c + c)
          .join("")
      : normalizado;

  const r = parseInt(expandido.slice(0, 2), 16);
  const g = parseInt(expandido.slice(2, 4), 16);
  const b = parseInt(expandido.slice(4, 6), 16);

  return [r, g, b];
}

/** Canal sRGB (0-255) convertido para o valor linear usado na fórmula de luminância. */
function canalLinear(canal: number): number {
  const c = canal / 255;

  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminância relativa de uma cor hex, conforme fórmula padrão WCAG. */
export function luminanciaRelativa(hex: string): number {
  const [r, g, b] = hexParaRgb(hex);

  const rl = canalLinear(r);
  const gl = canalLinear(g);
  const bl = canalLinear(b);

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Razão de contraste WCAG entre duas cores hex (sempre >= 1, L1 >= L2). */
export function razaoDeContraste(corA: string, corB: string): number {
  const lA = luminanciaRelativa(corA);
  const lB = luminanciaRelativa(corB);

  const l1 = Math.max(lA, lB);
  const l2 = Math.min(lA, lB);

  return (l1 + 0.05) / (l2 + 0.05);
}
