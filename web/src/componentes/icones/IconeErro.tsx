import { IconeBase } from "./IconeBase.tsx";

// Ícone decorativo de erro; o anúncio é feito pelo texto e pelo `role="alert"` do container.
export function IconeErro() {
  return (
    <IconeBase tamanho={20} viewBox="0 0 20 20" strokeWidth="1.5">
      <path d="M10 2.5 18 16.5H2L10 2.5Z" strokeLinejoin="round" />
      <path d="M10 8v4" strokeLinecap="round" />
      <circle cx="10" cy="14.25" r="0.75" fill="currentColor" stroke="none" />
    </IconeBase>
  );
}
