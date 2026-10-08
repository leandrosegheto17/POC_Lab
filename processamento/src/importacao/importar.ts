/**
 * Caso de uso `importar` (TP-0027).
 *
 * Orquestra os 3 adaptadores de fonte (`processarVendas`, `processarPagamentos`,
 * `processarRastreio`) e grava o resultado no event store via `Repositorio`
 * (TP-0018). Este módulo é explícito para as 3 fontes: não existe (e não deve
 * existir) uma interface/registro genérico de "fonte" — cada chamada aos
 * adaptadores é direta e nomeada.
 *
 * ## Identidade de pedido (`PED-nnnnnn`) e convergência entre fontes
 *
 * Os adaptadores de fonte devolvem vínculos cujo campo `idPedido` tem
 * significado diferente por fonte:
 * - `vendas`: `idPedido` é o próprio código bruto do pedido na base de
 *   vendas (ex. `"10248"`) — a identidade **canônica** entre fontes.
 * - `rastreio`: `idPedido` é o `pedido_venda` da linha do CSV, ou seja, já é
 *   o código bruto de vendas (a chave cruzada), não um código próprio de
 *   rastreio.
 * - `pagamentos`: `idPedido` (quando a referência casa) é o código bruto de
 *   vendas resolvido por `casarReferencia` (RN-09) — de novo, a chave
 *   cruzada, não um código próprio de pagamentos.
 *
 * Ou seja: as 3 fontes, quando têm um vínculo, sempre o expressam em termos
 * do código bruto de vendas. Esse código bruto de vendas é a chave usada
 * para achar ou criar o `id_pedido` interno (`PED-nnnnnn`):
 *
 * - O par `(fonte: "vendas", codigo_externo: <código bruto de vendas>)` na
 *   tabela `vinculo_fonte` É o índice de identidade: se já existe, o
 *   `id_pedido` associado é reaproveitado; se não existe, um novo
 *   `PED-nnnnnn` é criado (próximo número sequencial) e esse vínculo
 *   `vendas` é inserido.
 * - Isso vale **independente de qual fonte dispara a resolução**: se um
 *   evento de rastreio ou pagamento chega citando um código de vendas que
 *   ainda não tem `id_pedido`, este módulo cria o `id_pedido` e o vínculo
 *   `vendas` correspondente **antecipadamente** (mesmo a venda em si ainda
 *   não tendo sido importada). Quando a venda for importada depois (nesta
 *   chamada ou em uma chamada futura sobre o mesmo repositório), ela
 *   encontra o vínculo `vendas` já existente e reaproveita o mesmo
 *   `id_pedido` — convergindo as 3 fontes no mesmo pedido.
 * - Cada fonte também grava seu próprio vínculo em `vinculo_fonte` com o seu
 *   próprio `codigo_externo` (o `codigo_rastreio` para rastreio, o
 *   `codigo_transacao` para pagamentos, o próprio código de vendas para
 *   vendas) apontando para o `id_pedido` resolvido.
 *
 * ## Ordem de atribuição de `PED-nnnnnn`
 *
 * Dentro de uma mesma chamada a `importar`, a ordem em que novos
 * `PED-nnnnnn` são cunhados é: vendas primeiro (por código bruto crescente),
 * depois rastreio, depois pagamentos (ambos por ordem de linha/lista). Um
 * número de pedido já cunhado (nesta chamada ou em chamada anterior sobre o
 * mesmo repositório) nunca é reatribuído — o contador sempre continua do
 * maior `PED-nnnnnn` já existente na tabela `pedido`.
 *
 * ## Transação
 *
 * Toda a gravação de uma chamada a `importar` roda dentro de uma única
 * transação SQLite (`BEGIN`/`COMMIT`, com `ROLLBACK` em caso de erro) — ver
 * `Repositorio.db.exec`. Nenhum `UPDATE`/`DELETE` é emitido em nenhum ponto
 * deste módulo: só `INSERT` (via as funções de `inserirX` do repositório, que
 * já usam `ON CONFLICT DO NOTHING`) e `SELECT` (para resolver identidade).
 */
import type { DatabaseSync } from "node:sqlite";

import { processarVendas } from "../fontes/vendas.js";
import { processarPagamentos, type ResultadoProcessamentoPagamentos } from "../fontes/pagamentos.js";
import { processarRastreio, type ResultadoProcessamentoRastreio } from "../fontes/rastreio.js";
import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import type { Evento } from "../dominio/evento.js";
import type { Repositorio } from "../armazenamento/repositorio.js";

