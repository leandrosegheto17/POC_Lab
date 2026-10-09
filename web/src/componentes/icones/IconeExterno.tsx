import { IconeBase } from "./IconeBase.tsx";

// Ícone do item "Como foi feito" (seta saindo da caixa). Tamanho por CSS (.icone-nav: 18px no PC, 20px no celular).
export function IconeExterno() {
  return (
    <IconeBase className="icone-nav" viewBox="0 0 24 24" strokeWidth="2" arredondado>
      <path d="M14 3h7v7M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </IconeBase>
  );
}
