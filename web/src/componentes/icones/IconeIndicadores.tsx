// TP-0055 — ícone decorativo do item de navegação "Indicadores" (gráfico de
// barras simples). `aria-hidden="true"`: o texto do item já comunica o
// destino — mesmo padrão de IconeSpinner/IconeVazio/IconeErro (TP-0053).
export function IconeIndicadores() {
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
      <path d="M3 17V10M9 17V5M15 17V12.5" strokeLinecap="round" />
      <path d="M2.5 17h15" strokeLinecap="round" />
    </svg>
  );
}
