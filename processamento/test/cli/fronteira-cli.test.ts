import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR_CLI = path.resolve(import.meta.dirname, "../../src/cli");
const arquivos = readdirSync(DIR_CLI).filter((nome) => nome.endsWith(".ts"));

describe("CLIs finas", () => {
  it.each(arquivos)("%s não importa outro arquivo de cli/", (nome) => {
    const codigo = readFileSync(path.join(DIR_CLI, nome), "utf-8");
    expect(codigo).not.toMatch(/from\s+"\.\/[^"]+"/);
  });
});
