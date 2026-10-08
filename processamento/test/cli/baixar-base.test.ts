import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErroHashDivergente,
  garantirBaseLocal,
  sha256DeBuffer,
} from "../../src/cli/baixar-base.ts";

const NOME_ARQUIVO = "northwind.db";
const CONTEUDO_VALIDO = Buffer.from("conteudo fixture valido da base de teste");
const HASH_VALIDO = sha256DeBuffer(CONTEUDO_VALIDO);
const CONTEUDO_ADULTERADO = Buffer.from("conteudo adulterado, nao corresponde ao hash");

let dirDestino: string;

beforeEach(async () => {
  dirDestino = await mkdtemp(path.join(tmpdir(), "poc-lab-baixar-base-"));
});

afterEach(async () => {
  await rm(dirDestino, { recursive: true, force: true });
});

describe("garantirBaseLocal", () => {
  it("não baixa de novo quando o arquivo já existe com o hash certo", async () => {
    await writeFile(path.join(dirDestino, NOME_ARQUIVO), CONTEUDO_VALIDO);
    const fetchFn = vi.fn();

    const resultado = await garantirBaseLocal({
      url: "https://exemplo.invalido/base.db",
      hashEsperado: HASH_VALIDO,
      dirDestino,
      nomeArquivo: NOME_ARQUIVO,
      fetchFn,
    });

    expect(resultado.jaExistia).toBe(true);
    expect(resultado.hash).toBe(HASH_VALIDO);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falha com mensagem clara quando o arquivo existente tem hash errado", async () => {
    await writeFile(path.join(dirDestino, NOME_ARQUIVO), CONTEUDO_ADULTERADO);
    const fetchFn = vi.fn();

    await expect(
      garantirBaseLocal({
        url: "https://exemplo.invalido/base.db",
        hashEsperado: HASH_VALIDO,
        dirDestino,
        nomeArquivo: NOME_ARQUIVO,
        fetchFn,
      }),
    ).rejects.toThrow(ErroHashDivergente);

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("baixa (mock de fetch) e grava no destino quando o arquivo não existe", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(new Response(CONTEUDO_VALIDO, { status: 200 })),
    ) as unknown as typeof fetch;

    const resultado = await garantirBaseLocal({
      url: "https://exemplo.invalido/base.db",
      hashEsperado: HASH_VALIDO,
      dirDestino,
      nomeArquivo: NOME_ARQUIVO,
      fetchFn,
    });

    expect(resultado.jaExistia).toBe(false);
    expect(resultado.hash).toBe(HASH_VALIDO);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const conteudoGravado = await readFile(path.join(dirDestino, NOME_ARQUIVO));
    expect(conteudoGravado.equals(CONTEUDO_VALIDO)).toBe(true);
  });

  it("falha e não deixa o arquivo final no destino quando o download tem hash divergente", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(new Response(CONTEUDO_ADULTERADO, { status: 200 })),
    ) as unknown as typeof fetch;

    await expect(
      garantirBaseLocal({
        url: "https://exemplo.invalido/base.db",
        hashEsperado: HASH_VALIDO,
        dirDestino,
        nomeArquivo: NOME_ARQUIVO,
        fetchFn,
      }),
    ).rejects.toThrow(ErroHashDivergente);

    await expect(readFile(path.join(dirDestino, NOME_ARQUIVO))).rejects.toThrow();
  });

  it("falha com mensagem clara quando a resposta HTTP não é ok", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))) as unknown as typeof fetch;

    await expect(
      garantirBaseLocal({
        url: "https://exemplo.invalido/base.db",
        hashEsperado: HASH_VALIDO,
        dirDestino,
        nomeArquivo: NOME_ARQUIVO,
        fetchFn,
      }),
    ).rejects.toThrow(/HTTP 404/);

    await expect(readFile(path.join(dirDestino, NOME_ARQUIVO))).rejects.toThrow();
  });
});
