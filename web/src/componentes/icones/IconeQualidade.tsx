import { IconeBase } from "./IconeBase.tsx";

// Ícone do item "Qualidade dos dados" (caixa com marca de verificação). Tamanho por CSS (.icone-nav: 18px no PC, 20px no celular).
export function IconeQualidade() {
  return (
    <IconeBase className="icone-nav" viewBox="0 0 24 24" strokeWidth="2" arredondado>
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </IconeBase>
  );
}
