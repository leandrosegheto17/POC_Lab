import { useSearchParams } from "react-router";
import { comTentativa } from "../dados/use-consulta.ts";
import { ehTipoDivergencia, type TipoDivergencia } from "../dados/rotulos.ts";
import { VALOR_TODOS } from "../dados/rotulos.ts";

export const TAMANHO_PAGINA = 50;

/**
 * Valida o `?pagina=` da URL: inteiro >= 1, sem sinal nem zero à esquerda
 * (rejeita "abc", "0", "1e2"). Ausente é válido (página 1).
 */
export const PADRAO_PAGINA_VALIDA = /^[1-9]\d*$/;

/** Monta a URL de consulta com filtro e página; ver `comTentativa`. */
export function construirUrlConsulta(
  tipo: TipoDivergencia | null,
  pagina: number,
  tentativa: number,
): string {
  const parametros = new URLSearchParams();
  if (tipo !== null) {
    parametros.set("tipo", tipo);
  }
  parametros.set("pagina", String(pagina));
  parametros.set("tamanho", String(TAMANHO_PAGINA));
  return comTentativa(`/api/v1/divergencias?${parametros.toString()}`, tentativa);
}

/** Lê e valida `tipo`/`pagina` da URL e oferece as trocas de filtro e página. */
export function useFiltroDivergencias() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tipoNaUrl = searchParams.get("tipo");
  const tipoInvalidoNaUrl = tipoNaUrl !== null && !ehTipoDivergencia(tipoNaUrl);
  const tipoValido: TipoDivergencia | null = tipoInvalidoNaUrl ? null : tipoNaUrl;

  const paginaNaUrlTexto = searchParams.get("pagina");
  const paginaInvalidaNaUrl =
    paginaNaUrlTexto !== null && !PADRAO_PAGINA_VALIDA.test(paginaNaUrlTexto);
  const pagina =
    paginaInvalidaNaUrl || paginaNaUrlTexto === null ? 1 : Number(paginaNaUrlTexto);

  function aoMudarFiltro(tipo: string) {
    const novosParametros = new URLSearchParams(searchParams);
    if (tipo === VALOR_TODOS) {
      novosParametros.delete("tipo");
    } else {
      novosParametros.set("tipo", tipo);
    }
    // Troca de filtro volta à página 1: `pagina` é removido (URL limpa) numa
    // única navegação.
    novosParametros.delete("pagina");
    setSearchParams(novosParametros);
  }

  function aoMudarPagina(novaPagina: number) {
    const novosParametros = new URLSearchParams(searchParams);
    if (novaPagina <= 1) {
      novosParametros.delete("pagina");
    } else {
      novosParametros.set("pagina", String(novaPagina));
    }
    setSearchParams(novosParametros);
  }

  /** Link de "Ir para a página 1": mantém o `tipo` válido, sem `pagina`. */
  function construirHrefPaginaUm(): string {
    const parametros = new URLSearchParams();
    if (tipoValido !== null) {
      parametros.set("tipo", tipoValido);
    }
    const consulta = parametros.toString();
    return consulta ? `/?${consulta}` : "/";
  }

  return {
    tipoNaUrl,
    tipoValido,
    tipoInvalidoNaUrl,
    pagina,
    paginaInvalidaNaUrl,
    aoMudarFiltro,
    aoMudarPagina,
    construirHrefPaginaUm,
  };
}
