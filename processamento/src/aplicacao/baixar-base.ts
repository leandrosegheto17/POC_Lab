import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { DIR_DESTINO_PADRAO, NOME_ARQUIVO_PADRAO } from "../config/caminhos.js";

/**
 * URL fixada em commit (SDD §2 fluxo de preparação, passo 1).
 * Repositório: jpwhite3/northwind-SQLite3, commit 807e2172c45402a1873cfd68b51e36959470fd2e.
 * Licença da base: MIT — o aviso de atribuição fica no README.
 */
export const URL_BASE =
  "https://raw.githubusercontent.com/jpwhite3/northwind-SQLite3/807e2172c45402a1873cfd68b51e36959470fd2e/dist/northwind.db";

/** SHA-256 esperado do arquivo northwind.db apontado por URL_BASE (confirmado por download e verificação de hash). */
export const SHA256_ESPERADO =
  "2f4f5c68dfcd33ba27373eae48c7a4869800c68095ee0f9f0da494f83382a877";

export class ErroHashDivergente extends Error {}

export function sha256DeBuffer(conteudo: Buffer | Uint8Array): string {
  return createHash("sha256").update(conteudo).digest("hex");
}

async function arquivoExiste(caminho: string): Promise<boolean> {
  try {
    await readFile(caminho);
    return true;
  } catch {
    return false;
  }
}

async function sha256DeArquivo(caminho: string): Promise<string> {
  const conteudo = await readFile(caminho);
  return sha256DeBuffer(conteudo);
}

export interface OpcoesGarantirBaseLocal {
  /** URL de origem do arquivo. */
  url: string;
  /** SHA-256 esperado (hex, minúsculas). */
  hashEsperado: string;
  /** Diretório de destino final (será criado se não existir). */
  dirDestino: string;
  /** Nome do arquivo final dentro de dirDestino. */
  nomeArquivo: string;
  /** Função de fetch a usar (permite injeção/mock em teste; padrão: fetch global do Node). */
  fetchFn?: typeof fetch;
}

export interface ResultadoGarantirBaseLocal {
  caminho: string;
  hash: string;
  jaExistia: boolean;
}

/**
 * Garante que o arquivo da base de dados exista em dirDestino/nomeArquivo com o
 * hash esperado, baixando-o quando necessário.
 *
 * - Se o arquivo já existir e o hash bater, não baixa de novo (idempotência).
 * - Se já existir e o hash não bater, falha (não sobrescreve silenciosamente).
 * - Se não existir, baixa para um arquivo temporário, confere o hash e só então
 *   move para o nome final; se o hash divergir, o temporário é descartado e o
 *   arquivo final nunca é criado/sobrescrito (nunca fica artefato inválido no destino).
 */
export async function garantirBaseLocal(
  opcoes: OpcoesGarantirBaseLocal,
): Promise<ResultadoGarantirBaseLocal> {
  const { url, hashEsperado, dirDestino, nomeArquivo } = opcoes;
  const fetchFn = opcoes.fetchFn ?? fetch;
  const caminhoFinal = path.join(dirDestino, nomeArquivo);

  if (await arquivoExiste(caminhoFinal)) {
    const hashAtual = await sha256DeArquivo(caminhoFinal);
    if (hashAtual === hashEsperado) {
      return { caminho: caminhoFinal, hash: hashAtual, jaExistia: true };
    }
    throw new ErroHashDivergente(
      `Arquivo já existe em "${caminhoFinal}", mas o hash não corresponde ao esperado ` +
        `(hash divergente, arquivo corrompido ou alterado). Remova o arquivo manualmente ` +
        `antes de tentar novamente.`,
    );
  }

  await mkdir(dirDestino, { recursive: true });

  const caminhoTemporario = path.join(
    dirDestino,
    `${nomeArquivo}.download-${String(process.pid)}-${String(Date.now())}.tmp`,
  );

  let resposta: Response;
  try {
    resposta = await fetchFn(url);
  } catch {
    throw new Error(
      `Falha ao conectar para baixar a base em "${url}". Verifique a conexão de rede e tente novamente.`,
    );
  }

  if (!resposta.ok) {
    throw new Error(
      `Falha ao baixar a base em "${url}" (HTTP ${String(resposta.status)}). Verifique se a URL ainda está válida.`,
    );
  }

  const conteudo = Buffer.from(await resposta.arrayBuffer());

  try {
    await writeFile(caminhoTemporario, conteudo);

    const hashBaixado = sha256DeBuffer(conteudo);
    if (hashBaixado !== hashEsperado) {
      throw new ErroHashDivergente(
        `Download concluído, mas o hash do conteúdo baixado não corresponde ao esperado ` +
          `(hash divergente). O arquivo não foi salvo em "${caminhoFinal}". Verifique se a URL ` +
          `aponta para o conteúdo correto.`,
      );
    }

    await rename(caminhoTemporario, caminhoFinal);
    return { caminho: caminhoFinal, hash: hashBaixado, jaExistia: false };
  } finally {
    await rm(caminhoTemporario, { force: true });
  }
}

/**
 * Passo "baixar-base" do pipeline: garante a base de origem com a URL, o hash
 * e o destino padrão; qualquer um deles pode ser substituído (testes).
 */
export async function baixarBase(
  opcoes: Partial<OpcoesGarantirBaseLocal> = {},
): Promise<ResultadoGarantirBaseLocal> {
  return garantirBaseLocal({
    url: opcoes.url ?? URL_BASE,
    hashEsperado: opcoes.hashEsperado ?? SHA256_ESPERADO,
    dirDestino: opcoes.dirDestino ?? DIR_DESTINO_PADRAO,
    nomeArquivo: opcoes.nomeArquivo ?? NOME_ARQUIVO_PADRAO,
    fetchFn: opcoes.fetchFn,
  });
}

/** Linha de log do resultado do passo, usada pela CLI e por `preparar`. */
export function descreverBaseBaixada(resultado: ResultadoGarantirBaseLocal): string {
  return resultado.jaExistia
    ? `Base já presente em "${resultado.caminho}" com hash correto.`
    : `Base baixada e verificada com sucesso em "${resultado.caminho}".`;
}
