import type { DatabaseSync } from "node:sqlite";

import type { Evento } from "../dominio/evento.js";
import type { AchadoQualidade, Fonte, TipoAchado } from "../dominio/modelo.js";

/**
 * Consultas de leitura do event store. Cada comando é preparado uma vez, na
 * criação, e só há `SELECT` com parâmetros `?` (nenhum texto montado por
 * concatenação).
 */

/** Evento lido da tabela `evento`: o `Evento` de domínio reconstruído mais as colunas que ele não carrega. */
export type EventoArmazenado = {
  idPedido: string | null;
  versaoSchema: number;
  /** Payload serializado tal como foi gravado. */
  dados: string;
  evento: Evento;
};

export type VinculoFonte = { fonte: Fonte; codigoExterno: string; idPedido: string };

export type EntradaCacheIa = {
  chave: string;
  resposta: string;
  criadoEm: string;
  modelo: string | null;
};

/** Pagamento `sem_identificacao` cujo evento ainda existe no event store. */
export type PagamentoSemIdentificacaoArmazenado = {
  codigoTransacao: string;
  textoReferencia: string;
  valor: number;
  momentoFato: string;
};

export type PagamentosSemIdentificacao = {
  completos: PagamentoSemIdentificacaoArmazenado[];
  /** Códigos de transação com achado mas sem evento correspondente. */
  semEvento: string[];
};

type LinhaEvento = {
  fonte: Fonte;
  codigo_evento: string;
  id_pedido: string | null;
  tipo: string;
  momento_fato: string;
  ordem_chegada: number | null;
  versao_schema: number;
  dados: string;
};

/** O envelope e o `tipo` vêm das colunas; `versao_schema` e os campos do payload vêm do JSON em `dados` (que, quando traz `tipo`, prevalece). */
function linhaParaEvento(linha: LinhaEvento): Evento {
  const payload = JSON.parse(linha.dados) as Record<string, unknown>;
  const envelope: Record<string, unknown> = {
    fonte: linha.fonte,
    codigoEvento: linha.codigo_evento,
    momentoFato: linha.momento_fato,
    tipo: linha.tipo,
  };
  if (linha.ordem_chegada !== null) {
    envelope.ordemChegada = linha.ordem_chegada;
  }
  return { ...envelope, ...payload } as Evento;
}

