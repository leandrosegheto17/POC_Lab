import { pathToFileURL } from "node:url";

import { executarSugerir } from "../aplicacao/sugerir.js";
import { CAMINHO_BANCO_PADRAO } from "../config/caminhos.js";

async function main(): Promise<void> {
  try {
    await executarSugerir(CAMINHO_BANCO_PADRAO);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao sugerir vínculos.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
