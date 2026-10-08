import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarProvedorOpenAI } from "../../src/ia/provedor-openai.js";

/** Monta uma `Response`-like mínima, suficiente para o que o provedor lê (`ok`, `json`). */
function criarRespostaFalsa(corpo: unknown, ok = true): Response {
  return {
    ok,
    json: async () => corpo,
  } as unknown as Response;
}

function respostaOpenAI(conteudo: string): unknown {
  return { choices: [{ message: { content: conteudo } }] };
}

describe("criarProvedorOpenAI", () => {
  let anteriorApiKey: string | undefined;

  beforeEach(() => {
    anteriorApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "chave-de-teste-fake";
  });

  afterEach(() => {
    if (anteriorApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = anteriorApiKey;
    }
  });

  it("devolve a identidade quando a resposta é um candidato válido da lista", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa(respostaOpenAI("PED-001")));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001", "PED-002"], "gpt-teste");

    expect(resultado).toBe("PED-001");
  });

  it("devolve null quando a resposta não está entre os candidatos (alucinação)", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa(respostaOpenAI("PED-999999")));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001", "PED-002"], "gpt-teste");

    expect(resultado).toBeNull();
  });

  it('devolve null quando o modelo responde "NENHUM"', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa(respostaOpenAI("NENHUM")));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001", "PED-002"], "gpt-teste");

    expect(resultado).toBeNull();
  });

  it("devolve null quando a resposta não tem choices (JSON malformado para o esquema)", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa({}));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    expect(resultado).toBeNull();
  });

  it("devolve null quando choices é um array vazio", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa({ choices: [] }));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    expect(resultado).toBeNull();
  });

  it("devolve null sem lançar quando o fetch rejeita (erro de rede)", async () => {
    const fetchFalso = vi.fn().mockRejectedValue(new Error("falha de rede simulada"));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    expect(resultado).toBeNull();
  });

  it("devolve null quando o status HTTP não é 200 (ok: false)", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa(respostaOpenAI("PED-001"), false));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    expect(resultado).toBeNull();
  });

  it("envia o texto da referência e os candidatos como dado no corpo (não como instrução de sistema)", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa(respostaOpenAI("PED-001")));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    await provedor.sugerir("texto da referência original", ["PED-001", "PED-002"], "gpt-teste");

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [, opcoes] = fetchFalso.mock.calls[0]!;
    const corpoEnviado = JSON.parse(opcoes.body as string);

    expect(corpoEnviado.model).toBe("gpt-teste");

    const mensagemSistema = corpoEnviado.messages.find((mensagem: { role: string }) => mensagem.role === "system");
    const mensagemUsuario = corpoEnviado.messages.find((mensagem: { role: string }) => mensagem.role === "user");

    // A mensagem de sistema é a instrução fixa — não contém o texto da referência.
    expect(mensagemSistema.content).not.toContain("texto da referência original");

    // O texto e os candidatos vão dentro do dado enviado na mensagem do usuário.
    const dadoUsuario = JSON.parse(mensagemUsuario.content as string);
    expect(dadoUsuario.texto).toBe("texto da referência original");
    expect(dadoUsuario.candidatos).toEqual(["PED-001", "PED-002"]);
  });

  it("usa a variável de ambiente de teste no header Authorization, nunca uma chave real", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(criarRespostaFalsa(respostaOpenAI("PED-001")));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    const [, opcoes] = fetchFalso.mock.calls[0]!;
    expect(opcoes.headers.Authorization).toBe("Bearer chave-de-teste-fake");
  });

  it("devolve null dentro do limite configurado quando o fetch nunca resolve", async () => {
    const fetchFalso = vi.fn().mockReturnValue(new Promise(() => {}));
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch, 50);

    const inicio = Date.now();
    const resultado = await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    expect(resultado).toBeNull();
    expect(Date.now() - inicio).toBeLessThan(1000);
    const [, opcoes] = fetchFalso.mock.calls[0]!;
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
    expect(opcoes.signal.aborted).toBe(true);
  });

  it("sem OPENAI_API_KEY no ambiente, devolve null imediatamente sem chamar fetchFn", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchFalso = vi.fn();
    const provedor = criarProvedorOpenAI(fetchFalso as unknown as typeof fetch);

    const resultado = await provedor.sugerir("REF-123", ["PED-001"], "gpt-teste");

    expect(resultado).toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
