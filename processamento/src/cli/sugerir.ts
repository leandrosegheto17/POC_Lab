import { pathToFileURL } from "node:url";

import { decidirSugerir, executarSugerir } from "../aplicacao/sugerir.js";
import { CAMINHO_BANCO_PADRAO } from "../config/caminhos.js";

async function main(): Promise<void> {
  try {
    const resultados = await executarSugerir(CAMINHO_BANCO_PADRAO);
    console.log(decidirSugerir(process.env, resultados.length).mensagem);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao sugerir vínculos.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
