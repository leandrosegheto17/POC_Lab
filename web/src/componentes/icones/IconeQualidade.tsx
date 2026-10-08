// TP-0055 — ícone decorativo do item de navegação "Qualidade" (escudo com
// marca de verificação). `aria-hidden="true"`: o texto do item já comunica
// o destino — mesmo padrão de IconeSpinner/IconeVazio/IconeErro (TP-0053).
export function IconeQualidade() {
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
        d="M10 2.5 16.5 5v5.5c0 4-3 6.5-6.5 7-3.5-.5-6.5-3-6.5-7V5L10 2.5Z"
        strokeLinejoin="round"
      />
      <path d="M7 10l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
