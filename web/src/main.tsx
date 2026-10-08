import "./estilos/tokens.css";
import "./estilos/base.css";
import "./estilos/casca.css";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

const elemento = document.getElementById("root");

if (!elemento) {
  throw new Error("Elemento #root não encontrado em index.html.");
}

createRoot(elemento).render(<App />);
