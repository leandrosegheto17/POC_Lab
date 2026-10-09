// Tela Pedido: cabeçalho (identidade/fontes/valores/divergências) e
// `LinhaDoTempo` em sucesso. Estados vazio/erro/carregando e acessibilidade em
// `pedido-estados.test.tsx`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import {
  aguardarTitulo,
  eventoPagamentoCom,
  eventoVenda,
  instalarPedidoFixo,
  renderizar,
  respostaLinhaDoTempoValida,
} from "./apoio/pedido-simulado.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Pedido — sucesso", () => {
  it("buscando pela identidade: link de volta, h1 em mono com 'Pedido ' oculto, 'Presente em 3 de 3 sistemas'", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida());

    const { container } = renderizar();
    await aguardarTitulo();

    const voltar = screen.getByRole("link", { name: "Divergências" });
    expect(voltar).toHaveAttribute("href", "/");
    expect(voltar).toHaveTextContent("← Divergências");

    const titulo = screen.getByRole("heading", { level: 1 });
    expect(titulo).toHaveClass("pedido-titulo");
    expect(titulo.querySelector(".visualmente-oculto")).toHaveTextContent(
      "Pedido",
    );

    expect(screen.queryByText(/Encontrado pelo código/)).not.toBeInTheDocument();
    expect(screen.getByText("Presente em 3 de 3 sistemas")).toHaveClass(
      "pedido-subtitulo",
    );
    expect(screen.getByText("3 de 3 sistemas")).toHaveClass("pedido-sistemas");

    // Removidos no Modelo B: "Aparece em … fontes" e "Situação:".
    expect(container).not.toHaveTextContent("Aparece em");
    expect(container).not.toHaveTextContent("Situação:");
  });

  it("cartões de valor: PC com R$, Saldo e Data limite; celular sem R$ e sem Saldo", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida());

    const { container } = renderizar();
    await aguardarTitulo();

    const pc = container.querySelector(".pedido-kpis--pc");
    expect(pc).toHaveClass("kpis");
    expect(
      Array.from(pc?.querySelectorAll("dt") ?? []).map((dt) => dt.textContent),
    ).toEqual(["Devido", "Pago", "Saldo", "Data limite"]);
    expect(
      Array.from(pc?.querySelectorAll("dd") ?? []).map((dd) => dd.textContent),
    ).toEqual(["R$ 300,00", "R$ 300,00", "R$ 0,00", "2026-01-20"]);
    expect(pc?.querySelector(".pedido-valor--ruim")).toBeNull();

    const celular = container.querySelector(".pedido-kpis--celular");
    expect(celular).toHaveClass("kpis", "kpis--celular");
    expect(
      Array.from(celular?.querySelectorAll("dt") ?? []).map(
        (dt) => dt.textContent,
      ),
    ).toEqual(["Devido", "Pago", "Limite"]);
    expect(
      Array.from(celular?.querySelectorAll("dd") ?? []).map(
        (dd) => dd.textContent,
      ),
    ).toEqual(["300,00", "300,00", "2026-01-20"]);
  });

  it("pago menor que o devido: saldo negativo com sinal e Pago/Saldo em vermelho", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({ devido: 440, pago: 264 }));

    const { container } = renderizar();
    await aguardarTitulo();

    const valoresPc = container.querySelectorAll(".pedido-kpis--pc dd");
    expect(valoresPc[1]).toHaveTextContent("R$ 264,00");
    expect(valoresPc[1]).toHaveClass("pedido-valor--ruim");
    expect(valoresPc[2]).toHaveTextContent("−R$ 176,00");
    expect(valoresPc[2]).toHaveClass("pedido-valor--ruim");
    expect(valoresPc[0]).not.toHaveClass("pedido-valor--ruim");

    const valoresCelular = container.querySelectorAll(
      ".pedido-kpis--celular dd",
    );
    expect(valoresCelular[1]).toHaveTextContent("264,00");
    expect(valoresCelular[1]).toHaveClass("pedido-valor--ruim");
  });

  it("pago maior que o devido: saldo positivo com '+'", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({ devido: 440, pago: 880 }));

    const { container } = renderizar();
    await aguardarTitulo();

    const valoresPc = container.querySelectorAll(".pedido-kpis--pc dd");
    expect(valoresPc[2]).toHaveTextContent("+R$ 440,00");
  });

  it("linha do tempo: h2 com nota no PC e versão curta no celular, eventos e código de vendas no cabeçalho", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida());

    const { container } = renderizar();
    await aguardarTitulo();

    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.querySelector(".so-pc")).toHaveTextContent(
      "Linha do tempo por sistema · ordem do momento do fato",
    );
    expect(h2.querySelector(".so-celular")).toHaveTextContent(/^Linha do tempo$/);
    expect(h2.closest("section")).toHaveAttribute(
      "aria-labelledby",
      h2.getAttribute("id"),
    );

    expect(
      screen.getByRole("region", { name: "Linha do tempo por sistema" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".evento")).toHaveLength(2);
    expect(
      container.querySelector(".linha-do-tempo__cabecalho-codigo"),
    ).toHaveTextContent("#10248");
  });

  it("buscando por código de fonte: 'Encontrado pelo código' (PC) e 'encontrado por' (celular)", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({ codigoBuscado: "TX-88812" }));

    const { container } = renderizar("TX-88812");
    await aguardarTitulo();

    const subtitulo = container.querySelector(".pedido-subtitulo");
    expect(subtitulo).toHaveTextContent(
      "Encontrado pelo código TX-88812 · presente em 3 de 3 sistemas",
    );
    expect(subtitulo?.querySelector(".mono")).toHaveTextContent("TX-88812");

    expect(container.querySelector(".pedido-sistemas")).toHaveTextContent(
      "3 de 3 sistemas · encontrado por TX-88812",
    );
  });

  it("sem divergência mostra 'Sem divergência' (EtiquetaEstado ok)", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({ divergencias: [] }));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem divergência")).toHaveAttribute(
        "data-variante",
        "ok",
      );
    });
  });

  it("divergência 'duplicado': marca o segundo pagamento integral, não o primeiro", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({
            devido: 150,
            pago: 300,
            divergencias: [{ tipo: "duplicado", motivo: "Pago duas vezes." }],
            eventos: [
              eventoVenda(),
              eventoPagamentoCom("TX-1", 150),
              eventoPagamentoCom("TX-2", 150),
            ],
          }));

    const { container } = renderizar();
    await aguardarTitulo();

    const pagamentos = container.querySelectorAll(
      '.evento[data-fonte="pagamentos"]',
    );
    expect(pagamentos).toHaveLength(2);
    expect(pagamentos[0]).not.toHaveClass("evento--ruim");
    expect(pagamentos[0]).not.toHaveTextContent("duplicado");
    expect(pagamentos[1]).toHaveClass("evento--ruim");
    expect(pagamentos[1]).toHaveTextContent("duplicado");
    // Etiqueta do topo usa o rótulo novo.
    expect(screen.getByText("Pago duas vezes")).toBeInTheDocument();
  });

  it("sem a divergência 'duplicado' na API, nenhum pagamento é marcado", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({
            devido: 150,
            pago: 300,
            divergencias: [],
            eventos: [
              eventoVenda(),
              eventoPagamentoCom("TX-1", 150),
              eventoPagamentoCom("TX-2", 150),
            ],
          }));

    const { container } = renderizar();
    await aguardarTitulo();

    expect(container.querySelectorAll(".evento--ruim")).toHaveLength(0);
    expect(screen.queryByText("duplicado")).not.toBeInTheDocument();
  });

  it("com divergência mostra uma EtiquetaTipo por item", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida({
            divergencias: [
              { tipo: "parcial", motivo: "Pago parcialmente." },
              { tipo: "entrega_atrasada", motivo: "Atraso de 5 dias." },
            ],
          }));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Pagamento parcial")).toBeInTheDocument();
    });
    expect(screen.getByText("Entrega atrasada")).toBeInTheDocument();
    expect(screen.queryByText("Sem divergência")).not.toBeInTheDocument();
  });
});
