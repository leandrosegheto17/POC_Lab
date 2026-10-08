import { NavLink } from "react-router";
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
// `navegacao-principal__item--ativo` só cuida do estilo visual (fundo
// --cor-superficie, barra de destaque de 3px, negrito).
function classeItem({ isActive }: { isActive: boolean }) {
  return [
    "navegacao-principal__item",
    isActive ? "navegacao-principal__item--ativo" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// URL placeholder — preencher com o link real do repositório quando
// publicado.
const URL_REPOSITORIO = "https://github.com/exemplo/poc-lab";

export function NavegacaoPrincipal() {
  return (
    <nav className="navegacao-principal" aria-label="Navegação principal">
      <ul className="navegacao-principal__lista">
        <li>
          <NavLink to="/" end className={classeItem}>
            <IconeDivergencias />
            <span>Divergências</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/indicadores" className={classeItem}>
            <IconeIndicadores />
            <span>Indicadores</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/qualidade" className={classeItem}>
            <IconeQualidade />
            <span>Qualidade</span>
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
            <IconeExterno />
            <span>Como foi feito ↗</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
