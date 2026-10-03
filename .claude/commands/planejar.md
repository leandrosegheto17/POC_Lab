---
description: Aciona o agente Gestor (CTO + PM + Business Analyst) num loop de refinamento (Loop A) para produzir Gate 1 + PRD.md + PRD-TECNICO.md a partir de uma ideia inicial — rodada 1 é dispatch novo, rodadas seguintes continuam a mesma instância via SendMessage até você aprovar. Não encadeia para /definir sozinho. Com --tarefa, roda em vez disso o ciclo pontual completo de uma única demanda (Dono → Gestor → Coordenador → Executor → Validador, só do recorte criado, sem /deploy), pausando a cada troca de agente.
argument-hint: [ideia inicial | --tarefa <descrição da demanda pontual>]
---

# Comando `/planejar` — Gestor, Loop A

A lógica deste comando está definida em `.claude/PLANNING-FLOW.md` (Comando 1,
inclusive a seção "Mecânica de loop de refinamento") — leia esse arquivo agora,
antes de fazer qualquer outra coisa, se ainda não o tiver em contexto. Ele por sua
vez assume o que está declarado em `.claude/agents/gestor.md` e em
`PIPELINE-CONVENTIONS.md`.

Você não está entrando em um modo de orquestração autônoma — **o usuário é o
orquestrador**. Este comando roda um **loop de refinamento** (Loop A) com o
Gestor: dispatch inicial, depois rodadas de ajuste continuando a mesma instância
via `SendMessage`, até você aprovar. A avaliação comercial da ideia é etapa
anterior a este comando: o `/avaliar_ideia` (Loop 0, Dono) produz o
`PLANO-COMERCIAL.md` que este comando consome como entrada do Gate 1. Não dispara
`/definir` nem qualquer outro comando por conta própria.

Argumento recebido (pode estar vazio): $ARGUMENTS

## 0. Modo de execução

- **Sem `--tarefa`** (ideia inicial em linguagem natural, ou vazio): projeto
  inteiro — siga as Seções 1 a 4 abaixo (Loop A). `$ARGUMENTS` é a ideia inicial.
- **`--tarefa <descrição>`** (ex.: `/planejar --tarefa adicionar filtro por
  status na agenda`): **demanda pontual** — siga **só** o "Modo `--tarefa`" no fim
  deste arquivo (Seções T0 a T8) e ignore as Seções 1 a 4. O texto depois de
  `--tarefa` é a demanda; se vier vazio, a Seção T1 pergunta.

## 1. Determinar o ponto de retomada

Nunca presuma que está começando do zero:

1. Verifique o que já existe em `.md/`: `PLANO-COMERCIAL.md`, `PRD.md`, `PRD-TECNICO.md`,
   `CTO-REVIEW.md`.
2. **Loop A desta mesma sessão ainda aberto** (você tem a instância do Gestor
   viva, sem aprovação registrada ainda): continue via `SendMessage` — vá direto
   para a Seção 2b, não dispare um agente novo.
3. Se `PRD.md`/`PRD-TECNICO.md` já existem, o Loop A já fechou (aprovado
   anteriormente) e `$ARGUMENTS` está vazio: interprete como pedido de
   revisão/status do que já foi produzido, não como reinício.
4. Se `$ARGUMENTS` tem conteúdo e já existe `PRD.md`/`PRD-TECNICO.md` aprovado:
   interprete como reabertura pontual (sempre dispatch novo, lendo o que existe do
   disco) — a menos que o texto deixe claro que é uma ideia nova/diferente, caso
   em que confirme com o usuário antes de sobrescrever.
5. **`PLANO-COMERCIAL.md` não existe** (e o Loop A ainda não começou): **pare** e
   recomende rodar `/avaliar_ideia` primeiro — a avaliação comercial da ideia
   (Loop 0, Dono) é a etapa anterior a este comando. Se o usuário disser
   explicitamente que quer seguir sem o plano comercial, prossiga para a Seção 2
   registrando a ausência (o Gestor a anota como ressalva no Gate 1).
6. Se nada existe em `.md/` e `$ARGUMENTS` está vazio: pare e peça a ideia inicial
   em linguagem natural (e recomende `/avaliar_ideia` como primeiro passo) antes
   de prosseguir.

