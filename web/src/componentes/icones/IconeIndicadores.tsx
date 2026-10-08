// Ajuste Modelo B (2026-10-08) — ícone do item "Indicadores" (barras),
// traço do mockup;
// tamanho por CSS (.icone-nav: 18px no PC, 20px no celular). `aria-hidden`:
// o texto do item já comunica o destino.
export function IconeIndicadores() {
  return (
    <svg
      className="icone-nav"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
