import type { ReactNode } from "react";

interface IconeBaseProps {
  className?: string;
  /** Tamanho em px quando não definido por CSS (ícones de estado). */
  tamanho?: number;
  viewBox: string;
  strokeWidth: string;
  /** Pontas arredondadas nos ícones de navegação. */
  arredondado?: boolean;
  children: ReactNode;
}

// Invólucro comum dos ícones: traço da cor do texto e `aria-hidden`, pois o
// texto ao lado já comunica o significado.
export function IconeBase({
  className,
  tamanho,
  viewBox,
  strokeWidth,
  arredondado,
  children,
}: IconeBaseProps) {
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap={arredondado ? "round" : undefined}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
