import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { NavegacaoPrincipal } from "./NavegacaoPrincipal.tsx";
import { LogoMarca } from "./LogoMarca.tsx";

type CascaProps = {
  // A FaixaResumo entra aqui, dentro de `.casca__barra`.
  slotResumo?: ReactNode;
  // O CampoBusca entra aqui, dentro de `.casca__barra`, entre a logo e a
  // navegação.
  slotBusca?: ReactNode;
  // "simples" é a casca da T5 (página não
  // encontrada): sem busca, sem faixa e navegação sem ícones (quem decide
  // não passar os slots é Rotas.tsx). No celular continua com a barra de
  // abas.
  variante?: "completa" | "simples";
};

// Casca do app: link "Pular para o conteúdo", a barra única
// (`.casca__barra`, logo + busca + navegação + faixa de resumo) e a área
// principal onde cada rota renderiza via <Outlet/>.
//
// Não há <header> de largura cheia acima do conteúdo: logo, busca,
// NavegacaoPrincipal (único <nav> do DOM) e FaixaResumo são os MESMOS 4
// elementos em qualquer largura de tela, só reagrupados visualmente por
// CSS (ver casca-*.css):
// - >=1024px: `.casca__barra` é o menu lateral fixo do mockup — coluna
//   única, sticky, altura da janela, com logo no topo, busca abaixo,
//   depois a navegação (cresce para ocupar o espaço restante) e, encostada
//   embaixo, a faixa "Dados sintéticos...".
// - <1024px: `.casca__barra` fica no fluxo normal no topo da página (não
//   fixa), com logo, busca e faixa empilhados; a navegação some do fluxo
//   porque fica `position: fixed` como barra de abas no rodapé (UX-SPEC
//   §6) — sem duplicar nenhum dos 4 elementos.
//
// Ordem no DOM (não muda por CSS `order`, exceto a regra de altura
// <=480px documentada em casca-*.css) para bater com a navegação por
// teclado/leitor de tela: pular para o conteúdo -> busca -> navegação ->
// main. Logo e faixa não são focáveis, então a posição deles no DOM não
// afeta essa ordem.
export function Casca({
  slotResumo = null,
  slotBusca = null,
  variante = "completa",
}: CascaProps) {
  return (
    <div className={`casca casca--${variante}`}>
      <a href="#conteudo-principal" className="pular-para-conteudo">
        Pular para o conteúdo
      </a>
      <aside className="casca__barra">
        <LogoMarca />
        {slotBusca}
        <NavegacaoPrincipal comIcones={variante === "completa"} />
        {slotResumo}
      </aside>
      <main id="conteudo-principal" className="casca__conteudo">
        <Outlet />
      </main>
    </div>
  );
}
