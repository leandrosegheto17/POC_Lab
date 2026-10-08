import { DatabaseSync } from "node:sqlite";

/**
 * Item de um pedido, conforme a tabela "Order Details" da base de vendas
 * (Northwind). Valores crus, sem nenhum cálculo (valor devido é RN de TP-0020).
 */
export type ItemPedidoVendas = {
  precoUnitario: number;
  quantidade: number;
  desconto: number;
};

/**
 * Classificação do formato textual bruto da coluna `OrderDate` antes da
 * normalização para ISO-8601. A base Northwind mistura dois formatos de data
 * dependendo de como a linha foi inserida:
 * - `curto`: data sem componente de hora, ex. `YYYY-MM-DD`.
 * - `longo`: data com componente de hora, ex. `YYYY-MM-DD HH:MM:SS` (ou
 *   variações com hora, incluindo o padrão `YYYY-MM-DD HH:MM:SS.sss` do
 *   SQLite).
 */
export type FormatoData = "curto" | "longo";

export type DataPedido = {
  /** Data do pedido normalizada para ISO-8601. */
  iso: string;
  /** Formato textual bruto de origem, antes da normalização. */
  formato: FormatoData;
};

/**
 * Pedido de vendas lido diretamente da base Northwind, com datas normalizadas
 * para ISO-8601 mas sem nenhuma outra transformação de domínio (nem eventos,
 * nem cálculo de valor devido, nem classificação de achados de qualidade —
 * isso é responsabilidade de TP-0020, que consome esta leitura).
 */
export type PedidoVendas = {
  idPedido: string;
  itens: ItemPedidoVendas[];
  dataPedido: DataPedido;
  /** Data de envio em ISO-8601, ou `null` quando o pedido ainda não foi enviado. */
  dataEnvio: string | null;
  /** Data limite (RequiredDate) em ISO-8601. */
  dataLimite: string;
  /** Código cru da transportadora (`ShipVia`), sem tradução para nome — isso é RN de TP-0020. */
  transportadora: string;
};

type LinhaOrders = {
  OrderID: number | bigint | string;
  OrderDate: string | null;
  RequiredDate: string | null;
  ShippedDate: string | null;
  ShipVia: number | bigint | string | null;
};

type LinhaOrderDetails = {
  OrderID: number | bigint | string;
  UnitPrice: number;
  Quantity: number;
  Discount: number;
};

/**
 * Classifica o formato textual bruto de uma data da base Northwind como
 * `curto` (sem hora, ex. `YYYY-MM-DD`) ou `longo` (com hora, ex.
 * `YYYY-MM-DD HH:MM:SS[.sss]`).
 */
export function classificarFormatoData(bruta: string): FormatoData {
  const somenteData = /^\d{4}-\d{2}-\d{2}$/;
  return somenteData.test(bruta.trim()) ? "curto" : "longo";
}

/**
 * Normaliza uma data bruta da base Northwind para ISO-8601.
 *
 * - Formato `curto` (`YYYY-MM-DD`) é interpretado como data (sem hora) e
 *   normalizado para `YYYY-MM-DDT00:00:00.000Z`.
 * - Formato `longo` (`YYYY-MM-DD HH:MM:SS[.sss]`) é interpretado como UTC
 *   (convenção da base de origem, que não traz offset de fuso) e normalizado
 *   trocando o espaço separador por `T` e garantindo o sufixo `Z`.
 */
export function normalizarDataParaIso(bruta: string): string {
  const valor = bruta.trim();
  if (classificarFormatoData(valor) === "curto") {
    return `${valor}T00:00:00.000Z`;
  }
  const comT = valor.replace(" ", "T");
  return comT.endsWith("Z") ? comT : `${comT}Z`;
}

function normalizarDataPedido(bruta: string): DataPedido {
  return {
    iso: normalizarDataParaIso(bruta),
    formato: classificarFormatoData(bruta),
  };
}

/**
 * Abre a base de vendas (Northwind, `.db`) em modo **somente leitura** e
 * devolve a lista de pedidos com seus itens e datas normalizadas para
 * ISO-8601.
 *
 * Garantia de somente leitura: a conexão é aberta com `readOnly: true`
 * (suportado por `node:sqlite` desde o Node v22.12.0 — se uma versão de Node
 * sem esse suporte for usada, a abertura falhará de forma explícita em vez de
 * silenciosamente permitir escrita). Além disso, este módulo nunca emite
 * `INSERT`/`UPDATE`/`DELETE`/`CREATE`/`DROP` — apenas `SELECT` — contra essa
 * conexão.
 *
 * Esta função só lê e normaliza formato de data; NÃO cria eventos de domínio,
 * NÃO calcula valor devido e NÃO classifica achados de qualidade — isso é
 * responsabilidade de outra tarefa (TP-0020) que consome este retorno.
 */
export function lerBaseDeVendas(caminhoArquivo: string): PedidoVendas[] {
  const db = new DatabaseSync(caminhoArquivo, { readOnly: true });
  try {
    const linhasOrders = db
      .prepare(
        `SELECT "OrderID" AS "OrderID", "OrderDate" AS "OrderDate", "RequiredDate" AS "RequiredDate", "ShippedDate" AS "ShippedDate", "ShipVia" AS "ShipVia" FROM "Orders"`,
      )
      .all() as unknown as LinhaOrders[];

    const linhasItens = db
      .prepare(
        `SELECT "OrderID" AS "OrderID", "UnitPrice" AS "UnitPrice", "Quantity" AS "Quantity", "Discount" AS "Discount" FROM "Order Details"`,
      )
      .all() as unknown as LinhaOrderDetails[];

    const itensPorPedido = new Map<string, ItemPedidoVendas[]>();
    for (const linha of linhasItens) {
      const idPedido = String(linha.OrderID);
      const lista = itensPorPedido.get(idPedido) ?? [];
      lista.push({
        precoUnitario: linha.UnitPrice,
        quantidade: linha.Quantity,
        desconto: linha.Discount,
      });
      itensPorPedido.set(idPedido, lista);
    }

    return linhasOrders.map((linha): PedidoVendas => {
      const idPedido = String(linha.OrderID);
      if (linha.OrderDate === null) {
        throw new Error(
          `Pedido "${idPedido}" não tem OrderDate preenchida — dado inconsistente na base de origem.`,
        );
      }
      if (linha.RequiredDate === null) {
        throw new Error(
          `Pedido "${idPedido}" não tem RequiredDate preenchida — dado inconsistente na base de origem.`,
        );
      }

      return {
        idPedido,
        itens: itensPorPedido.get(idPedido) ?? [],
        dataPedido: normalizarDataPedido(linha.OrderDate),
        dataEnvio: linha.ShippedDate === null ? null : normalizarDataParaIso(linha.ShippedDate),
        dataLimite: normalizarDataParaIso(linha.RequiredDate),
        transportadora: linha.ShipVia === null ? "" : String(linha.ShipVia),
      };
    });
  } finally {
    db.close();
  }
}
