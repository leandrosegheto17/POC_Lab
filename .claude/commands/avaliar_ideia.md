---
description: Aciona o agente Dono num loop de refinamento (Loop 0) para avaliar se vale investir tempo na construção de uma ideia — produz o PLANO-COMERCIAL.md (como vender, pra quem, onde publicar, concorrentes, percentual de viabilidade, break-even) com veredito comercial explícito, numa conversa de rodadas até você aprovar. O plano aprovado é a entrada do /planejar. Não encadeia para /planejar sozinho.
argument-hint: [ideia em linguagem natural, opcional se já houver PLANO-COMERCIAL.md em .md/ para retomar/revisar]
---

# Comando `/avaliar_ideia` — Dono, Loop 0

A lógica deste comando está definida em `.claude/PLANNING-FLOW.md` (Comando 0,
inclusive a seção "Mecânica de loop de refinamento") — leia esse arquivo agora,
antes de fazer qualquer outra coisa, se ainda não o tiver em contexto. Ele por
sua vez assume o que está declarado em `.claude/agents/dono.md` e em
`PIPELINE-CONVENTIONS.md`.

Você não está entrando em um modo de orquestração autônoma — **o usuário é o
orquestrador**. Este comando roda um **loop de refinamento** (Loop 0) com o Dono:
dispatch inicial, depois rodadas de ajuste continuando a mesma instância via
`SendMessage`, até você aprovar. O propósito é responder, antes de qualquer
definição de produto: **vale ou não investir tempo na construção desta ideia?**
Não dispara `/planejar` nem qualquer outro comando por conta própria.

Ideia recebida (pode estar vazia): $ARGUMENTS

## 1. Determinar o ponto de retomada

Nunca presuma que está começando do zero:

1. Verifique o que já existe em `.md/`: `PLANO-COMERCIAL.md`.
2. **Loop 0 desta mesma sessão ainda aberto** (instância do Dono viva, sem
   aprovação registrada ainda): continue via `SendMessage` — vá direto para a
   Seção 2b, não dispare um agente novo.
3. Se `PLANO-COMERCIAL.md` já existe (Loop 0 fechado anteriormente) e
   `$ARGUMENTS` está vazio: interprete como pedido de revisão/status do plano já
   produzido, não como reinício — apresente o resumo (Seção 3) e o veredito
   atual, e pergunte se o usuário quer revisar algo.
4. Se `$ARGUMENTS` tem conteúdo e já existe `PLANO-COMERCIAL.md` aprovado:
   interprete como revisão pontual (sempre dispatch novo, lendo o plano do
   disco) — a menos que o texto deixe claro que é uma ideia nova/diferente, caso
   em que confirme com o usuário antes de sobrescrever.
5. Se nada existe e `$ARGUMENTS` está vazio: pare e peça a ideia em linguagem
   natural antes de prosseguir.

## 2. Loop com o Dono

### 2a. Rodada inicial (dispatch novo)

1. **Anuncie** que vai acionar o Dono para estruturar o planejamento comercial da
   ideia e chegar a um veredito de "vale ou não investir tempo".
2. **Dispare o agente** via `Agent` (`subagent_type: dono`,
   `run_in_background: false`). O prompt de dispatch: a ideia bruta
   (`$ARGUMENTS`) e o que já existir em `.md/` como contexto — não repita a
   definição do agente, ele já a tem.
3. O dispatch produz o rascunho do `PLANO-COMERCIAL.md` (rodada 1 do loop) —
   trate como rascunho, não resultado final. Se a ideia for insuficiente até
   para uma hipótese comercial (sem indicação de quem pagaria ou por quê), o
   Dono devolve as perguntas que precisa respondidas em vez de um plano — repasse
   ao usuário e pare.

### 2b. Rodadas seguintes (mesma instância, via `SendMessage`)

Enquanto o usuário pedir ajuste em vez de aprovar: continue a **mesma instância**
do Dono via `SendMessage` (nunca um dispatch novo) com o feedback recebido. Sem
teto de rodadas. Cada rodada reescreve `PLANO-COMERCIAL.md` no disco (não só na
aprovação final).

Se o usuário pedir para descartar tudo e recomeçar: a próxima rodada é um
dispatch novo (volte para 2a).

### 2c. Encerramento do loop

Só fecha na aprovação explícita do usuário sobre o `PLANO-COMERCIAL.md` —
aprovar aqui significa "o plano reflete a realidade que conseguimos enxergar",
não necessariamente "a ideia é boa": um plano aprovado com veredito "a conta não
fecha" é um encerramento válido (a ideia foi avaliada e descartada/adiada com
registro).

## 3. Apresentar o resultado (a cada rodada)

Ao final de **cada** rodada (não só uma vez ao final do comando), apresente um
resumo objetivo (não o documento inteiro), **liderando pelo veredito**:

- **Veredito comercial** (topo do plano): a conta fecha / não fecha / fecha
  condicionado a premissa — e a leitura honesta em uma frase.
- Modelo de venda e preço (com a âncora), público-alvo (ICP), canal principal,
  concorrentes mapeados, percentual de viabilidade **com as premissas que o
  sustentam**, número de vendas do break-even.
- O checklist "Critérios de Pronto" do `dono.md`.

**Pare aqui.** Termine a resposta aguardando a decisão do usuário:

- **Aprovar e seguir**: informe que o próximo passo disponível é `/planejar` — o
  `PLANO-COMERCIAL.md` aprovado é a entrada dele (o Gestor o lê do disco como
  insumo do Gate 1). Este comando não dispara `/planejar` sozinho.
- **Aprovar e não seguir** (a conta não fecha, ou o usuário decide adiar): o
  plano fica registrado em `.md/PLANO-COMERCIAL.md` como avaliação encerrada —
  nada mais é acionado.
- **Pedir ajuste**: mais uma rodada (Seção 2b).
- **Descartar e recomeçar**: dispatch novo (Seção 2a).

## 4. Bloqueio

Se o dispatch gerar uma entrada em `.md/BLOCKERS.md` (`Aberto`): o Loop 0
**suspende** (não descarta) e o comando pára — explique quem reportou, o quê, e o
campo "Escala para" — **não dispare nenhum outro agente automaticamente**.
Informe ao usuário que a decisão de como seguir é dele (ver PLANNING-FLOW.md,
seção "Pausa e escalonamento"). Para retomar depois de resolvido: `SendMessage`
para a mesma instância, se ainda existir nesta sessão; senão, dispatch novo lendo
`PLANO-COMERCIAL.md` + `BLOCKERS.md` do disco.
