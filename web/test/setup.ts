// TP-0003 — matchers globais para os testes do pacote `web`: jest-dom
// (getByRole, toBeInTheDocument etc.) e vitest-axe (toHaveNoViolations).
import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";

expect.extend(matchers);
