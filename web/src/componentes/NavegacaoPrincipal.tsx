import { NavLink, useLocation } from "react-router";
import { IconeDivergencias } from "./icones/IconeDivergencias.tsx";
import { IconeIndicadores } from "./icones/IconeIndicadores.tsx";
import { IconeQualidade } from "./icones/IconeQualidade.tsx";
import { IconeExterno } from "./icones/IconeExterno.tsx";

// TP-0055 — navegação principal do app: ÚNICO <nav> no DOM, em qualquer
// rota. O CSS (estilos/casca.css) reposiciona este mesmo elemento como
// menu lateral fixo em >=1024px ou como barra de abas inferior em
// <1024px — a troca de layout é inteiramente via @media, nunca via JS.
//
// Item ativo: `NavLink` do react-router já aplica `aria-current="page"`
// automaticamente no link que corresponde à rota corrente; a classe
// `navegacao-principal__item--ativo` só cuida do estilo visual (mockup
// Modelo B: fundo --cor-menu-ativo e texto destaque no PC; só texto
// destaque na barra de abas do celular).
//
// "Divergências" também aparece ativo (só a classe visual) em `/pedido/*`,
// porque a T2 é aberta a partir da T1; `aria-current` continua só na rota
// exata (`end`).
function montarClasse(ativo: boolean) {
  return [
    "navegacao-principal__item",
    ativo ? "navegacao-principal__item--ativo" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function classeItem({ isActive }: { isActive: boolean }) {
  return montarClasse(isActive);
}

// URL placeholder — preencher com o link real do repositório quando
// publicado.
const URL_REPOSITORIO = "https://github.com/exemplo/poc-lab";

type NavegacaoPrincipalProps = {
  /** `false` na casca simples (T5): navegação sem ícones. */
  comIcones?: boolean;
};

export function NavegacaoPrincipal({ comIcones = true }: NavegacaoPrincipalProps) {
  const { pathname } = useLocation();
  const emPedido = pathname.startsWith("/pedido/");

  return (
    <nav
      className={
        comIcones
          ? "navegacao-principal"
          : "navegacao-principal navegacao-principal--sem-icones"
      }
      aria-label="Navegação principal"
    >
      <ul className="navegacao-principal__lista">
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) => montarClasse(isActive || emPedido)}
          >
            {comIcones ? <IconeDivergencias /> : null}
            <span>Divergências</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/indicadores" className={classeItem}>
            {comIcones ? <IconeIndicadores /> : null}
            <span>Indicadores</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/qualidade" className={classeItem}>
            {comIcones ? <IconeQualidade /> : null}
            {/* Rótulo longo no PC, curto no celular (alternados por CSS). */}
            <span className="so-pc">Qualidade dos dados</span>
            <span className="so-celular">Qualidade</span>
          </NavLink>
        </li>
        <li>
          <a
            href={URL_REPOSITORIO}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Como foi feito (abre o repositório)"
            className="navegacao-principal__item"
          >
            {comIcones ? <IconeExterno /> : null}
            <span>Como foi feito</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
