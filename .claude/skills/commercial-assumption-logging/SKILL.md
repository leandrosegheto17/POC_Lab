---
name: commercial-assumption-logging
description: Registra, de forma contínua ao longo de todo o Loop 0, as premissas e riscos comerciais em aberto — cada um com origem (seção do plano), o que precisa ser validado, como validar barato e o que acontece se cair — a Seção 7 do PLANO-COMERCIAL.md, que o Gestor herda como contexto do Gate 1. Use durante todas as demais skills do Dono, sempre que surgir suposição sem evidência. Do NOT use for premissa/risco de produto (isso é assumption-and-risk-logging, do PM) ou para risco técnico/segurança/compliance (isso é risk-and-compliance-check, do gestor).
metadata:
  author: dono
  version: '1.0.0'
---

# Commercial Assumption Logging

Você atua como Dono mantendo o registro vivo das **premissas e riscos comerciais
em aberto**. Toda skill do plano gera suposições sem evidência (disposição a
pagar, presença do ICP no canal, churn, custo); esta skill garante que nenhuma
fique implícita — a Seção 7 é a lista do que ainda pode derrubar o plano, e é o
que o Gestor herda no Gate 1.

## Quando é Acionada

- **Continuamente**, durante todas as outras skills do Dono, dentro do Loop 0 —
  não é um passo final, é um registro que cresce a cada seção escrita.
- Em atualização pontual (`/planejar --tarefa`), quando a demanda cria premissa
  comercial nova ou resolve/derruba uma existente.

Do NOT use for:
- Premissa/risco de produto (adoção de funcionalidade, comportamento de uso) —
  isso é `assumption-and-risk-logging`, do chapéu PM do `gestor`.
- Risco técnico, de segurança ou compliance — isso é `risk-and-compliance-check`
  (gestor) e o `validador`.

## Core Framework

Cada entrada da Seção 7 tem cinco campos:

1. **Premissa/risco** — a afirmação assumida sem evidência, ou o risco comercial
   identificado, em uma frase.
2. **Origem** — qual seção do plano a gerou (1-6), para rastreabilidade.
3. **O que precisa ser validado** — o fato observável que confirmaria ou
   derrubaria.
4. **Como validar barato** — conversa com N clientes potenciais, landing page,
   pesquisa de preço, teste de canal — sempre a opção mais barata que responde.
5. **Impacto se cair** — qual seção do plano quebra e o que acontece com o
   break-even/viabilidade.

Regra de higiene: as premissas críticas da Seção 5 (`viability-hypothesis-scoring`)
aparecem espelhadas aqui; a Seção 7 pode ter mais entradas (as não críticas), mas
nunca menos.

## Workflow

1. Ao escrever qualquer seção do plano, capture na hora toda afirmação sem fonte
   como entrada da Seção 7 — não deixe para o final.
2. Preencha os cinco campos de cada entrada.
3. Quando uma premissa for validada/refutada em rodada posterior do loop, atualize
   a entrada (não apague — marque o desfecho e a evidência), e sinalize qual seção
   do plano precisa de revisão.
4. Antes do fechamento do Loop 0, confira o espelhamento com a Seção 5.

## Output Esperado

- **Formato**: Seção 7 do `PLANO-COMERCIAL.md` — "Premissas e Riscos Comerciais em
  Aberto" (tabela com os cinco campos por entrada, + desfecho quando resolvida).
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] Toda afirmação sem fonte nas Seções 1-6 tem entrada correspondente na
      Seção 7
- [ ] Toda entrada tem os cinco campos preenchidos (nada de "risco: mercado" sem
      validação e impacto)
- [ ] Premissas críticas da Seção 5 estão espelhadas
- [ ] Entradas resolvidas mantêm o desfecho registrado, não são apagadas

### MUST DO
- Sinalizar ao usuário, no resumo da rodada, quando uma entrada nova muda a
  leitura da viabilidade (Seção 5) — o percentual não pode ficar dessincronizado.
- Entregar a Seção 7 como herança explícita ao Gestor no fechamento do Loop 0 — é
  contexto obrigatório do Gate 1.

### MUST NOT DO
- Registrar premissa vaga sem o "como validar barato" — entrada sem caminho de
  validação é só ansiedade documentada.
- Misturar risco técnico ou de produto aqui — cada um tem dono próprio a jusante.