/** Contagens de uma fonte no relatório final de uma chamada a `importar`. */
export type RelatorioFonte = {
  /** Total de linhas/pedidos processados desta fonte nesta chamada. */
  lidas: number;
  /** Vínculos desta fonte inseridos como linha nova (`{ nova: true }`). */
  novas: number;
  /** Vínculos desta fonte que já existiam (`{ nova: false }`). */
  jaExistentes: number;
  /**
   * Linhas que geraram achado e não produziram vínculo/evento válido
   * (ex.: linha malformada, código repetido na mesma importação).
   */
  rejeitadas: number;
};

export type RelatorioImportacao = {
  vendas: RelatorioFonte;
  pagamentos: RelatorioFonte;
  rastreio: RelatorioFonte;
};

export type DadosParaImportar = {
  /** Pedidos de vendas já lidos por `lerBaseDeVendas` (pode ser lista vazia). */
  vendas: PedidoVendas[];
  /** Conteúdo de `pagamentos.csv`; string vazia = nenhum dado de pagamentos nesta chamada. */
  pagamentosCsv: string;
  /** Conteúdo de `rastreio.csv`; string vazia = nenhum dado de rastreio nesta chamada (gerador ainda não existe). */
  rastreioCsv: string;
  /**
   * Códigos de pedido de vendas conhecidos, já normalizados (RN-09: sem
   * prefixo `PV-`, sem zeros à esquerda), usados por `processarPagamentos`
   * para casar a referência de cada pagamento.
   */
  codigosConhecidos: Set<string>;
};

/** Tipos de achado que representam rejeição total da linha (nenhum evento válido produzido). */
const TIPOS_ACHADO_DE_REJEICAO = new Set(["linha_invalida", "registro_repetido"]);

function contarRejeitadas(achados: { tipo: string }[]): number {
  return achados.filter((achado) => TIPOS_ACHADO_DE_REJEICAO.has(achado.tipo)).length;
}

/** Contador mutável do próximo número de `PED-nnnnnn` a cunhar nesta chamada. */
type ContadorPedido = { atual: number };

/**
 * Descobre o maior número de `PED-nnnnnn` já existente na tabela `pedido`
 * (0 se a tabela estiver vazia), para que o contador desta chamada sempre
 * continue de onde a última chamada (ou chamada anterior nesta mesma
 * transação) parou — nunca reatribuindo um número já cunhado.
 *
 * `id_pedido` é `TEXT` com largura fixa (`PED-` + 6 dígitos), então a ordem
 * lexicográfica (`ORDER BY ... DESC`) coincide com a ordem numérica.
 */
function obterMaiorNumeroPedido(db: DatabaseSync): number {
  const linha = db
    .prepare(`SELECT id_pedido FROM pedido ORDER BY id_pedido DESC LIMIT 1`)
    .get() as { id_pedido: string } | undefined;
  if (!linha) {
    return 0;
  }
  const casamento = linha.id_pedido.match(/^PED-(\d+)$/);
  return casamento ? Number(casamento[1]) : 0;
}

function formatarIdPedido(numero: number): string {
  return `PED-${String(numero).padStart(6, "0")}`;
}

/**
 * Resolve o `id_pedido` interno correspondente a um código bruto de vendas
 * (a chave cruzada entre fontes, ver cabeçalho deste módulo).
 *
 * Consulta o vínculo `(fonte: "vendas", codigo_externo: codigoVenda)`: se já
 * existe, reaproveita o `id_pedido` associado (`nova: false`); se não
 * existe, cunha o próximo `PED-nnnnnn` disponível, insere o pedido e o
 * vínculo `vendas` correspondente (`nova: true`) — isso vale tanto quando é
 * a própria fonte vendas chamando quanto quando é rastreio/pagamentos
 * resolvendo uma identidade ainda não vista.
 */
