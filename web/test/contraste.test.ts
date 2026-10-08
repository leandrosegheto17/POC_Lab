// TP-0051 — Testes de contraste WCAG para os tokens do Modelo B e de
// existência dos arquivos de fonte referenciados em tokens.css.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { razaoDeContraste } from "../src/estilos/contraste.ts";

const diretorioAtual = dirname(fileURLToPath(import.meta.url));
const caminhoTokens = resolve(
  diretorioAtual,
  "../src/estilos/tokens.css",
);
const diretorioEstilos = resolve(diretorioAtual, "../src/estilos");
const cssTokens = readFileSync(caminhoTokens, "utf-8");

/** Extrai o valor de uma custom property --nome do CSS de tokens.css. */
function obterToken(nome: string): string {
  const regex = new RegExp(`--${nome}:\\s*([^;]+);`);
  const resultado = cssTokens.match(regex);

  if (!resultado) {
    throw new Error(`Token --${nome} não encontrado em tokens.css`);
  }

  return resultado[1].trim();
}

describe("contraste WCAG dos tokens do Modelo B", () => {
  const corFundo = obterToken("cor-fundo");
  const corSuperficie = obterToken("cor-superficie");
  const corLateral = obterToken("cor-lateral");
  const corTexto = obterToken("cor-texto");
  const corDestaque = obterToken("cor-destaque");
  const corBordaControle = obterToken("cor-borda-controle");

  // Texto principal sobre as três superfícies de fundo — mínimo 4,5:1.
  it.each([
    ["cor-fundo", corFundo],
    ["cor-superficie", corSuperficie],
    ["cor-lateral", corLateral],
  ])("cor-texto sobre %s tem contraste >= 4,5:1", (_nome, corDeFundo) => {
    const razao = razaoDeContraste(corTexto, corDeFundo);

    expect(razao).toBeGreaterThanOrEqual(4.5);
  });

  // cor-destaque usada como elemento de UI/contorno de foco — mínimo 3:1.
  it.each([
    ["cor-fundo", corFundo],
    ["cor-superficie", corSuperficie],
  ])("cor-destaque sobre %s tem contraste >= 3:1", (_nome, corDeFundo) => {
    const razao = razaoDeContraste(corDestaque, corDeFundo);

    expect(razao).toBeGreaterThanOrEqual(3);
  });

  // cor-borda-controle (borda de inputs/controles) — mínimo 3:1.
  it.each([
    ["cor-fundo", corFundo],
    ["cor-superficie", corSuperficie],
  ])(
    "cor-borda-controle sobre %s tem contraste >= 3:1",
    (_nome, corDeFundo) => {
      const razao = razaoDeContraste(corBordaControle, corDeFundo);

      expect(razao).toBeGreaterThanOrEqual(3);
    },
  );

  // As 6 variantes de etiqueta de estado — texto sobre fundo, mínimo 4,5:1.
  // --cor-desabilitado é exceção documentada em tokens.css e NÃO entra neste
  // loop: é intencionalmente abaixo de 4,5:1 (estado desabilitado não exige
  // o contraste mínimo de texto normal pelo WCAG).
  const variantesDeEtiqueta = [
    "sem-pagamento",
    "parcial",
    "quitado",
    "duplicado",
    "erro",
    "pendente",
  ];

  it.each(variantesDeEtiqueta)(
    "etiqueta '%s': texto sobre fundo tem contraste >= 4,5:1",
    (variante) => {
      const texto = obterToken(`etq-${variante}-texto`);
      const fundo = obterToken(`etq-${variante}-fundo`);

      const razao = razaoDeContraste(texto, fundo);

      expect(razao).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("são exatamente 6 variantes de etiqueta definidas", () => {
    expect(variantesDeEtiqueta).toHaveLength(6);
  });
});

describe("@font-face aponta para arquivos locais existentes", () => {
  it("todo caminho de font-face em tokens.css resolve para um arquivo real", () => {
    const regexUrl = /url\((?:["'])(\.\/fontes\/[^"')]+)(?:["'])\)/g;
    const caminhos = [...cssTokens.matchAll(regexUrl)].map((m) => m[1]);

    expect(caminhos.length).toBeGreaterThan(0);

    for (const caminhoRelativo of caminhos) {
      const caminhoAbsoluto = resolve(diretorioEstilos, caminhoRelativo);

      expect(existsSync(caminhoAbsoluto)).toBe(true);
    }
  });

  it("não referencia nenhuma fonte via CDN externo (http/https)", () => {
    expect(cssTokens).not.toMatch(/url\(["']?https?:\/\//);
  });
});
