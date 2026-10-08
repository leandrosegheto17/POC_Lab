// TP-0055 — ícone decorativo de link externo (seta saindo de uma caixa),
// usado no item "Como foi feito ↗" da navegação principal. `aria-hidden`:
// o `aria-label` do próprio link já descreve que ele abre em nova aba —
// mesmo padrão de IconeSpinner/IconeVazio/IconeErro (TP-0053).
export function IconeExterno() {
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
        d="M8 5H4.5v10.5H15V12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 10.5 16 4M11 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
