import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { App } from "../src/App.tsx";

// TP-0055 — App agora monta o roteamento real (a TP-0003 era só o
// placeholder "POC_Lab"). Cobertura detalhada de rotas/navegação/foco está
// em casca.test.tsx; aqui só confirmamos que o App monta de fato a árvore
// completa (com <BrowserRouter/> real) e que a rota padrão ("/", via
// window.location default do jsdom) renderiza sem violações.
describe("App", () => {
  it("renderiza a rota padrão (Divergências)", () => {
    const { getByRole } = render(<App />);

    expect(
      getByRole("heading", { name: "Divergências" }),
    ).toBeInTheDocument();
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(<App />);

    const resultados = await axe(container);

    expect(resultados).toHaveNoViolations();
  });
});