## 2. Loop com o Gestor

### 2a. Rodada inicial (dispatch novo)

1. **Anuncie** que vai acionar o Gestor para produzir Gate 1 + um rascunho de
   PRD.md + PRD-TECNICO.md.
2. **Dispare o agente** via `Agent` (`subagent_type: gestor`,
   `run_in_background: false`). O prompt de dispatch: a ideia inicial, o
   `PLANO-COMERCIAL.md` aprovado no `/avaliar_ideia` (aponte o caminho
   `.md/PLANO-COMERCIAL.md` como insumo do Gate 1 — ou informe explicitamente que
   o usuário seguiu sem ele) e o que já existe em `.md/` como contexto — não repita a definição do agente, ele já a
   tem.
3. Se o Gate 1 (chapéu CTO, dentro do próprio dispatch) reprovar: o Gestor não
   produz PRD.md/PRD-TECNICO.md nesta chamada — só o veredito do Gate 1 e o
   motivo. Não há loop para continuar ainda; o usuário ajusta o briefing e a
   próxima chamada é sempre um dispatch novo (volte para a Seção 1).
4. Se o Gate 1 aprovar (com ou sem ressalvas): o mesmo dispatch já produz o
   rascunho de PRD.md + PRD-TECNICO.md (rodada 1 do loop) — trate como rascunho,
   não resultado final.

### 2b. Rodadas seguintes (mesma instância, via `SendMessage`)

Enquanto o usuário pedir ajuste em vez de aprovar: continue a **mesma instância**
do Gestor via `SendMessage` (nunca um dispatch novo) com o feedback recebido. Sem
teto de rodadas — diferente do fix-loop de 2 tentativas da fase de execução, este
é sobre completude/alinhamento, não corretude verificável. Cada rodada reescreve
`PRD.md`/`PRD-TECNICO.md` no disco (não só na aprovação final).

Se o usuário pedir para descartar tudo e recomeçar: a próxima rodada é um
dispatch novo (volte para 2a).

### 2c. Encerramento do loop

Só fecha na aprovação explícita do usuário sobre `PRD.md` + `PRD-TECNICO.md`
juntos.

## 3. Apresentar o resultado (a cada rodada)

Ao final de **cada** rodada (não só uma vez ao final do comando), apresente um
resumo objetivo (não os documentos inteiros):

- Veredito do Gate 1 (Aprovado / Aprovado com ressalvas / Reprovado) e o porquê
  (só na rodada inicial).
- Pontos principais do rascunho atual do `PRD.md` (problema, público-alvo,
  objetivo de sucesso, escopo) e do `PRD-TECNICO.md` (requisitos funcionais
  principais, regras de negócio, dependências/integrações relevantes).
- O checklist "Critérios de Pronto" do `gestor.md` para cada artefato.

**Pare aqui.** Termine a resposta aguardando a decisão do usuário: aprovar
(informando que o próximo passo disponível é `/definir` — o Loop A está
fechado), pedir ajuste (mais uma rodada, Seção 2b), ou descartar e recomeçar
(Seção 2a).

## 4. Bloqueio

Se o dispatch gerar uma entrada em `.md/BLOCKERS.md` (`Aberto`): o Loop A
**suspende** (não descarta) e o comando pára — explique quem reportou, o quê, e o
campo "Escala para" — **não dispare nenhum outro agente automaticamente**.
Informe ao usuário que a decisão de como seguir é dele (ver PLANNING-FLOW.md,
seção "Pausa e escalonamento"). Para retomar depois de resolvido: `SendMessage`
para a mesma instância, se ainda existir nesta sessão; senão, dispatch novo lendo
`PRD.md`/`PRD-TECNICO.md` + `BLOCKERS.md` do disco.

---

# Modo `--tarefa` — ciclo pontual completo (Dono → Gestor → Coordenador → Executor → Validador)

Este modo é uma **variação deliberada** da regra geral de que cada fase do
pipeline é um comando separado que o usuário aciona manualmente
(`PIPELINE-CONVENTIONS.md`, `PLANNING-FLOW.md`, `EXECUTION-FLOW.md`). Ele existe
para uma situação específica: uma **demanda pontual** — uma funcionalidade, ajuste
ou correção isolada, não uma revisão do projeto inteiro — que o usuário quer ver
sair do planejamento até implementada e validada sem precisar digitar
`/planejar`, `/definir`, `/organizar` e `/executar` à mão em sequência.

