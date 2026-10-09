import { pathToFileURL } from "node:url";

import { baixarBase, descreverBaseBaixada } from "../aplicacao/baixar-base.js";

async function main(): Promise<void> {
  try {
    console.log(descreverBaseBaixada(await baixarBase()));
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao baixar a base.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
