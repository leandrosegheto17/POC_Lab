import assert from "node:assert/strict";
import { test } from "node:test";

import { lerBookmark, lerIdLocal, lerVersaoBanco, publicar } from "./publicar.mjs";

const SQL = `INSERT INTO documento (chave, conteudo) VALUES ('resumo', '{"dataCorte":"x","idPublicacao":"abc123"}');`;
const LISTA = (version) => JSON.stringify([{ name: "outro", version: "alpha" }, { name: "poc-lab", version }]);
const BOOKMARK = '{"bookmark":"00000085-0000024c-00004c6d-8e61117bf38d7adb71b934ebbf891683"}';

function montar({
  remoto = '[{"results":[{"id":"abc123"}],"success":true}]',
  falharEm,
  versao = "production",
  timeTravel = BOOKMARK,
} = {}) {
  const chamadas = [];
  const logs = [];
  const escritas = [];
  const executar = (_cmd, args) => {
    const linha = args.join(" ");
    chamadas.push(linha);
    if (falharEm && linha.includes(falharEm)) throw new Error("boom");
    if (linha.includes("--command")) {
      if (remoto === "erro") throw new Error("no such table: documento");
      return remoto;
    }
    if (linha.includes("d1 list")) return LISTA(versao);
    if (linha.includes("time-travel info")) return timeTravel;
    return "";
  };
  return {
    chamadas,
    logs,
    escritas,
    deps: {
      executar,
      lerArquivo: () => SQL,
      escreverArquivo: (caminho, conteudo) => escritas.push({ caminho, conteudo }),
      log: (m) => logs.push(m),
    },
  };
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

test("tudo: ordem version, bookmark, carga, build, deploy", () => {
  const { chamadas, deps } = montar({ remoto: "erro" });
  publicar("tudo", deps);
  const ordem = ["d1 list", "time-travel info", "--file", "vite.js", "deploy"].map((t) =>
    chamadas.findIndex((c) => c.includes(t)),
  );
  assert.ok(ordem.every((i) => i >= 0));
  assert.deepEqual(ordem, [...ordem].sort((a, b) => a - b));
});

test("version diferente de production: para antes da carga", () => {
  const { chamadas, escritas, deps } = montar({ remoto: "erro", versao: "alpha" });
  assert.throws(() => { publicar("tudo", deps); }, /conferir version production[\s\S]*BLOCKERS/);
  assert.equal(cargas(chamadas).length, 0);
  assert.equal(escritas.length, 0);
  assert.ok(!chamadas.some((c) => c.includes("deploy")));
});

test("bookmark é gravado em ultimo-bookmark.txt e impresso", () => {
  const { logs, escritas, deps } = montar({ remoto: "erro" });
  publicar("dados", deps);
  assert.equal(escritas.length, 1);
  assert.match(escritas[0].caminho, /ultimo-bookmark\.txt$/);
  assert.ok(escritas[0].conteudo.startsWith("00000085-0000024c"));
  assert.ok(logs.some((l) => l.includes("00000085-0000024c")));
});

test("carga com erro: sem deploy e com bookmark e instrução de restore", () => {
  const { chamadas, deps } = montar({ remoto: "erro", falharEm: "--file" });
  assert.throws(
    () => { publicar("tudo", deps); },
    /Falha no passo "carregar[\s\S]*Bookmark anterior à carga: 00000085[\s\S]*time-travel restore poc-lab --bookmark 00000085/,
  );
  assert.ok(!chamadas.some((c) => c.includes("deploy") || c.includes("vite.js")));
});

test("dados já publicados: não consulta version nem bookmark e não carrega", () => {
  const { chamadas, escritas, deps } = montar();
  publicar("dados", deps);
  assert.ok(!chamadas.some((c) => c.includes("d1 list") || c.includes("time-travel")));
  assert.equal(cargas(chamadas).length, 0);
  assert.equal(escritas.length, 0);
});

test("bookmark inválido ou vazio: passo falha e a carga não roda", () => {
  for (const timeTravel of ["", "não é json", "{}"]) {
    const { chamadas, deps } = montar({ remoto: "erro", timeTravel });
    assert.throws(() => { publicar("dados", deps); }, /guardar bookmark[\s\S]*não encontrado/);
    assert.equal(cargas(chamadas).length, 0);
  }
});

test("lerVersaoBanco e lerBookmark devolvem undefined com saída inválida", () => {
  assert.equal(lerVersaoBanco(LISTA("production")), "production");
  assert.equal(lerBookmark(BOOKMARK), "00000085-0000024c-00004c6d-8e61117bf38d7adb71b934ebbf891683");
  for (const ruim of ["", "x", "[]", "{}", "null"]) {
    assert.equal(lerVersaoBanco(ruim), undefined);
    assert.equal(lerBookmark(ruim), undefined);
  }
});

test("alvo inválido é rejeitado", () => {
  assert.throws(() => { publicar("x", montar().deps); }, /Alvo inválido/);
});
