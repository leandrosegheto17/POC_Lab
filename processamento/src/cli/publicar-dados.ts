import path from "node:path";
import { pathToFileURL } from "node:url";

import { publicarDados } from "../aplicacao/publicar-dados.js";
import { obterSemente } from "../config/argumentos.js";
import {
  CAMINHO_BANCO_PADRAO,
  CAMINHO_WEB_PADRAO,
  DIR_PUBLICACAO_PADRAO,
  NOME_ARQUIVO_LEITURA_SQL,
} from "../config/caminhos.js";

function main(): void {
  try {
    const semente = obterSemente(process.argv.slice(2));

    publicarDados({
      semente,
      caminhoBanco: CAMINHO_BANCO_PADRAO,
      diretorioPublicacao: DIR_PUBLICACAO_PADRAO,
      caminhoWeb: CAMINHO_WEB_PADRAO,
    });

    console.log(
      `Dados publicados com semente ${String(semente)}: ` +
        `"${path.join(DIR_PUBLICACAO_PADRAO, NOME_ARQUIVO_LEITURA_SQL)}" gerado e carregado no D1 local (poc-lab).`,
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao publicar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
