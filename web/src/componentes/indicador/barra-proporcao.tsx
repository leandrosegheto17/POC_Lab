/** Largura da barra de proporção, em %, entre 0 e 100. */
function larguraBarra(numerador: number, denominador: number): number {
  if (denominador === 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (numerador / denominador) * 100));
}

export function BarraProporcao({
  numerador,
  denominador,
}: {
  numerador: number;
  denominador: number;
}) {
  return (
    <div className="indicador__barra" aria-hidden="true">
      <span style={{ width: `${String(larguraBarra(numerador, denominador))}%` }} />
    </div>
  );
}
