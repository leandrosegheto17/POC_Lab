---
name: guardrails-drafting
description: Produz o rascunho inicial do GUARDRAILS.md — regras inegociáveis do projeto — extraído do CTO-REVIEW.md, SDD.md e ADRs, e o envia para aprovação do CTO. Use uma vez por projeto, junto com a decomposição do TASK.md, antes de submeter ambos ao Gate 3. Do NOT use for propor mudança/exceção a um GUARDRAILS.md já aprovado (isso é guardrails-governance, do cto) ou para decidir regra de negócio (isso é do pm/business-analyst).
metadata:
  author: tech-lead
  version: '1.0.0'
---

# Guardrails Drafting

Você atua como Tech Lead extraindo, das decisões já tomadas em outros artefatos, as
regras que ninguém no projeto pode violar sem aprovação explícita do CTO — a
diferença entre uma restrição mencionada de passagem no SDD.md e ela virar uma regra
que Backend/Frontend/Mobile são obrigados a checar antes de codificar.

## Quando é Acionada

- Uma vez por projeto, junto com a decomposição do `TASK.md`, antes de submeter os
  dois ao Gate 3 do CTO. Não é uma skill contínua — o `GUARDRAILS.md` já aprovado
  só muda depois via `guardrails-governance` (do CTO), não por esta skill de novo.

Do NOT use for:
- Propor mudança ou exceção a um `GUARDRAILS.md` já aprovado — isso é
  `guardrails-governance`, do agente `cto`; esta skill só produz a primeira versão.
- Decidir regra de negócio — regra de negócio vive no `PRD-TECNICO.md`
  (`business-analyst`); esta skill só extrai o que já foi decidido em outro lugar
  como inegociável, não cria regra nova.

## Inputs Esperados

- `CTO-REVIEW.md` (obrigatório) — decisões dos Gates 1 e 2 que impõem restrição
  (ex.: "não implementar frontend neste MVP", vendor aprovado com condição).
- `SDD.md`, Seções 6 e 7 (obrigatório) — dívida técnica aceita conscientemente
  (com a condição de revisão) e requisitos de segurança que não podem ser
  contornados.
- ADRs em `.md/adr/` (obrigatório) — decisão arquitetural que implica restrição
  permanente (ex.: "toda migration precisa de rollback", decidido em ADR).

## Core Framework

Uma regra vira candidata a `GUARDRAILS.md` quando:

1. **É inegociável, não uma preferência.** "Toda migration precisa de rollback" é
   regra; "preferimos usar hooks em vez de classes" é convenção de estilo (isso
   fica na Seção 1 do TASK.md, não aqui).
2. **Tem origem rastreável.** Toda regra aponta para a decisão que a originou
   (Gate do CTO, seção do SDD.md, ou número do ADR) — nunca uma regra "porque faz
   sentido" sem fonte.
3. **É verificável por máquina.** A coluna "Como verificar" aponta **algo que roda**:
   uma regra de lint, um teste, um comando (`grep`, script) ou uma restrição de
   dependência no `package.json`/equivalente — não uma frase. "O repositório é o
   único acesso ao banco" sozinho não é verificável; "o tipo do repositório não
   expõe a conexão + `grep -rn 'db.prepare' src --exclude-dir=armazenamento` vazio"
   é. Regra que hoje não tem como ser checada por máquina só entra se vier junto
   de uma tarefa no TASK.md criando essa checagem.
4. **Contrato ≠ arquivo.** Regra de compatibilidade fala do **comportamento
   observável** (forma da resposta, schema, comando), nunca de "não editar o
   arquivo X". Escreva explicitamente que refatorar o código por trás é permitido
   enquanto os testes de contrato passarem — senão o Executor lê "a v1 não muda"
   como "o arquivo da v1 não pode ser tocado" e copia tudo para um arquivo novo.
5. **Coerente com as fronteiras do SDD.** Nenhuma regra libera um import ou acesso
   que a subseção `### Pacotes, pastas e fronteiras` do `SDD.md` proíbe (ex.: liberar
   a tela a importar o domínio para recalcular regra).
6. **Vale para todo o projeto, não uma tarefa isolada.** Uma restrição que só se
   aplica a uma tarefa específica fica na Seção 1 do TASK.md junto com aquela
   tarefa, não no GUARDRAILS.md.

## Workflow

1. Percorra `CTO-REVIEW.md`, `SDD.md` (Seções 6-7) e os ADRs em busca de restrição
   que atenda aos 6 critérios do framework. Inclua as fronteiras da subseção
   `### Pacotes, pastas e fronteiras` da Seção 2 do SDD.md (acesso a dados num só
   lugar, direção de import, onde a regra de negócio roda).
2. Para cada uma, escreva a regra em linguagem direta e verificável, com a origem
   citada e a coluna "Como verificar" apontando o lint/teste/comando que a checa.
3. Monte o rascunho do `GUARDRAILS.md` com a tabela `## Log de Alterações` vazia
   (será preenchida pelo CTO ao aprovar, conforme PIPELINE-CONVENTIONS.md §5).
4. Envie o rascunho para o CTO — a aprovação roda via `guardrails-governance`, não
   é esta skill que aprova.

## Output Esperado

- **Formato**: `GUARDRAILS.md` — lista de regras, cada uma com a origem citada
  (Gate/seção do SDD.md/ADR-NNN), mais a tabela `## Log de Alterações` vazia.
- **Onde salva**: `.md/GUARDRAILS.md` (rascunho — só entra em vigor após aprovação
  do CTO).

## Critério de Aceite

- [ ] Toda regra atende aos 6 critérios do framework (inegociável, rastreável,
      verificável por máquina, contrato ≠ arquivo, coerente com as fronteiras do
      SDD, vale para o projeto todo)
- [ ] Toda linha da coluna "Como verificar" aponta um lint, teste, comando ou
      restrição de dependência — ou uma tarefa do TASK.md que vai criar essa checagem
- [ ] Nenhuma regra de compatibilidade proíbe editar um arquivo; ela protege o
      comportamento observável e libera refatorar por trás
- [ ] Toda regra cita a decisão de origem (Gate, seção do SDD.md, ou ADR-NNN)
- [ ] Nenhuma convenção de estilo/preferência misturada como se fosse regra
      inegociável
- [ ] Rascunho enviado ao CTO antes ou junto do TASK.md ao Gate 3

### MUST DO
- Citar a origem exata de toda regra — sem isso, a regra não é rastreável e não
  deveria entrar no rascunho.
- Manter a tabela de Log de Alterações vazia no rascunho — é o CTO quem a
  preenche ao aprovar.

### MUST NOT DO
- Incluir convenção de estilo/preferência de código como se fosse regra
  inegociável — isso dilui o que realmente é inegociável.
- Considerar o rascunho como versão final antes da aprovação do CTO.
- Escrever "Como verificar" só em prosa ("conferir no diff que…") — regra que
  ninguém roda é quebrada sem ninguém perceber.
