import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";

// Campo de busca de pedido. Montado UMA ÚNICA VEZ no DOM, dentro do slot
// `slotBusca` de Casca.tsx; a disposição visual
// diferente entre o menu lateral (>=1024px) e o cabeçalho do celular
// (<1024px) é resolvida inteiramente por CSS/@media sobre este MESMO
// elemento — nunca duas instâncias.
//
// Este componente não resolve o código do pedido contra a API — isso é da
// tela T2, que lê o parâmetro `:codigo` da rota `/pedido/:codigo` depois da
// navegação feita aqui.
//
// - variante "barra" (padrão, casca): no PC rótulo visível + input mono +
//   botão quadrado só com a lupa (`aria-label="Buscar"`); no celular o
//   rótulo fica `.visualmente-oculto` por CSS (mesmo elemento <label>).
// - variante "pagina" (T5): rótulo visível acima, input largo e botão com
//   o texto "Buscar".
// - `id` permite uma segunda instância na mesma página sem repetir ids
//   (ex. T5, cuja casca simples não tem a busca da barra).
type CampoBuscaProps = {
  id?: string;
  variante?: "barra" | "pagina";
};

export function CampoBusca({
  id = "busca-pedido",
  variante = "barra",
}: CampoBuscaProps) {
  const idErro = `${id}-erro`;
  const navigate = useNavigate();
  const [valor, setValor] = useState("");
  const [erroVisivel, setErroVisivel] = useState(false);

  function aoSubmeter(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const valorTrim = valor.trim();

    if (valorTrim === "") {
      setErroVisivel(true);
      return;
    }

    setErroVisivel(false);
    void navigate(`/pedido/${encodeURIComponent(valorTrim)}`);
  }

  return (
    <form
      role="search"
      className={`campo-busca campo-busca--${variante}`}
      onSubmit={aoSubmeter}
      noValidate
    >
      <label htmlFor={id} className="campo-busca__rotulo">
        Buscar pedido
      </label>
      <div className="campo-busca__linha">
        <input
          id={id}
          type="search"
          className="campo-busca__input"
          placeholder="PED-, 10248, TX-…"
          value={valor}
          onChange={(event) => { setValor(event.target.value); }}
          aria-describedby={erroVisivel ? idErro : undefined}
        />
        {variante === "pagina" ? (
          <button type="submit" className="campo-busca__botao">
            Buscar
          </button>
        ) : (
          <button
            type="submit"
            className="campo-busca__botao"
            aria-label="Buscar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </button>
        )}
      </div>
      {erroVisivel ? (
        <p id={idErro} className="campo-busca__erro">
          Informe um código
        </p>
      ) : null}
    </form>
  );
}
