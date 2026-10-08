// Ajuste Modelo B (2026-10-08) — ícone do item "Qualidade dos dados"
// (caixa com marca de verificação), traço do mockup;
// tamanho por CSS (.icone-nav: 18px no PC, 20px no celular). `aria-hidden`:
// o texto do item já comunica o destino.
export function IconeQualidade() {
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
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}
