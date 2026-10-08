import { Route, Routes } from "react-router";
import { Casca } from "./componentes/Casca.tsx";
import { Divergencias } from "./paginas/Divergencias.tsx";
import { Pedido } from "./paginas/Pedido.tsx";
import { Indicadores } from "./paginas/Indicadores.tsx";
import { Qualidade } from "./paginas/Qualidade.tsx";
import { NaoEncontrada } from "./paginas/NaoEncontrada.tsx";

// TP-0055 — árvore de rotas T1-T5, separada de <App/> (que só acrescenta o
// <BrowserRouter/>) para que os testes montem as mesmas rotas dentro de um
// <MemoryRouter initialEntries={...}/>, controlando a rota corrente sem
// depender de `window.location`.
export function Rotas() {
  return (
    <Routes>
      <Route element={<Casca />}>
        <Route path="/" element={<Divergencias />} />
        <Route path="/pedido/:codigo" element={<Pedido />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/qualidade" element={<Qualidade />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
