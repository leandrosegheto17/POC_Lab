// Trechos comuns aos testes de estado de erro das telas (5xx da API).
import { expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { respostaFake } from "./api-simulada.tsx";

/** Resposta `fetch` com status 500 e o corpo de erro informado. */
export function respostaApi500(corpo: unknown): Promise<Response> {
  return Promise.resolve(respostaFake({
    ok: false,
    status: 500,
    json: () => Promise.resolve(corpo),
  }));
}

/** Espera a mensagem de indisponibilidade mostrada pelo `EstadoErro`. */
export async function esperarMensagemIndisponivel(): Promise<void> {
  await waitFor(() => {
    expect(
      screen.getByText(
        "Não foi possível consultar os dados agora. Tente de novo em alguns segundos.",
      ),
    ).toBeInTheDocument();
  });
}
