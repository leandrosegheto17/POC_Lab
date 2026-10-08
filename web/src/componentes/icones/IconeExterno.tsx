// Ajuste Modelo B (2026-10-08) — ícone do item "Como foi feito" (seta
// saindo da caixa), traço do mockup;
// tamanho por CSS (.icone-nav: 18px no PC, 20px no celular). `aria-hidden`:
// o texto do item já comunica o destino.
export function IconeExterno() {
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
      <path d="M14 3h7v7M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}
