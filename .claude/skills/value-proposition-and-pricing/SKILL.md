---
name: value-proposition-and-pricing
description: Define a proposta de valor em uma frase, o modelo de receita (venda única, assinatura, freemium, comissão, anúncio) e a hipótese de preço com âncora declarada (concorrente, custo ou valor percebido) — a Seção 1 do PLANO-COMERCIAL.md. Use no início do trabalho do Dono, sobre a ideia bruta, antes de dimensionar mercado ou canal. Do NOT use for definir funcionalidade/escopo de produto (isso é do gestor) ou para a conta de break-even (use break-even-modeling).
metadata:
  author: dono
  version: '1.0.0'
---

# Value Proposition and Pricing

Você atua como Dono definindo **como vender** a ideia: qual valor ela promete, por
qual modelo de receita esse valor é cobrado e a que preço. Se esta seção estiver
frouxa, todo o resto do plano comercial (mercado, canal, break-even) herda o erro —
não existe conta de viabilidade sem um preço com justificativa.

## Quando é Acionada

- Primeiro passo do Dono sobre uma ideia bruta, dentro do Loop 0 de `/avaliar_ideia` —
  antes de `icp-and-market-sizing` e das demais skills do plano.
- Em atualização pontual (`/planejar --tarefa`), quando a demanda mexe em
  preço/modelo de cobrança.

Do NOT use for:
- Definir o que o produto faz (funcionalidade, escopo) — isso é o `gestor`, depois.
- Calcular quantas vendas pagam os custos — isso é `break-even-modeling`.

## Inputs Esperados

- Ideia bruta do stakeholder (obrigatório) — sem ela não há o que precificar.
- Seção 4 do `PLANO-COMERCIAL.md` (Concorrentes), se já existir — preço de
  concorrente é a âncora mais forte; se ainda não existir, registre a âncora como
  provisória e revise após `competitor-landscape-analysis`.

## Core Framework

1. **Proposta de valor em uma frase.** Formato: "Para [público], [nome/ideia]
   resolve [dor] entregando [benefício], diferente de [alternativa atual]". Se não
   couber numa frase, ainda não está entendida.
2. **Modelo de receita.** Escolha e justifique um: venda única, assinatura
   (mensal/anual), freemium com conversão paga, comissão por transação, anúncio,
   licenciamento. A justificativa cita o comportamento de compra do público, não a
   preferência do stakeholder.
3. **Hipótese de preço com âncora.** Todo preço declara de onde veio:
   - **Âncora em concorrente**: preço praticado no mercado ± diferencial.
   - **Âncora em custo**: custo unitário + margem alvo.
   - **Âncora em valor percebido**: quanto a dor custa hoje para o público
     (tempo/dinheiro) e que fração disso o preço captura.
4. **Teste de coerência.** O modelo e o preço conversam com a ideia? (Ex.:
   assinatura pressupõe uso recorrente; comissão pressupõe transação intermediada.)

## Workflow

1. Extraia da ideia bruta a dor, o benefício e a alternativa atual — escreva a
   frase de proposta de valor.
2. Liste 2-3 modelos de receita plausíveis, escolha um e registre por que os
   outros perderam.
3. Formule a hipótese de preço com a âncora declarada; se a âncora depender de
   dado de concorrente ainda não pesquisado, marque como provisória.
4. Escreva a Seção 1 do `PLANO-COMERCIAL.md` (Proposta de Valor e Modelo de Venda).

## Output Esperado

- **Formato**: Seção 1 do `PLANO-COMERCIAL.md` — "Proposta de Valor e Modelo de
  Venda" (frase de valor + modelo de receita justificado + preço com âncora).
- **Onde salva**: `.md/PLANO-COMERCIAL.md` (cria o arquivo se ainda não existir; as
  demais skills do Dono completam as seções seguintes).

## Critério de Aceite

- [ ] Proposta de valor cabe em uma frase no formato definido
- [ ] Modelo de receita escolhido com justificativa baseada em comportamento de
      compra, e alternativas descartadas registradas
- [ ] Preço tem âncora explícita (concorrente, custo ou valor percebido) — ou está
      marcado como provisório aguardando a análise de concorrentes
- [ ] Modelo e preço são coerentes com a natureza da ideia

### MUST DO
- Revisar o preço depois que `competitor-landscape-analysis` rodar, se a âncora era
  provisória.
- Registrar como premissa (Seção 7, via `commercial-assumption-logging`) qualquer
  suposição de disposição a pagar ainda não validada.

### MUST NOT DO
- Declarar preço sem âncora — "cobrar R$ 29,90 porque parece razoável" não passa.
- Escolher modelo de receita por preferência do stakeholder sem confrontar com o
  comportamento de compra do público.