function resolverOuCriarIdPedido(
  repositorio: Repositorio,
  contador: ContadorPedido,
  codigoVenda: string,
): { idPedido: string; nova: boolean } {
  const existente = repositorio.db
    .prepare(`SELECT id_pedido FROM vinculo_fonte WHERE fonte = 'vendas' AND codigo_externo = ?`)
    .get(codigoVenda) as { id_pedido: string } | undefined;

  if (existente) {
    return { idPedido: existente.id_pedido, nova: false };
  }

  contador.atual += 1;
  const idPedido = formatarIdPedido(contador.atual);
  repositorio.inserirPedido(idPedido);
  repositorio.inserirVinculoFonte("vendas", codigoVenda, idPedido);
  return { idPedido, nova: true };
}

/**
 * Serializa o payload de um evento para a coluna `dados` do event store:
 * o envelope comum (`fonte`, `codigoEvento`, `momentoFato`, `ordemChegada`)
 * já tem coluna própria — `dados` guarda o restante (`tipo`, `versao_schema`
 * e os campos específicos do payload).
 */
function serializarDados(evento: Evento): string {
  const {
    fonte: _fonte,
    codigoEvento: _codigoEvento,
    momentoFato: _momentoFato,
    ordemChegada: _ordemChegada,
    ...payload
  } = evento;
  return JSON.stringify(payload);
}

function compararCodigoVendasCrescente(a: string, b: string): number {
  const numeroA = Number(a);
  const numeroB = Number(b);
  if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
    return numeroA - numeroB;
  }
  return a.localeCompare(b);
}

/**
 * Importa vendas, pagamentos e rastreio para o `repositorio` (event store
 * SQLite), numa única transação, resolvendo/convergindo identidade de
 * pedido entre as 3 fontes (ver cabeçalho do módulo).
 *
 * Idempotente: chamar `importar` 2x com os mesmos `dados` sobre o mesmo
 * `repositorio` (sem recriar o banco) produz, na 2ª vez, as mesmas
 * contagens finais com tudo em "já existente" e zero "novo" — nenhuma linha
 * duplicada em `pedido`, `vinculo_fonte` ou `evento`.
 */
