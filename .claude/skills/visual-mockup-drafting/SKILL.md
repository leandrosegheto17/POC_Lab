---
name: visual-mockup-drafting
description: Produz o mockup visual navegável de todas as telas (PC e celular, nos 4 estados) em HTML/CSS dentro de .md/mockup/, primeiro como 2-3 direções visuais para o usuário escolher e depois completo na direção escolhida, com tokens.css e fontes que a implementação copia sem alterar, dados de exemplo no formato do contrato da API e o mapa telas.json usado pela comparação visual automática. O mockup aprovado é a fonte de verdade da aparência. Use no Loop B do /definir, depois que fluxos e telas (user-flow-to-screen-mapping) existem e antes de fechar o UX-SPEC.md. Do NOT use for implementar as telas no código do produto (isso é ui-implementation, do executor) ou para definir fluxo/requisito (isso é user-flow-to-screen-mapping e o PRD).
metadata:
  author: coordenador
  version: '1.0.0'
---

# Visual Mockup Drafting

Você atua como o Coordenador (chapéu UX/UI) desenhando **o que o usuário vai aprovar e
o que a implementação vai copiar**. O mockup não é inspiração: depois de aprovado ele é
a fonte de verdade da aparência, e a implementação é comparada com ele pixel a pixel
(`.claude/scripts/comparar-visual.mjs`). Por isso ele precisa ser completo, correto em
acessibilidade e escrito de um jeito que dê para copiar valores, não estimar.

**Por que existe.** No POC_Lab o mockup foi feito fora do fluxo, depois do texto do
UX-SPEC, só com o estado de sucesso, faltando requisitos e contrariando regras de
acessibilidade do próprio documento. O Executor seguiu o texto, ninguém comparou a tela
com o mockup, e foram três rodadas de ajuste com 25 componentes refeitos.

## Quando é Acionada

- Loop B do `/definir`, **etapa B2** (direções visuais) e **etapa B3** (mockup
  completo), depois de `user-flow-to-screen-mapping` (fluxos e telas da §1-2 do
  UX-SPEC) e antes de `ux-spec-drafting` fechar o documento.
- Reabertura pontual do `/definir` que mude aparência: o mockup muda **primeiro**, o
  código depois (via tarefa).

Do NOT use for:
- Implementar telas no código do produto — isso é `ui-implementation`.
- Definir fluxo, requisito ou dado — o mockup mostra o que o PRD e o contrato já dizem.

## Inputs Esperados

- `UX-SPEC.md` §1-2 (fluxos e telas) e §4 (estados) em rascunho (obrigatório).
- `PRD-TECNICO.md` — requisitos que aparecem em cada tela (obrigatório).
- Contrato da API (seção do `SDD.md` ou `API-CONTRACT.yaml`) — formato dos dados
  (obrigatório quando a tela consome API).
- `frontend-design` (apoio) — qualidade visual, sem estética genérica.

## Core Framework

### Etapa B2 — Direções visuais (2 a 3)

- Cada direção é **uma tela-chave** (a mais densa, ex.: a lista principal) em PC e
  celular, com paleta, tipografia e densidade próprias — o suficiente para escolher um
  caminho, não o produto inteiro.
- Arquivos em `.md/mockup/direcoes/<letra>-<nome>/` e uma galeria
  `.md/mockup/direcoes/index.html` lado a lado.
- Cada direção já respeita o contraste mínimo (ver "Acessibilidade" abaixo): o usuário
  escolhe entre opções válidas, não descobre o problema depois.
- O usuário escolhe uma. As outras ficam na pasta como histórico e **nunca** são
  referência de implementação.

### Etapa B3 — Mockup completo da direção escolhida

Estrutura obrigatória de `.md/mockup/`:

| Caminho | Conteúdo |
|---|---|
| `tokens.css` | **Única** definição de cores, tipografia (família, pesos, escala), espaçamentos, raios, sombras e breakpoints, como variáveis CSS. A implementação copia este arquivo sem alterar. |
| `fontes/` | Arquivos `woff2` auto-hospedados + licença. Nada de fonte de CDN: a renderização tem que ser a mesma no mockup e no app. |
| `base.css` | Estilos dos componentes do mockup (usando só variáveis de `tokens.css`; nenhum valor de cor/espaço solto). |
| `telas/<tela>--<estado>.html` | Uma página por tela e estado (`sucesso`, `vazio`, `carregando`, `erro`), **responsiva** (o mesmo HTML vale para PC e celular via media query, como o app). Estado "não aplicável" no UX-SPEC §4 não precisa de página. |
| `dados.json` | Os dados de exemplo exibidos, realistas (nomes, valores, datas plausíveis; volume suficiente para paginação/rolagem quando a tela tem). |
| `respostas/*.json` | As respostas da API **no formato exato do contrato** que produzem esses dados (inclusive as de erro). A comparação visual responde o app com estes arquivos, então o mockup precisa mostrar exatamente o que eles contêm. |
| `telas.json` | Mapa tela → página do mockup → rota do app → tamanhos → respostas (formato no cabeçalho de `.claude/scripts/comparar-visual.mjs`). |
| `index.html` | Galeria para aprovação: cada tela × estado em PC e celular (iframes no tamanho do viewport), com o nome da tela e o requisito que ela cobre. |