export function criarConsultas(db: DatabaseSync) {
  const selecionarEventos = db.prepare(
    `SELECT fonte, codigo_evento, id_pedido, tipo, momento_fato, ordem_chegada, versao_schema, dados FROM evento`,
  );
  const selecionarAchadosPorTipo = db.prepare(
    `SELECT tipo, fonte, referencia, regra, detalhe FROM achado_qualidade WHERE tipo = ?`,
  );
  const selecionarVinculos = db.prepare(
    `SELECT fonte, codigo_externo, id_pedido FROM vinculo_fonte`,
  );
  const selecionarIdPorVinculo = db.prepare(
    `SELECT id_pedido FROM vinculo_fonte WHERE fonte = ? AND codigo_externo = ?`,
  );
  const selecionarPedidos = db.prepare(`SELECT id_pedido FROM pedido ORDER BY id_pedido`);
  const selecionarMaiorPedido = db.prepare(
    `SELECT id_pedido FROM pedido ORDER BY id_pedido DESC LIMIT 1`,
  );
  const selecionarMaiorMomento = db.prepare(`SELECT MAX(momento_fato) AS momento FROM evento`);
  const selecionarPagamentosSemIdentificacao = db.prepare(
    `SELECT a.referencia AS referencia, e.dados AS dados, e.momento_fato AS momento_fato
       FROM achado_qualidade a
       LEFT JOIN evento e
         ON e.fonte = 'pagamentos' AND e.codigo_evento = a.referencia AND e.id_pedido IS NULL
      WHERE a.tipo = 'sem_identificacao' AND a.fonte = 'pagamentos'`,
  );
  const selecionarCacheIa = db.prepare(`SELECT chave, resposta, criado_em, modelo FROM cache_ia`);

  function listarEventos(): EventoArmazenado[] {
    const linhas = selecionarEventos.all() as unknown as LinhaEvento[];
    return linhas.map((linha) => ({
      idPedido: linha.id_pedido,
      versaoSchema: linha.versao_schema,
      dados: linha.dados,
      evento: linhaParaEvento(linha),
    }));
  }

  function listarAchadosPorTipo(tipo: TipoAchado): AchadoQualidade[] {
    const linhas = selecionarAchadosPorTipo.all(tipo) as unknown as AchadoQualidade[];
    return linhas.map((linha) => ({
      tipo: linha.tipo,
      fonte: linha.fonte,
      referencia: linha.referencia,
      regra: linha.regra,
      detalhe: linha.detalhe,
    }));
  }

  function listarVinculos(): VinculoFonte[] {
    const linhas = selecionarVinculos.all() as unknown as {
      fonte: Fonte;
      codigo_externo: string;
      id_pedido: string;
    }[];
    return linhas.map((linha) => ({
      fonte: linha.fonte,
      codigoExterno: linha.codigo_externo,
      idPedido: linha.id_pedido,
    }));
  }

  function obterIdPedidoPorVinculo(fonte: Fonte, codigoExterno: string): string | undefined {
    const linha = selecionarIdPorVinculo.get(fonte, codigoExterno) as
      | { id_pedido: string }
      | undefined;
    return linha?.id_pedido;
  }

  function listarIdsPedido(): string[] {
    const linhas = selecionarPedidos.all() as unknown as { id_pedido: string }[];
    return linhas.map((linha) => linha.id_pedido);
  }

  /** Maior número já cunhado em `PED-NNNNNN` (0 com o banco vazio). A largura é fixa, então a ordem lexicográfica é a numérica. */
  function obterMaiorNumeroPedido(): number {
    const linha = selecionarMaiorPedido.get() as { id_pedido: string } | undefined;
    const casamento = linha?.id_pedido.match(/^PED-(\d+)$/);
    return casamento ? Number(casamento[1]) : 0;
  }

  /** Maior `momento_fato` entre os eventos; `undefined` com o banco vazio. */
  function obterMaiorMomentoFato(): string | undefined {
    const linha = selecionarMaiorMomento.get() as { momento: string | null } | undefined;
    return linha?.momento ?? undefined;
  }

  function listarPagamentosSemIdentificacao(): PagamentosSemIdentificacao {
    const linhas = selecionarPagamentosSemIdentificacao.all() as unknown as {
      referencia: string;
      dados: string | null;
      momento_fato: string | null;
    }[];
    const resultado: PagamentosSemIdentificacao = { completos: [], semEvento: [] };
    for (const linha of linhas) {
      if (linha.dados === null || linha.momento_fato === null) {
        resultado.semEvento.push(linha.referencia);
        continue;
      }
      const payload = JSON.parse(linha.dados) as { valor: number; referencia_original: string };
      resultado.completos.push({
        codigoTransacao: linha.referencia,
        textoReferencia: payload.referencia_original,
        valor: payload.valor,
        momentoFato: linha.momento_fato,
      });
    }
    return resultado;
  }

  function listarCacheIa(): EntradaCacheIa[] {
    const linhas = selecionarCacheIa.all() as unknown as {
      chave: string;
      resposta: string;
      criado_em: string;
      modelo: string | null;
    }[];
    return linhas.map((linha) => ({
      chave: linha.chave,
      resposta: linha.resposta,
      criadoEm: linha.criado_em,
      modelo: linha.modelo,
    }));
  }

  return {
    listarEventos,
    listarAchadosPorTipo,
    listarVinculos,
    obterIdPedidoPorVinculo,
    listarIdsPedido,
    obterMaiorNumeroPedido,
    obterMaiorMomentoFato,
    listarPagamentosSemIdentificacao,
    listarCacheIa,
  };
}

export type Consultas = ReturnType<typeof criarConsultas>;
