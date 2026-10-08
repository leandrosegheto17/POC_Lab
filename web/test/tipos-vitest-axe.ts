// Tipagem dos matchers `toHaveNoViolations` (vitest-axe, que só declara o
// namespace global `Vi` do vitest antigo) e dos do jest-dom, ligados ao
// `Assertion` do vitest atual num único aumento de módulo.
import "vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends TestingLibraryMatchers<unknown, T> {
    /** O resultado do `axe()` não pode ter violações de acessibilidade. */
    toHaveNoViolations: () => void;
  }
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {
    toHaveNoViolations: () => void;
  }
}