Ele reaproveita a mecânica já definida em `.claude/PLANNING-FLOW.md` (loops de
refinamento com Dono/Gestor/Coordenador) e `.claude/EXECUTION-FLOW.md` (rodada paralela
do Executor, validação do Validador) — leia os dois agora, junto com
`.claude/agents/dono.md`, `.claude/agents/gestor.md`, `.claude/agents/coordenador.md`,
`.claude/agents/executor.md`, `.claude/agents/validador.md` e
`PIPELINE-CONVENTIONS.md`, se ainda não os tiver em contexto.

**Nada aqui encadeia sozinho.** Além das paradas de sempre (cada rodada de loop,
cada ponto de parada obrigatório de execução/validação), este modo para
**também a cada troca de agente** — Dono → Gestor, Gestor → Coordenador e
Coordenador → Executor — e pergunta explicitamente ao usuário se pode prosseguir
para o próximo. É sempre uma pergunta explícita, nunca uma suposição, e a decisão
é sempre do usuário: seguir agora, seguir mais tarde (numa nova chamada deste
mesmo modo, retomando pela Seção T2), ou parar de vez neste ponto.

Demanda recebida (o que vier depois de `--tarefa`; pode estar vazia): $ARGUMENTS

## T0. Escopo deste modo

- **Sempre uma demanda por chamada.** Se `$ARGUMENTS` descrever mais de uma
  demanda claramente independente, informe ao usuário que o recomendado é rodar o
  comando uma vez por demanda (cada uma vira seu próprio lote, validado
  separadamente) e pergunte se quer prosseguir tratando tudo como uma coisa só ou
  quer separar.
- **Não substitui `/planejar` (sem `--tarefa`) + `/definir` para o projeto inteiro.** Se
  não existir nenhum `PRD.md`/`PRD-TECNICO.md` ainda (projeto do zero), este
  comando ainda funciona, mas o Gestor vai produzir um `PRD.md`/`PRD-TECNICO.md`
  enxuto, escopado só a esta demanda (não um levantamento amplo de produto) — se o
  usuário quer um planejamento de projeto completo, informe que `/planejar` sem `--tarefa` é o
  comando adequado em vez deste modo.
- **Não redecompõe o `TASK.md` inteiro.** O Coordenador só acrescenta um lote novo
  (ou uma tarefa a um lote já `Não iniciado` compatível, se fizer sentido claro),
  nunca reabre lotes já `Validado`/`Em andamento` por conta desta demanda.
- **Termina no lote validado, nunca em `/deploy`.** Publicar em produção continua
  sendo decisão explícita do usuário — este modo nunca dispara `/deploy`.

## T1. Obter a descrição da demanda

Se `$ARGUMENTS` vier vazio: **pare aqui** e pergunte ao usuário qual é a demanda
pontual que ele quer planejar (funcionalidade, ajuste, correção — o que for). Não
prossiga sem uma descrição, mesmo que exista `PRD.md`/`TASK.md` no projeto — este
comando nunca adivinha a demanda a partir do estado do projeto.

## T2. Determinar o ponto de retomada (nesta sessão)

Antes de disparar qualquer agente, cheque se algum estágio deste mesmo ciclo já
está em andamento nesta sessão de trabalho:

1. **Loop do Dono (Seção T2b) já aberto** (instância viva, sem aprovação da
   atualização do `PLANO-COMERCIAL.md`): continue via `SendMessage` na Seção T2b.
2. **Loop do Dono fechado (ou pulado), aguardando confirmação para acionar o
   Gestor**: se o usuário confirmou, vá para a rodada inicial da Seção T3.
3. **Loop do Gestor (Seção T3) já aberto** (instância viva, sem aprovação
   registrada): continue via `SendMessage`, direto na rodada seguinte da Seção T3.
4. **Loop do Gestor fechado, aguardando confirmação para acionar o Coordenador**:
   é essa confirmação que esta chamada está respondendo — se o usuário confirmou,
   vá para a rodada inicial da Seção T4.