Regras do conteúdo:

1. **Completo.** Toda tela da §2 do UX-SPEC × PC e celular × todo estado aplicável.
   Todo requisito do PRD que aparece numa tela aparece no mockup (ex.: se são 7 tipos
   de achado, o mockup mostra 7). Um checklist "tela × requisito" vai no rodapé da
   galeria.
2. **Valores exatos, não aproximados.** Tamanhos, pesos, espaçamentos e cores vêm de
   `tokens.css`; quando uma tela precisa de um valor fora da escala, ele vira token
   novo, nunca um número solto num seletor.
3. **Escrito para ser copiado.** Classes com nomes de componente (`cartao-resumo`,
   `etiqueta-tipo`), estrutura HTML semântica (`<main>`, `<nav>`, `<h1>`, `<table>`) —
   é o que o Executor vai ler para reproduzir.
4. **Acessibilidade antes da aprovação.** Contraste de todo par texto/fundo ≥ 4,5:1
   (≥ 3:1 para texto grande e contorno de controle), foco visível desenhado, ordem de
   leitura coerente, alvo de toque ≥ 44 px no celular. Calcule os pares a partir de
   `tokens.css` e liste-os na galeria. Se o usuário quiser algo abaixo disso, a decisão
   acontece **na aprovação** e é registrada na §5 do UX-SPEC — nunca depois da
   implementação.
5. **Fontes e dados iguais aos do app.** Mesmas fontes (`fontes/`), mesmos dados
   (`respostas/`). Sem isso a comparação pixel a pixel não tem como bater.
6. **Sem dependência externa** além do que a página da galeria precisar para ser
   publicada; as telas não carregam script de terceiros.

### Publicação para aprovação

O Coordenador não publica: grava os arquivos e devolve ao `/definir` a lista de
arquivos. O comando publica a galeria (`index.html`) como Artifact, com as telas, CSS,
fontes e JSON como arquivos de apoio, e mostra o link ao usuário. Cada rodada de ajuste
republica no mesmo link.

## Workflow

1. **B2:** leia §1-2 do UX-SPEC e escolha a tela-chave; produza 2-3 direções em
   `.md/mockup/direcoes/`, com contraste conferido; devolva ao comando para publicar.
2. Usuário escolhe a direção (pode pedir mistura: "cores da A, densidade da C").
3. **B3:** crie `tokens.css` e `fontes/` a partir da direção escolhida; monte
   `respostas/*.json` e `dados.json` a partir do contrato; produza todas as telas ×
   estados; monte `telas.json` e a galeria com o checklist tela × requisito e a tabela
   de contraste.
4. Confira o checklist de critérios abaixo antes de devolver.
5. Cada ajuste pedido pelo usuário muda o mockup (e `tokens.css`, se for o caso) e é
   republicado; o texto do UX-SPEC é atualizado junto (`ux-spec-drafting`).

## Output Esperado

- `.md/mockup/` com a estrutura da tabela acima; `.md/mockup/direcoes/` com as
  direções da B2.
- Para o comando: a lista de arquivos a publicar e um resumo de uma linha por tela
  (estados cobertos, requisitos cobertos).

## Critério de Aceite

- [ ] Toda tela da §2 do UX-SPEC tem página, em PC e celular, para cada estado
      aplicável da §4
- [ ] Todo requisito do PRD que aparece numa tela está no mockup (checklist na galeria)
- [ ] Nenhum valor de cor/tipografia/espaço fora de `tokens.css`
- [ ] Fontes auto-hospedadas em `fontes/`; nenhuma fonte de CDN
- [ ] `respostas/*.json` no formato exato do contrato e coerentes com o que as telas
      mostram
- [ ] `telas.json` cobre toda tela × estado × tamanho do mockup
- [ ] Tabela de contraste na galeria, todos os pares no mínimo — ou desvio decidido
      pelo usuário na aprovação e registrado na §5 do UX-SPEC

### MUST DO
- Mostrar direções antes do mockup completo — escolher direção é barato, refazer o
  produto inteiro não.
- Tratar o mockup aprovado como fonte de verdade: mudança de aparência começa nele.

### MUST NOT DO
- Entregar só o estado de sucesso, só o PC ou só as telas "principais".
- Deixar a aprovação para depois de a implementação começar.
- Aprovar um mockup que contradiz o texto do UX-SPEC sem resolver a contradição
  (o texto passa a apontar para o mockup na §0 e na §3).
