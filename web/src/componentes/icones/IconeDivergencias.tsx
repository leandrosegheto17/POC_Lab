// Ajuste Modelo B (2026-10-08) — ícone do item "Divergências" (triângulo
// de alerta), traço do mockup;
// tamanho por CSS (.icone-nav: 18px no PC, 20px no celular). `aria-hidden`:
// o texto do item já comunica o destino.
export function IconeDivergencias() {
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
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}
