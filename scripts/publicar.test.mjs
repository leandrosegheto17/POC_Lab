import assert from "node:assert/strict";
import { test } from "node:test";

import { lerIdLocal, publicar } from "./publicar.mjs";

const SQL = `INSERT INTO documento (chave, conteudo) VALUES ('resumo', '{"dataCorte":"x","idPublicacao":"abc123"}');`;

function montar({ remoto = '[{"results":[{"id":"abc123"}],"success":true}]', falharEm } = {}) {
  const chamadas = [];
  const logs = [];
  const executar = (_cmd, args) => {
    const linha = args.join(" ");
    chamadas.push(linha);
    if (falharEm && linha.includes(falharEm)) throw new Error("boom");
    if (linha.includes("--command")) {
      if (remoto === "erro") throw new Error("no such table: documento");
      return remoto;
    }
    return "";
  };
  return { chamadas, logs, deps: { executar, lerArquivo: () => SQL, log: (m) => logs.push(m) } };
}

const cargas = (chamadas) => chamadas.filter((c) => c.includes("--file"));

test("lerIdLocal extrai o idPublicacao do resumo", () => {
  assert.equal(lerIdLocal(SQL), "abc123");
});

test("site: build antes do deploy e nenhuma chamada a d1", () => {
  const { chamadas, deps } = montar();
  publicar("site", deps);
  assert.equal(chamadas.length, 2);
  assert.match(chamadas[0], /vite\.js build/);
  assert.match(chamadas[1], /wrangler\.js deploy/);
  assert.ok(!chamadas.some((c) => c.includes("d1")));
});

test("dados com idPublicacao remoto igual: pula a carga e avisa", () => {
  const { chamadas, logs, deps } = montar();
  publicar("dados", deps);
  assert.equal(cargas(chamadas).length, 0);
  assert.ok(logs.some((l) => l.includes("dados já publicados (idPublicacao abc123)")));
});

test("dados com idPublicacao diferente: executa a carga remota", () => {
  const { chamadas, deps } = montar({ remoto: '[{"results":[{"id":"outro"}]}]' });
  publicar("dados", deps);
  assert.equal(cargas(chamadas).length, 1);
  assert.ok(cargas(chamadas)[0].includes("--remote"));
});

test("dados com consulta remota sem resultado ou com erro: executa a carga", () => {
  for (const remoto of ['[{"results":[]}]', "erro"]) {
    const { chamadas, deps } = montar({ remoto });
    publicar("dados", deps);
    assert.equal(cargas(chamadas).length, 1);
  }
});

test("tudo: dados antes do site", () => {
  const { chamadas, deps } = montar({ remoto: "erro" });
  publicar("tudo", deps);
  const iCarga = chamadas.findIndex((c) => c.includes("--file"));
  const iBuild = chamadas.findIndex((c) => c.includes("vite.js"));
  const iDeploy = chamadas.findIndex((c) => c.includes("deploy"));
  assert.ok(iCarga >= 0 && iCarga < iBuild && iBuild < iDeploy);
});

test("para no primeiro erro, nomeando o passo", () => {
  const { chamadas, deps } = montar({ falharEm: "vite.js" });
  assert.throws(() => { publicar("tudo", deps); }, /Falha no passo "build do site"/);
  assert.ok(!chamadas.some((c) => c.includes("deploy")));
});

test("alvo inválido é rejeitado", () => {
  assert.throws(() => { publicar("x", montar().deps); }, /Alvo inválido/);
});
