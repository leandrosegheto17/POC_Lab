---
name: break-even-modeling
description: Monta a conta de break-even — estrutura de custos estimada (desenvolvimento, infraestrutura, aquisição, operação), receita unitária e o total de vendas/assinaturas necessário até pagar os custos, com horizonte de tempo — a Seção 6 do PLANO-COMERCIAL.md. Se a conta não fecha, diz explicitamente e aponta qual variável precisaria mudar. Use depois das Seções 1-3 existirem (preço e CAC são insumos). Do NOT use for orçamento técnico detalhado de infraestrutura (isso é do coordenador/validador) ou para estimativa de esforço de tarefas (isso é do coordenador, effort-estimation).
metadata:
  author: dono
  version: '1.0.0'
---

# Break-even Modeling

Você atua como Dono fechando a conta: **quantas vendas até pagar os custos**. É a
seção onde o plano comercial deixa de ser narrativa e vira aritmética — e onde a
resposta "a conta não fecha" é um resultado válido que vai por escrito, com a
variável que precisaria mudar para fechar.

## Quando é Acionada

- Depois das Seções 1-3 do `PLANO-COMERCIAL.md` existirem — preço (Seção 1) e CAC
  do canal principal (Seção 3) são insumos diretos da conta.
- Em atualização pontual (`/planejar_tarefa`), quando a demanda muda custo
  estrutural, preço ou canal — a conta é refeita, não remendada.

Do NOT use for:
- Dimensionamento técnico de infraestrutura (instâncias, banco, tráfego) — isso é
  o `coordenador` (SDD.md) e o `validador` (DevOps); aqui entra só a estimativa de
  custo mensal como linha da conta.
- Estimar esforço de implementação por tarefa — isso é `effort-estimation`
  (coordenador).

## Inputs Esperados

- Seções 1 e 3 do `PLANO-COMERCIAL.md` (obrigatório) — preço/modelo de receita e
  CAC. Sem eles a conta não tem lado da receita.
- Estimativas de custo (desenvolvimento, infra, operação) — do stakeholder ou
  pesquisadas (`WebSearch` para preços de serviços); cada número com fonte ou
  premissa declarada.

## Core Framework

1. **Custos fixos iniciais**: desenvolvimento até o lançamento (mesmo que seja
   tempo próprio — tempo tem custo declarado), setup de canal (taxas de loja,
   registro), ferramentas.
2. **Custos recorrentes mensais**: infraestrutura, ferramentas/licenças, operação
   (suporte, conteúdo), taxas percentuais do canal (comissão de loja/marketplace
   sai da receita unitária, não da lista de custos — não contar duas vezes).
3. **Receita unitária líquida**: preço − taxas percentuais do canal − custo
   variável por venda (incluindo CAC quando a aquisição é paga).
4. **A conta**: vendas até o break-even = custos fixos acumulados no horizonte ÷
   receita unitária líquida (para assinatura: considerar receita acumulada por
   assinante no horizonte, com premissa de churn declarada).
5. **Horizonte e veredito**: em quanto tempo esse número de vendas é plausível
   dado o SOM (Seção 2) e o canal (Seção 3)? Se implausível, **a conta não fecha**
   — declare e aponte a variável mais sensível (preço? CAC? custo fixo?).

## Workflow

1. Liste custos fixos iniciais e recorrentes mensais, cada linha com fonte ou
   premissa.
2. Calcule a receita unitária líquida a partir da Seção 1 e das taxas da Seção 3.
3. Feche a conta de vendas até o break-even; para assinatura, declare a premissa
   de churn/permanência.
4. Confronte o número com o SOM e o canal — plausível no horizonte? Dê o veredito.
5. Escreva a Seção 6 do `PLANO-COMERCIAL.md` (Break-even), incluindo o veredito e,
   se a conta não fecha, a análise de qual variável mudar.

## Output Esperado

- **Formato**: Seção 6 do `PLANO-COMERCIAL.md` — "Break-even" (tabela de custos,
  receita unitária líquida, número de vendas até o break-even, horizonte,
  veredito: fecha / não fecha + variável mais sensível).
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] Toda linha de custo tem fonte ou premissa declarada (incluindo tempo próprio
      valorado)
- [ ] Receita unitária é líquida (taxas de canal e custo variável descontados, sem
      dupla contagem)
- [ ] Número de vendas até o break-even calculado, com premissa de churn quando o
      modelo é assinatura
- [ ] Veredito explícito: a conta fecha ou não fecha no horizonte, confrontada com
      SOM e canal
- [ ] Se não fecha: a variável mais sensível está apontada, com o valor que a
      faria fechar

### MUST DO
- Usar o mesmo CAC da Seção 3 — se divergir, corrigir lá primeiro, não manter dois
  números.
- Refazer a conta inteira quando preço, canal ou custo mudarem em rodada de
  ajuste — nunca remendar um número isolado.

### MUST NOT DO
- Suavizar um veredito de "não fecha" — o guardrail do `dono` proíbe.
- Zerar o custo de desenvolvimento porque "sou eu que vou fazer" — tempo próprio
  entra valorado, nem que a premissa de valor/hora seja declarada.
