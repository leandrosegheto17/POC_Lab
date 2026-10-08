import "./Paginacao.css";

type PaginacaoProps = {
  pagina: number;
  totalPaginas: number;
  aoMudarPagina: (pagina: number) => void;
  carregando?: boolean;
};

type ItemPagina = number | "reticencias";

// TP-0054 — heurística de truncamento da lista de páginas: com até 7
// páginas, lista todas (1..totalPaginas). Acima disso, mostra sempre a
// primeira e a última página, mais a página atual e suas vizinhas
// imediatas (atual-1, atual, atual+1), inserindo "…" nos saltos — evita uma
// lista longa demais sem esconder o início/fim nem a posição atual.
function gerarItensDePagina(
  pagina: number,
  totalPaginas: number,
): ItemPagina[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
  }

  const paginasNucleo = new Set<number>([
    1,
    totalPaginas,
    pagina - 1,
    pagina,
    pagina + 1,
  ]);

  const paginasValidas = [...paginasNucleo]
    .filter((numero) => numero >= 1 && numero <= totalPaginas)
    .sort((a, b) => a - b);

  const itens: ItemPagina[] = [];

  for (let indice = 0; indice < paginasValidas.length; indice += 1) {
    const atual = paginasValidas[indice];
    const anterior = paginasValidas[indice - 1];

    if (indice > 0 && atual - anterior > 1) {
      itens.push("reticencias");
    }

    itens.push(atual);
  }

  return itens;
}

// TP-0054 — navegação de paginação acessível, com duas formas de
// apresentação alternadas por CSS (sem JS/matchMedia):
//   - `.paginacao-completa`: lista numerada de páginas, visível >= 640px.
//   - `.paginacao-compacta`: "Página N de M" + Anterior/Próxima, < 640px.
//
// Os botões Anterior/Próxima usam `aria-disabled` (nunca `disabled`
// nativo) para permanecerem focáveis mesmo no limite/durante
// carregamento; o próprio `onClick` verifica a condição antes de chamar
// `aoMudarPagina`, então o estado "desabilitado" nunca dispara navegação.
export function Paginacao({
  pagina,
  totalPaginas,
  aoMudarPagina,
  carregando = false,
}: PaginacaoProps) {
  const paginaAnteriorDesabilitada = pagina === 1 || carregando;
  const proximaPaginaDesabilitada = pagina === totalPaginas || carregando;
  const itens = gerarItensDePagina(pagina, totalPaginas);

  function irParaPaginaAnterior() {
    if (paginaAnteriorDesabilitada) {
      return;
    }

    aoMudarPagina(pagina - 1);
  }

  function irParaProximaPagina() {
    if (proximaPaginaDesabilitada) {
      return;
    }

    aoMudarPagina(pagina + 1);
  }

  function irParaPagina(numeroDaPagina: number) {
    if (carregando || numeroDaPagina === pagina) {
      return;
    }

    aoMudarPagina(numeroDaPagina);
  }

  return (
    <nav aria-label="Paginação" className="paginacao">
      <div className="paginacao-completa">
        <button
          type="button"
          aria-disabled={paginaAnteriorDesabilitada || undefined}
          onClick={irParaPaginaAnterior}
        >
          Anterior
        </button>
        <ul className="paginacao-lista">
          {itens.map((item, indice) =>
            item === "reticencias" ? (
              <li key={`reticencias-${indice}`} aria-hidden="true">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-current={item === pagina ? "page" : undefined}
                  aria-disabled={carregando || undefined}
                  onClick={() => irParaPagina(item)}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>
        <button
          type="button"
          aria-disabled={proximaPaginaDesabilitada || undefined}
          onClick={irParaProximaPagina}
        >
          Próxima
        </button>
      </div>
      <div className="paginacao-compacta">
        <button
          type="button"
          aria-disabled={paginaAnteriorDesabilitada || undefined}
          onClick={irParaPaginaAnterior}
        >
          Anterior
        </button>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          aria-disabled={proximaPaginaDesabilitada || undefined}
          onClick={irParaProximaPagina}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
