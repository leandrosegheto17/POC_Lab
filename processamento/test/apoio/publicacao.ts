import { criarRepositorio, type Repositorio } from "../../src/armazenamento/repositorio.js";

export function eventoVenda(
  repositorio: Repositorio,
  opcoes: { codigoEvento: string; idPedido: string; valorDevido: number; dataLimite: string },
) {
  repositorio.inserirEvento({
    fonte: "vendas",
    codigoEvento: opcoes.codigoEvento,
    idPedido: opcoes.idPedido,
    tipo: "venda",
    momentoFato: "2026-01-01T10:00:00Z",
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      valor_devido: opcoes.valorDevido,
      data_limite: opcoes.dataLimite,
      transportadora: "Transportadora 1",
    }),
  });
}

export function eventoPagamento(
  repositorio: Repositorio,
  opcoes: { codigoEvento: string; idPedido: string; valor: number; referenciaOriginal: string },
) {
  repositorio.inserirEvento({
    fonte: "pagamentos",
    codigoEvento: opcoes.codigoEvento,
    idPedido: opcoes.idPedido,
    tipo: "pagamento",
    momentoFato: "2026-01-02T10:00:00Z",
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      valor: opcoes.valor,
      referencia_original: opcoes.referenciaOriginal,
    }),
  });
}

export function montarRepositorioComFixture(): Repositorio {
  const repositorio = criarRepositorio(":memory:");
  repositorio.inserirPedido("PED-000001");
  repositorio.inserirVinculoFonte("vendas", "PED-000001", "PED-000001");
  eventoVenda(repositorio, {
    codigoEvento: "PED-000001",
    idPedido: "PED-000001",
    valorDevido: 100,
    dataLimite: "2026-01-10",
  });
  repositorio.inserirVinculoFonte("pagamentos", "PAG-001", "PED-000001");
  eventoPagamento(repositorio, {
    codigoEvento: "PAG-001",
    idPedido: "PED-000001",
    valor: 40,
    referenciaOriginal: "PED-000001",
  });
  return repositorio;
}
