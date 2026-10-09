// Tela Divergências: casos de borda da paginação — foco após erro ao trocar de
// página, cancelamento de chamada superada, página além da última e `pagina`
// inválida na URL.
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ProvedorResumo } from "../src/dados/contexto-resumo.tsx";
import { Divergencias } from "../src/paginas/Divergencias.tsx";
import {
  chamadasDeDivergencias,
  divergenciaValida,
  instalarDivergenciasFixas,
  instalarFetchMock,
  paginaDaUrl,
  renderizarDivergencias as renderizar,
  respostaDivergenciasValida,
  respostaFake,
  respostaOk,
} from "./apoio/api-simulada.tsx";
import { formaCompleta } from "./apoio/paginacao.ts";

/**
 * Botões ocultos que disparam `navigate(destino)` via `useNavigate()` do
 * router "clássico" (`MemoryRouter`), usados só para forçar duas trocas de
 * URL em sequência rápida (antes da 1ª resposta chegar) sem passar pelo
 * roteador de dados (`createMemoryRouter`/`RouterProvider`). Evitamos o
 * roteador de dados aqui porque `router.navigate()` programático aciona,
 * neste ambiente (jsdom + `Request`/`fetch` nativo do Node via undici), um
 * bug de incompatibilidade conhecido — `new Request(url, { signal })`
 * rejeita o `AbortSignal` do `AbortController` do jsdom
 * ("Expected signal to be an instance of AbortSignal") — totalmente
 * independente do código da aplicação (reproduzível com `new
 * AbortController()` + `new Request()` "puros", fora de qualquer tela).
 */
function BotoesDeNavegacaoParaTeste({ destinos }: { destinos: string[] }) {
  const navigate = useNavigate();
  return (
    <>
      {destinos.map((destino) => (
        <button key={destino} type="button" onClick={() => {
            void navigate(destino);
          }}>
          {`ir para ${destino}`}
        </button>
      ))}
    </>
  );
}

const PAGINA_INEXISTENTE_999 = respostaDivergenciasValida({
  dados: [],
  pagina: 999,
  total: 42,
  totalPaginas: 3,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Divergencias — paginação via URL: casos de borda", () => {
  it("após erro ao trocar de página, a próxima resposta com sucesso (outro filtro) não move o foco ao caption", async () => {
    const mock = instalarFetchMock((url) => {
      if (paginaDaUrl(url) === 2) {
        return respostaFake({ ok: false, status: 500 });
      }
      return respostaOk(
        respostaDivergenciasValida({
          dados: [divergenciaValida("PED-1", "duplicado")],
          pagina: 1,
          total: 100,
          totalPaginas: 2,
        }),
      );
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getByText("Filtro: Todos · página 1 de 2")).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).some((url) => url.includes("pagina=2"))).toBe(
        true,
      );
    });
    // A consulta de erro terminou quando "Próxima" deixa de estar desabilitado.
    await waitFor(() => {
      expect(
        formaCompleta(container).getByRole("button", { name: "Próxima" }),
      ).not.toHaveAttribute("aria-disabled");
    });

    fireEvent.click(screen.getByRole("radio", { name: /Pagamento parcial/ }));

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Pagamento parcial · página 1 de 2"),
      ).toBeInTheDocument();
    });
    expect(document.activeElement).not.toBe(
      screen.getByText("Filtro: Pagamento parcial · página 1 de 2"),
    );
  });

  it("troca rápida de página (2 navegações antes da 1ª resposta): só a resposta mais recente é aplicada", async () => {
    // Dispara as duas navegações via botões ocultos com `useNavigate()` do
    // router clássico (em vez de clicar duas vezes no botão "Próxima" de
    // `Paginacao`): o próprio `Paginacao` já bloqueia um segundo clique com
    // `aria-disabled`/guarda no `onClick` enquanto `carregando` for `true`
    // — então o duplo clique normal pelo usuário NUNCA alcança esta race
    // (comportamento correto, testado em `divergencias-paginacao.test.tsx`).
    // A race genuína (ex.: navegação programática rápida, ou duas abas/eventos
    // de histórico) é no `useConsulta`/efeito de paginação, exercitada aqui
    // via `useNavigate()` (ver `BotoesDeNavegacaoParaTeste`).
    const resolvers = new Map<number, (resposta: Response) => void>();
    const paginaPronta = (pagina: number) =>
      respostaOk(
        respostaDivergenciasValida({
          dados: [divergenciaValida(`PED-${String(pagina)}`, "duplicado")],
          pagina,
          total: 150,
          totalPaginas: 3,
        }),
      );

    const mock = instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return new Promise<Response>((resolve) => {
        resolvers.set(pagina, resolve);
      });
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProvedorResumo>
          <Divergencias />
        </ProvedorResumo>
        <BotoesDeNavegacaoParaTeste destinos={["/?pagina=2", "/?pagina=3"]} />
      </MemoryRouter>,
    );

    // Resolve a página 1 (chamada inicial) imediatamente.
    await waitFor(() => {
      expect(resolvers.has(1)).toBe(true);
    });
    resolvers.get(1)?.(paginaPronta(1));

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 3"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "ir para /?pagina=2" }));
    fireEvent.click(screen.getByRole("button", { name: "ir para /?pagina=3" }));

    await waitFor(() => {
      expect(resolvers.has(2)).toBe(true);
      expect(resolvers.has(3)).toBe(true);
    });

    expect(chamadasDeDivergencias(mock)).toHaveLength(3);

    // Resolve fora de ordem: página 3 primeiro, depois página 2 (tardia).
    resolvers.get(3)?.(paginaPronta(3));

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 3 de 3"),
      ).toBeInTheDocument();
    });

    resolvers.get(2)?.(paginaPronta(2));

    // A resposta tardia da página 2 nunca deve sobrescrever a página 3.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      screen.getByText("Filtro: Todos · página 3 de 3"),
    ).toBeInTheDocument();
  });

  it("página além da última mostra 'Esta página não existe.' com link para a página 1", async () => {
    instalarDivergenciasFixas(PAGINA_INEXISTENTE_999);

    renderizar(["/?pagina=999&tipo=duplicado"]);

    await waitFor(() => {
      expect(screen.getByText("Esta página não existe.")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Ir para a página 1" }),
    ).toHaveAttribute("href", "/?tipo=duplicado");
  });

  it.each(["abc", "0", "-5"])(
    "?pagina=%s é tratada como filtro de endereço inválido, sem chamar a API",
    async (valorInvalido) => {
      const mock = instalarDivergenciasFixas(respostaDivergenciasValida());

      renderizar([`/?pagina=${valorInvalido}`]);

      await waitFor(() => {
        expect(
          screen.getByText("O filtro do endereço não é válido."),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("link", { name: "Ver todas as divergências" }),
      ).toHaveAttribute("href", "/");

      expect(chamadasDeDivergencias(mock)).toHaveLength(0);
    },
  );

  it("'página não existe' não tem violações de acessibilidade (vitest-axe)", async () => {
    instalarDivergenciasFixas(PAGINA_INEXISTENTE_999);

    const { container } = renderizar(["/?pagina=999"]);

    await waitFor(() => {
      expect(screen.getByText("Esta página não existe.")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
