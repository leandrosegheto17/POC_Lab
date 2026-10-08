import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

// TP-0057 — campo de busca de pedido. Montado UMA ÚNICA VEZ no DOM, dentro
// do slot `slotBusca` de Casca.tsx (ver TP-0055); a disposição visual
// diferente entre o menu lateral (>=1024px) e o cabeçalho do celular
// (<1024px) é resolvida inteiramente por CSS/@media sobre este MESMO
// elemento — nunca duas instâncias.
//
// Fora de escopo aqui: resolver o código do pedido contra a API — isso é
// da tela T2 (Lote 13), que lê o parâmetro `:codigo` da rota
// `/pedido/:codigo` depois da navegação feita neste componente.
const ID_CAMPO = "busca-pedido";
const ID_ERRO = "busca-pedido-erro";

export function CampoBusca() {
  const navigate = useNavigate();
  const [valor, setValor] = useState("");
  const [erroVisivel, setErroVisivel] = useState(false);

  function aoSubmeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const valorTrim = valor.trim();

    if (valorTrim === "") {
      setErroVisivel(true);
      return;
    }

    setErroVisivel(false);
    navigate(`/pedido/${encodeURIComponent(valorTrim)}`);
  }

  return (
    <form
      role="search"
      className="campo-busca"
      onSubmit={aoSubmeter}
      noValidate
    >
      <label htmlFor={ID_CAMPO} className="campo-busca__rotulo">
        Buscar pedido
      </label>
      <input
        id={ID_CAMPO}
        type="text"
        className="campo-busca__input"
        placeholder="PED-, 10248, TX-…"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        aria-describedby={erroVisivel ? ID_ERRO : undefined}
      />
      <button type="submit" className="campo-busca__botao">
        <svg
          viewBox="0 0 20 20"
          width="20"
          height="20"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="9" cy="9" r="6" />
          <line x1="13.5" y1="13.5" x2="17" y2="17" strokeLinecap="round" />
        </svg>
        Buscar
      </button>
      {erroVisivel ? (
        <p id={ID_ERRO} className="campo-busca__erro">
          Informe um código
        </p>
      ) : null}
    </form>
  );
}
