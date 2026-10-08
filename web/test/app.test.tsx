import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { App } from "../src/App.tsx";

describe("App (página provisória)", () => {
  it("exibe o título POC_Lab", () => {
    const { getByRole } = render(<App />);

    expect(getByRole("heading", { name: "POC_Lab" })).toBeInTheDocument();
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(<App />);

    const resultados = await axe(container);

    expect(resultados).toHaveNoViolations();
  });
});
