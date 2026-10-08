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

  // cor-borda-controle (#39434f, ~1,9:1) e cor-borda-chip (#263040,
  // ~1,4:1) SAEM do laço ">= 3:1": desvio aceito pelo usuário em
  // 2026-10-08 (mockup à risca). O teste abaixo só registra os valores
  // aprovados, para que uma troca acidental seja percebida.
  it("cor-borda-controle e cor-borda-chip têm os valores do mockup (desvio aceito)", () => {
    expect(obterToken("cor-borda-controle")).toBe("#39434f");
    expect(obterToken("cor-borda-chip")).toBe("#263040");
  });

  // Textos de destaque do mockup sobre fundo/superfície/lateral — 4,5:1.
  it.each([
    ["cor-texto-menu", "cor-lateral"],
    ["cor-destaque", "cor-menu-ativo"],
    ["cor-destaque", "cor-selecionado-fundo"],
    ["cor-valor-ruim", "cor-superficie"],
    ["cor-erro-texto", "cor-fundo"],
    ["cor-erro-texto", "cor-superficie"],
    ["cor-link-hover", "cor-fundo"],
    ["cor-sobre-destaque", "cor-destaque"],
  ])("%s sobre %s tem contraste >= 4,5:1", (texto, fundo) => {
    const razao = razaoDeContraste(obterToken(texto), obterToken(fundo));

    expect(razao).toBeGreaterThanOrEqual(4.5);
  });

  // As 6 paletas de etiqueta (uma por tipo de divergência, mockup Modelo B,
  // 2026-10-08) — texto sobre fundo, mínimo 4,5:1. --cor-desabilitado é
  // exceção documentada em tokens.css e NÃO entra neste laço.
  const variantesDeEtiqueta = [
    "duplicado",
    "parcial",
    "pago-nao-enviado",
    "enviado-nao-pago",
    "entrega-atrasada",
    "sem-divergencia",
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

  // Selos de fonte de dados (EtiquetaFonte variante "selo") — 4,5:1.
  it.each(["vendas", "pagamentos", "rastreio"])(
    "selo de fonte '%s': texto sobre fundo tem contraste >= 4,5:1",
    (fonte) => {
      const razao = razaoDeContraste(
        obterToken(`fonte-${fonte}-texto`),
        obterToken(`fonte-${fonte}-fundo`),
      );

      expect(razao).toBeGreaterThanOrEqual(4.5);
    },
  );
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

  it("tem os pesos do mockup: Manrope 500/800 e JetBrains Mono 500", () => {
    for (const arquivo of [
      "manrope-500.woff2",
      "manrope-800.woff2",
      "jetbrains-mono-500.woff2",
    ]) {
      expect(cssTokens).toContain(`./fontes/${arquivo}`);
    }
  });

  it("não referencia nenhuma fonte via CDN externo (http/https)", () => {
    expect(cssTokens).not.toMatch(/url\(["']?https?:\/\//);
  });
});
