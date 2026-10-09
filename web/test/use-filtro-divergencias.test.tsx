import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { useFiltroDivergencias } from "../src/nav/useFiltroDivergencias.ts";

function ler(busca: string) {
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/${busca}`]}>{children}</MemoryRouter>
  );
  return renderHook(() => useFiltroDivergencias(), { wrapper: envoltorio }).result
    .current;
}

describe("useFiltroDivergencias", () => {
  it("tipo inválido é marcado e não vira filtro", () => {
    const r = ler("?tipo=xyz");
    expect(r.tipoInvalidoNaUrl).toBe(true);
    expect(r.tipoValido).toBeNull();
  });

  it("tipo válido é mantido e entra no href da página 1", () => {
    const r = ler("?tipo=duplicado&pagina=3");
    expect(r.tipoInvalidoNaUrl).toBe(false);
    expect(r.tipoValido).toBe("duplicado");
    expect(r.pagina).toBe(3);
    expect(r.construirHrefPaginaUm()).toBe("/?tipo=duplicado");
  });

  it.each(["0", "1e2", "-1", "abc", "01"])("pagina %s é inválida", (valor) => {
    const r = ler(`?pagina=${valor}`);
    expect(r.paginaInvalidaNaUrl).toBe(true);
    expect(r.pagina).toBe(1);
  });

  it("pagina ausente é página 1 e válida", () => {
    const r = ler("");
    expect(r.paginaInvalidaNaUrl).toBe(false);
    expect(r.pagina).toBe(1);
    expect(r.construirHrefPaginaUm()).toBe("/");
  });
});
