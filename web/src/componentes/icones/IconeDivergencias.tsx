// TP-0055 — ícone decorativo do item de navegação "Divergências": duas
// setas em sentidos opostos, representando itens que não se conciliam.
// `aria-hidden="true"` porque o texto do item já comunica o destino —
// mesmo padrão de IconeSpinner/IconeVazio/IconeErro (TP-0053).
export function IconeDivergencias() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M3 7h10.5M13.5 7 10.5 4M13.5 7 10.5 10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 13H6.5M6.5 13 9.5 10M6.5 13 9.5 16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
