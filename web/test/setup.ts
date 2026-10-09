// matchers globais para os testes do pacote `web`: jest-dom
// (getByRole, toBeInTheDocument etc.) e vitest-axe (toHaveNoViolations).
import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "vitest-axe/dist/matchers.js";

expect.extend(matchers);

// `test.globals` não está habilitado em vite.config.ts, então o
// auto-cleanup do Testing Library (que depende de um `afterEach` global)
// não é registrado sozinho — sem isso, cada `render()` dentro do mesmo
// arquivo de teste se acumula no `document.body`, duplicando landmarks
// (<header>/<main>) e quebrando o vitest-axe em testes que rendem mais de
// uma vez por arquivo (ex.: web/test/app.test.tsx).
afterEach(() => {
  cleanup();
});