5. **Loop do Coordenador (Seção T4) aberto**: continue via `SendMessage` na Seção T4.
6. **Loop do Coordenador fechado, aguardando confirmação para acionar a
   execução**: se o usuário confirmou, vá para a Seção T5.
7. **Execução (Seção T5) em andamento, ainda não concluída**: retome a fila de
   tarefas do lote criado na Seção T4, a partir de onde parou.
8. **Execução e validação concluídas**: vá para a Seção T6.
9. **Nada em andamento**: comece do zero pela Seção T2b.

Se a sessão anterior se perdeu (limitação técnica de `SendMessage` entre
sessões — ver `PLANNING-FLOW.md`), releia do disco o que já existe
(`PRD.md`/`PRD-TECNICO.md`/`SDD.md`/`UX-SPEC.md`/`TASK.md`) e identifique o ponto
de retomada pelo estado desses artefatos em vez de depender de memória de
conversa.

## T2b. Loop com o Dono — impacto comercial da demanda

Roda **antes** do Gestor, mas escopado à demanda, não ao projeto inteiro:

1. **Triagem** (skill `commercial-impact-triage`, aplicada pelo orquestrador —
   sem dispatch): se a demanda claramente **não tem impacto comercial** (correção
   de bug, refatoração, ajuste interno sem efeito em preço/público/canal/custo
   relevante), informe isso ao usuário em uma frase e **pule direto para a
   pergunta de troca de agente** ("Sem impacto comercial — posso acionar o Gestor
   direto?"). Não dispare o Dono à toa. Na dúvida, dispare — com o recorte de
   seções que a triagem apontou.
2. Se há (ou pode haver) impacto comercial — nova funcionalidade vendável, nova
   cobrança, novo canal, novo público, mudança de custo estrutural: **anuncie**
   que vai acionar o Dono para avaliar o impacto no `PLANO-COMERCIAL.md`.
3. **Dispatch novo** (`Agent`, `subagent_type: dono`, `run_in_background: false`).
   Prompt: a descrição da demanda + o `PLANO-COMERCIAL.md` existente (se houver)
   como contexto, deixando claro que é uma **atualização/adição pontual** ao
   plano (a seção afetada — preço, canal, break-even, premissa), não uma
   reescrita do zero — a menos que nada exista ainda, caso em que o Dono produz
   uma versão enxuta, escopada só ao que esta demanda toca.
4. **Rodadas seguintes**: `SendMessage` para a mesma instância, sem teto, até
   aprovação explícita. "Descartar e recomeçar" → dispatch novo.
5. **Pare ao final de cada rodada** com o resumo objetivo do que mudou no plano
   comercial (e o checklist "Critérios de Pronto" do `dono.md` restrito às seções
   tocadas) e as três opções (aprovar / ajustar / descartar e recomeçar). Se o
   Dono apontar que a demanda **piora a conta** (quebra o break-even, canibaliza
   preço), destaque — a decisão de seguir é do usuário.
6. **Bloqueio**: ver Seção T8.

**Troca de agente**: quando o usuário aprovar a atualização (ou a triagem do
passo 1 dispensar o Dono), **não dispare o Gestor na mesma resposta** — pergunte
explicitamente se pode prosseguir para a Seção T3 (ex.: "Plano comercial
atualizado. Posso acionar o Gestor para refinar a demanda?"). Só dispare o
dispatch da Seção T3 depois que o usuário confirmar.

## T3. Loop com o Gestor — refinar a demanda

Mesma mecânica do Loop A de `/planejar` (`PLANNING-FLOW.md`, Comando 1), mas
escopada à demanda, não ao projeto inteiro:

1. **Anuncie** que vai acionar o Gestor para refinar esta demanda pontual.
2. **Dispatch novo** (`Agent`, `subagent_type: gestor`, `run_in_background: false`)
   na rodada inicial. Prompt: a descrição da demanda + o que já existe em `.md/`
   (`PRD.md`, `PRD-TECNICO.md`, `GUARDRAILS.md`) como contexto, deixando claro que
   é uma **atualização/adição pontual** a esses documentos (uma seção nova ou um
   requisito adicional), não uma reescrita do zero — a menos que nada exista
   ainda, caso em que o Gestor produz uma versão enxuta, escopada só a esta
   demanda.
3. Gate 1 reprovar: sem loop para continuar — reporte o veredito e o motivo, e a
   próxima chamada deste modo é sempre um dispatch novo com a demanda ajustada.
4. Gate 1 aprovar (com ou sem ressalvas): mesmo dispatch já produz o rascunho
   (rodada 1) do recorte em `PRD.md`/`PRD-TECNICO.md`.
5. **Rodadas seguintes**: `SendMessage` para a mesma instância com o feedback do
   usuário, sem teto, até aprovação explícita. "Descartar e recomeçar" → próxima
   rodada é dispatch novo.
6. **Bloqueio**: ver Seção T8.

**Pare ao final de cada rodada** com o resumo de sempre (veredito do Gate 1 só na
rodada inicial, pontos principais do recorte de `PRD.md`/`PRD-TECNICO.md`,
checklist "Critérios de Pronto" do `gestor.md`) e as três opções (aprovar / ajustar
/ descartar e recomeçar).

**Troca de agente**: quando o usuário aprovar (fechando o loop do Gestor), **não
dispare o Coordenador na mesma resposta** — pergunte explicitamente se pode
prosseguir para a Seção T4 (ex.: "Gestor aprovado. Posso acionar o Coordenador para
detalhar e anexar as tarefas ao TASK.md?"). Só dispare o dispatch novo da Seção T4
depois que o usuário confirmar, nesta mesma chamada ou numa chamada seguinte deste
comando.

## T4. Loop com o Coordenador — detalhar e anexar as tarefas

Só começa depois que a Seção T3 fechar. Mesma mecânica de loop de
`/definir` (`PLANNING-FLOW.md`, Comando 2), mas condensada num loop só
(não Loop B/C separados) e escopada à adição, não à redecomposição do projeto:

1. **Anuncie** que vai acionar o Coordenador para detalhar esta demanda e anexar
   as tarefas correspondentes ao `TASK.md`.
2. **Dispatch novo** (`Agent`, `subagent_type: coordenador`,
   `run_in_background: false`). Prompt: aponte o recorte de
   `PRD.md`/`PRD-TECNICO.md` recém-aprovado e o `SDD.md`/`UX-SPEC.md`/`TASK.md`/
   `GUARDRAILS.md` já existentes (se houver), pedindo:
   - atualização do `SDD.md`/`UX-SPEC.md` **só nos pontos que esta demanda exige**
     (novo endpoint, nova tela, novo estado — não uma revisão arquitetural
     inteira), com ADR novo se alguma decisão estrutural nova for necessária;
   - decomposição da demanda em tarefas pequenas (mesmas regras de granularidade
     de `coordenador.md`: ~1 dia-pessoa, sem misturar tela/endpoint/regra/SQL,
     canário de ~300 mil tokens), anexadas como um **lote novo** na Seção 3 do
     `TASK.md` (ou tarefa a um lote `Não iniciado` compatível, só se o próprio
     Coordenador indicar que faz sentido), com a Seção 4 marcando
     dependências/paralelismo;
   - rascunho de atualização do `GUARDRAILS.md`, só se esta demanda introduzir
     regra nova.
3. **Autocheck de granularidade** antes de apresentar (igual ao Loop C de
   `/definir`): já re-divida o que violar as regras, e aponte no resumo
   o que foi dividido e por quê.
4. Se o Coordenador sinalizar que a demanda tem efeito cascata sobre lotes já
   `Validado`/`Em andamento` (não é uma adição isolada): **pare** e reporte ao
   usuário antes de prosseguir — não é mais uma reabertura pontual simples, e a
   decisão de como tratar é dele (pode envolver rodar `/definir`
   separadamente para o impacto maior).
5. **Rodadas seguintes**: `SendMessage` para a mesma instância, sem teto, até
   aprovação. "Descartar e recomeçar" → dispatch novo.
6. **Bloqueio**: ver Seção T8.

**Fechamento do loop**: só quando o usuário aprovar o lote novo (tarefas + Seção 4
+ rascunho de `GUARDRAILS.md`, se houver).

**Aprovação de `GUARDRAILS.md`** (só se o Coordenador propôs mudança): dispatch
único do `gestor` (`subagent_type: gestor`, `run_in_background: false`), só a
skill `guardrails-governance`, igual ao passo final de `/definir`. Se não
houve proposta de mudança, pule este passo.

Apresente o mesmo resumo de sempre a cada rodada (pontos principais do que foi
detalhado, contagem de tarefas do lote novo, paralelismo dentro dele, checklist
"Critérios de Pronto" do `coordenador.md`) e as três opções.

**Troca de agente**: quando o usuário aprovar o lote novo (e, se aplicável, o
Gestor validar o `GUARDRAILS.md`), **não dispare o Executor na mesma resposta** —
pergunte explicitamente se pode prosseguir para a execução (ex.: "Lote X aprovado,
N tarefas, M paralelizáveis. Posso começar a execução?"). Só dispare os dispatches
da Seção T5 depois da confirmação, nesta mesma chamada ou numa chamada seguinte.

## T5. Execução e validação do lote criado

Depois da confirmação do usuário ao final da Seção T4:

1. **Planos por tarefa**: gere os `.md/.taskplan/<ID>.md` das tarefas do lote novo
   seguindo a Seção 2 de `.claude/commands/organizar.md` (um `executor` por lote,
   só o lote criado na Seção T4).
2. **Ciclo por tarefa**: aplique a mecânica do Comando 1 (`/executar`) em
   `EXECUTION-FLOW.md` — Executor → QA → DevSecOps, uma tarefa por vez, achado
   crítico devolvendo à execução (máx. 2 devoluções), achado não crítico virando
   tarefa `RTP-0000` em `Refatoração Lote-X` (com linha no `TASK.md` e arquivo em
   `.md/.taskplan/`) — escopada **só ao lote criado na Seção T4** (nunca a outro lote
   do `TASK.md`), na ordem das dependências (Seção 4 do `TASK.md`).
3. **Pausa obrigatória** (idêntica ao `/executar`): 3ª devolução na mesma tarefa,
   desvio grande de escopo, canário de contexto, ou lacuna/inconsistência no
   `UX-SPEC.md`/`SDD.md` — **pare o modo aqui**: `Bloqueada` + `BLOCKERS.md`,
   explique o que houve e pergunte como seguir.

## T6. Fechamento do lote

Quando todas as tarefas do lote novo estiverem com `QA ✔ · Sec ✔` (as tarefas de
`Refatoração Lote-X` criadas no ciclo não bloqueiam o fechamento deste lote, mas
entram no resumo): o lote está pronto para `/deploy`. Não há checagem estrutural
separada.

## T7. Encerramento do ciclo de implementação pontual

Apresente o resumo fim a fim desta demanda, do início ao fim:

- O que mudou em `PLANO-COMERCIAL.md` (ou que a triagem comercial dispensou o
  Dono, e por quê).
- O que foi refinado em `PRD.md`/`PRD-TECNICO.md`.
- O que foi atualizado em `SDD.md`/`UX-SPEC.md` (e ADRs novos, se houver).
- O lote novo criado no `TASK.md`: nome/identificador, quantas tarefas, quantas
  paralelizáveis.
- Resultado da execução e da validação por tarefa (veredito QA, veredito
  DevSecOps, devoluções, divisões e tarefas `RTP-` criadas em `Refatoração
  Lote-X`, se houver).
- Veredito de `GUARDRAILS.md`, se o Coordenador propôs mudança.

Informe que o ciclo desta demanda está fechado e que o próximo passo disponível é
`/deploy`, se o usuário quiser publicar — **este modo nunca aciona `/deploy`
sozinho.** Pare aqui.

## T8. Bloqueio (em qualquer seção)

Se qualquer agente sinalizar bloqueio (relatório próprio ou nova entrada `Aberto`
em `.md/BLOCKERS.md`), em qualquer seção acima: **pare imediatamente**, explique
quem reportou, o quê, e o campo "Escala para" — **não dispare nenhum outro agente
automaticamente**, nem avance para a próxima seção. A decisão de como seguir é do
usuário (retomar o loop/execução suspenso depois de resolvido, ou ajustar
manualmente). Para retomar: `SendMessage` para a instância aberta, se ainda existir
nesta sessão; senão, dispatch novo lendo os artefatos afetados + `BLOCKERS.md` do
disco, a partir do ponto de retomada da Seção T2.
