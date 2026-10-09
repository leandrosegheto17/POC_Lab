import { Route, Routes } from "react-router";
import { Casca } from "./componentes/Casca.tsx";
import { FaixaResumo } from "./componentes/FaixaResumo.tsx";
import { CampoBusca } from "./componentes/CampoBusca.tsx";
import { ProvedorResumo } from "./dados/contexto-resumo.tsx";
import { Divergencias } from "./paginas/Divergencias.tsx";
import { Pedido } from "./paginas/Pedido.tsx";
import { Indicadores } from "./paginas/Indicadores.tsx";
import { Qualidade } from "./paginas/Qualidade.tsx";
import { NaoEncontrada } from "./paginas/NaoEncontrada.tsx";

// Árvore de rotas T1-T5, separada de <App/> (que só acrescenta o
// <BrowserRouter/>) para que os testes montem as mesmas rotas dentro de um
// <MemoryRouter initialEntries={...}/>, controlando a rota corrente sem
// depender de `window.location`.
//
// <ProvedorResumo> envolve toda a árvore de rotas (não só
// a <Casca>) para que GET /api/v1/resumo dispare uma única vez por carga do
// app e nunca remonte ao trocar de rota (o Provider fica acima do <Routes>,
// que é quem desmonta/remonta a <Casca> e as páginas a cada navegação).
// <Casca> recebe os slots já preenchidos: slotResumo (FaixaResumo) e
// slotBusca (CampoBusca) — único <CampoBusca> no DOM, reposicionado só por
// CSS entre menu lateral e cabeçalho do celular.
//
// A rota "*" (T5) fica num segundo layout,
// <Casca variante="simples"/>, sem slotBusca e sem slotResumo (menu sem
// busca, sem faixa e sem ícones, como no mockup); a própria página T5 traz
// a busca dela (CampoBusca variante "pagina").
export function Rotas() {
  return (
    <ProvedorResumo>
      <Routes>
        <Route
          element={<Casca slotResumo={<FaixaResumo />} slotBusca={<CampoBusca />} />}
        >
          <Route path="/" element={<Divergencias />} />
          <Route path="/pedido/:codigo" element={<Pedido />} />
          <Route path="/indicadores" element={<Indicadores />} />
          <Route path="/qualidade" element={<Qualidade />} />
        </Route>
        <Route element={<Casca variante="simples" />}>
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </ProvedorResumo>
  );
}
