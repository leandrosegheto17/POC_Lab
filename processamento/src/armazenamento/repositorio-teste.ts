import type { DatabaseSync } from "node:sqlite";

import { abrirBanco, criarRepositorioSobre, type Repositorio } from "./repositorio.js";

/**
 * Só para testes: abre o banco como `criarRepositorio` e devolve também a
 * conexão, para a asserção ler o estado direto. O código de produção nunca
 * importa este módulo.
 */
export function abrirRepositorioParaTeste(caminhoArquivo: string): {
  repositorio: Repositorio;
  db: DatabaseSync;
} {
  const db = abrirBanco(caminhoArquivo);
  return { repositorio: criarRepositorioSobre(db), db };
}