export function importar(
  repositorio: Repositorio,
  dados: DadosParaImportar,
): RelatorioImportacao {
  const db = repositorio.db;

  db.exec("BEGIN");
  try {
    const contador: ContadorPedido = { atual: obterMaiorNumeroPedido(db) };

    // --- vendas -----------------------------------------------------------
    const resultadoVendas = processarVendas(dados.vendas);
    let vendasNovas = 0;
    let vendasJaExistentes = 0;

    // `vinculos[i]` e `eventos[i]` sempre correspondem ao mesmo índice: o
    // adaptador de vendas empurra os dois juntos para cada pedido, sem
    // nenhum caminho que pule um dos dois (ver `fontes/vendas.ts`). Os pares
    // são combinados aqui e então ordenados por código de vendas crescente,
    // para a atribuição de `PED-nnnnnn` seguir a ordem exigida (não a ordem
    // da lista recebida).
    const paresVendasOrdenados = resultadoVendas.vinculos
      .map((vinculo, indice) => ({ vinculo, evento: resultadoVendas.eventos[indice]! }))
      .sort((a, b) => compararCodigoVendasCrescente(a.vinculo.codigoExterno, b.vinculo.codigoExterno));

    for (const { vinculo, evento } of paresVendasOrdenados) {
      const { idPedido, nova } = resolverOuCriarIdPedido(
        repositorio,
        contador,
        vinculo.codigoExterno,
      );
      if (nova) {
        vendasNovas += 1;
      } else {
        vendasJaExistentes += 1;
      }

      repositorio.inserirEvento({
        fonte: "vendas",
        codigoEvento: evento.codigoEvento,
        idPedido,
        tipo: evento.tipo,
        momentoFato: evento.momentoFato,
        ordemChegada: evento.ordemChegada ?? null,
        versaoSchema: evento.versao_schema,
        dados: serializarDados(evento),
      });
    }
    for (const achado of resultadoVendas.achados) {
      repositorio.inserirAchadoQualidade(achado);
    }

    const relatorioVendas: RelatorioFonte = {
      lidas: dados.vendas.length,
      novas: vendasNovas,
      jaExistentes: vendasJaExistentes,
      rejeitadas: dados.vendas.length - resultadoVendas.eventos.length,
    };

    // --- rastreio -----------------------------------------------------------
    const resultadoRastreio: ResultadoProcessamentoRastreio =
      dados.rastreioCsv.trim() === ""
        ? { vinculos: [], eventos: [], achados: [] }
        : processarRastreio(dados.rastreioCsv);
    let rastreioNovas = 0;
    let rastreioJaExistentes = 0;

    // `vinculos[i]` e `eventos[i]` sempre correspondem ao mesmo índice: o
    // adaptador de rastreio só empurra os dois juntos, ou nenhum dos dois,
    // por linha do CSV (ver `fontes/rastreio.ts`).
    const paresRastreio = resultadoRastreio.vinculos.map((vinculo, indice) => ({
      vinculo,
      evento: resultadoRastreio.eventos[indice]!,
    }));

    for (const { vinculo, evento } of paresRastreio) {
      // `vinculo.idPedido` aqui é o código bruto de vendas (`pedido_venda`
      // da linha do CSV) — a chave cruzada, não um `PED-nnnnnn` ainda.
      const { idPedido } = resolverOuCriarIdPedido(repositorio, contador, vinculo.idPedido);

      const { nova } = repositorio.inserirVinculoFonte(
        "rastreio",
        vinculo.codigoExterno,
        idPedido,
      );
      if (nova) {
        rastreioNovas += 1;
      } else {
        rastreioJaExistentes += 1;
      }

      repositorio.inserirEvento({
        fonte: "rastreio",
        codigoEvento: evento.codigoEvento,
        idPedido,
        tipo: evento.tipo,
        momentoFato: evento.momentoFato,
        ordemChegada: evento.ordemChegada ?? null,
        versaoSchema: evento.versao_schema,
        dados: serializarDados(evento),
      });
    }
    for (const achado of resultadoRastreio.achados) {
      repositorio.inserirAchadoQualidade(achado);
    }

    const relatorioRastreio: RelatorioFonte = {
      lidas: resultadoRastreio.eventos.length + contarRejeitadas(resultadoRastreio.achados),
      novas: rastreioNovas,
      jaExistentes: rastreioJaExistentes,
      rejeitadas: contarRejeitadas(resultadoRastreio.achados),
    };

    // --- pagamentos ---------------------------------------------------------
    const resultadoPagamentos: ResultadoProcessamentoPagamentos =
      dados.pagamentosCsv.trim() === ""
        ? { vinculos: [], eventos: [], achados: [] }
        : processarPagamentos(dados.pagamentosCsv, dados.codigosConhecidos);
    let pagamentosNovas = 0;
    let pagamentosJaExistentes = 0;

    // Diferente de rastreio, nem todo evento de pagamento tem vínculo (RN-09:
    // referência sem identificação única) — por isso o casamento aqui é por
    // `codigo_transacao` (chave única por linha), não por índice.
    const mapaTransacaoParaCodigoVenda = new Map(
      resultadoPagamentos.vinculos.map(
        (vinculo): [string, string] => [vinculo.codigoExterno, vinculo.idPedido],
      ),
    );

    for (const evento of resultadoPagamentos.eventos) {
      const codigoVenda = mapaTransacaoParaCodigoVenda.get(evento.codigoEvento);
      let idPedido: string | null = null;

      if (codigoVenda !== undefined) {
        const resolvido = resolverOuCriarIdPedido(repositorio, contador, codigoVenda);
        idPedido = resolvido.idPedido;

        const { nova } = repositorio.inserirVinculoFonte(
          "pagamentos",
          evento.codigoEvento,
          idPedido,
        );
        if (nova) {
          pagamentosNovas += 1;
        } else {
          pagamentosJaExistentes += 1;
        }
      }

      repositorio.inserirEvento({
        fonte: "pagamentos",
        codigoEvento: evento.codigoEvento,
        idPedido,
        tipo: evento.tipo,
        momentoFato: evento.momentoFato,
        ordemChegada: null,
        versaoSchema: evento.versao_schema,
        dados: serializarDados(evento),
      });
    }
    for (const achado of resultadoPagamentos.achados) {
      repositorio.inserirAchadoQualidade(achado);
    }

    const relatorioPagamentos: RelatorioFonte = {
      lidas: resultadoPagamentos.eventos.length + contarRejeitadas(resultadoPagamentos.achados),
      novas: pagamentosNovas,
      jaExistentes: pagamentosJaExistentes,
      rejeitadas: contarRejeitadas(resultadoPagamentos.achados),
    };

    db.exec("COMMIT");

    return {
      vendas: relatorioVendas,
      pagamentos: relatorioPagamentos,
      rastreio: relatorioRastreio,
    };
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}
