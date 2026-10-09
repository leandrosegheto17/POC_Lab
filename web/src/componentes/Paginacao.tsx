import "./Paginacao.css";

type PaginacaoProps = {
  pagina: number;
  totalPaginas: number;
  aoMudarPagina: (pagina: number) => void;
  carregando?: boolean;
  /** Texto à esquerda no PC, ex. "1–50 de 8.856". */
  resumo?: string;
};

type ItemPagina = number | "reticencias";

// Heurística de truncamento da lista de páginas: com até 7
// páginas, lista todas (1..totalPaginas). Acima disso, mostra sempre a
// primeira e a última página, mais a página atual e suas vizinhas
// imediatas (atual-1, atual, atual+1), inserindo "…" nos saltos — evita uma
// lista longa demais sem esconder o início/fim nem a posição atual.
// Na página 1 mostra também a 3 ("1 2 3 … 40", como o mockup).
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
    ...(pagina === 1 ? [3] : []),
  ]);

  const paginasValidas = [...paginasNucleo]
    .filter((numero) => numero >= 1 && numero <= totalPaginas)
    .sort((a, b) => a - b);

  const itens: ItemPagina[] = [];

  let anterior: number | undefined;
  for (const atual of paginasValidas) {
    if (anterior !== undefined && atual - anterior > 1) {
      itens.push("reticencias");
    }
    itens.push(atual);
    anterior = atual;
  }

  return itens;
}

// Navegação de paginação acessível, com duas formas de
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
  resumo,
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
      {resumo ? <span className="paginacao__resumo">{resumo}</span> : null}
      <div className="paginacao-completa">
        <button
          type="button"
          className="paginacao__botao"
          aria-disabled={paginaAnteriorDesabilitada || undefined}
          onClick={irParaPaginaAnterior}
        >
          Anterior
        </button>
        <ul className="paginacao-lista">
          {itens.map((item, indice) =>
            item === "reticencias" ? (
              <li
                key={`reticencias-${String(indice)}`}
                className="paginacao__reticencias"
                aria-hidden="true"
              >
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  className="paginacao__botao"
                  aria-current={item === pagina ? "page" : undefined}
                  aria-disabled={carregando || undefined}
                  onClick={() => { irParaPagina(item); }}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>
        <button
          type="button"
          className="paginacao__botao"
          aria-disabled={proximaPaginaDesabilitada || undefined}
          onClick={irParaProximaPagina}
        >
          Próxima
        </button>
      </div>
      <div className="paginacao-compacta">
        <button
          type="button"
          className="paginacao__botao"
          aria-disabled={paginaAnteriorDesabilitada || undefined}
          onClick={irParaPaginaAnterior}
        >
          Anterior
        </button>
        <span className="paginacao__posicao">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          className="paginacao__botao paginacao__botao--proxima"
          aria-disabled={proximaPaginaDesabilitada || undefined}
          onClick={irParaProximaPagina}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
