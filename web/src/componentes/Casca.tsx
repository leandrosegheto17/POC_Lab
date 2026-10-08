import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { NavegacaoPrincipal } from "./NavegacaoPrincipal.tsx";

type CascaProps = {
  // TP-0056 — a FaixaResumo entra aqui, dentro do <header>, quando a
  // tarefa correspondente for implementada. Por ora undefined/null.
  slotResumo?: ReactNode;
  // TP-0057 — o CampoBusca entra aqui, dentro do <header>, ao lado do
  // slotResumo. Por ora undefined/null.
  slotBusca?: ReactNode;
};

// TP-0055 — casca do app: link "Pular para o conteúdo", cabeçalho (com os
// slots de TP-0056/TP-0057), a navegação principal (único <nav>) e a área
// principal onde cada rota renderiza via <Outlet/>.
//
// Ordem no markup (não CSS `order`, exceto na regra de altura < 480px
// documentada em casca.css) para bater com a navegação por teclado/leitor
// de tela: pular para o conteúdo -> slot de busca -> NavegacaoPrincipal ->
// main.
export function Casca({ slotResumo = null, slotBusca = null }: CascaProps) {
  return (
    <div className="casca">
      <a href="#conteudo-principal" className="pular-para-conteudo">
        Pular para o conteúdo
      </a>
      <header className="casca__cabecalho">
        {slotResumo}
        {slotBusca}
      </header>
      <div className="casca__corpo">
        <NavegacaoPrincipal />
        <main id="conteudo-principal" className="casca__conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
