// TP-0055 — roteamento real do app, substituindo o placeholder da TP-0003.
// A árvore de rotas T1-T5 vive em `Rotas.tsx` (separada daqui para que os
// testes montem as mesmas rotas num <MemoryRouter/>); este componente só
// acrescenta o <BrowserRouter/> real usado em produção.
import { BrowserRouter } from "react-router";
import { Rotas } from "./Rotas.tsx";

export function App() {
  return (
    <BrowserRouter>
      <Rotas />
    </BrowserRouter>
  );
}
