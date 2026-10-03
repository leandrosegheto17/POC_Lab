---
name: viability-hypothesis-scoring
description: Formula o percentual estimado de chance de a ideia dar certo, sempre derivado de 3-5 premissas explícitas — cada uma com peso, evidência atual e o que a derrubaria — a Seção 5 do PLANO-COMERCIAL.md. Use depois que as Seções 1-4 e a conta de break-even existirem, como penúltimo passo do Loop 0. Do NOT use for risco técnico/segurança/compliance (isso é do gestor via risk-and-compliance-check) ou para a conta de custos em si (use break-even-modeling).
metadata:
  author: dono
  version: '1.0.0'
---

# Viability Hypothesis Scoring

Você atua como Dono respondendo **qual o percentual para dar certo** — mas o
número sozinho não vale nada: o valor está nas premissas explícitas que o
sustentam e no que derrubaria cada uma. Um "70% de chance" sem premissa é
adivinhação com aparência de análise; 40% com premissas testáveis é um plano.

## Quando é Acionada

- Penúltimo passo do Loop 0 de `/avaliar_ideia` (antes de `plano-comercial-drafting`
  consolidar) — precisa das Seções 1-4 e do break-even já rascunhados, porque as
  premissas saem deles.
- Em atualização pontual (`/planejar --tarefa`), quando uma demanda muda uma premissa
  central (preço, canal, custo) e o percentual precisa ser recalculado.

Do NOT use for:
- Risco técnico, de segurança ou compliance — isso é o `gestor`
  (`risk-and-compliance-check`), em nível estratégico, e o `validador`, em nível
  tático.
- Montar a conta de custos/vendas — isso é `break-even-modeling`; esta skill só a
  consome como premissa.

## Inputs Esperados

- Seções 1-4 e 6 do `PLANO-COMERCIAL.md` (obrigatório) — as premissas derivam
  delas; sem as seções anteriores, esta skill não roda.
- Skill `the-fool` (opcional, recomendado quando o plano parece bom demais) —
  pressure-test das premissas antes de fechar o número.

## Core Framework

1. **Extração das premissas críticas (3-5).** As afirmações que, se falsas,
   derrubam o plano. Tipicamente uma por seção: "o ICP paga R$ X" (Seções 1-2),
   "o canal Y alcança o ICP a CAC ≤ Z" (Seção 3), "o diferencial resiste aos
   concorrentes por N meses" (Seção 4), "o custo total fica em W" (Seção 6).
2. **Por premissa**: confiança individual (alta/média/baixa), evidência atual
   (fonte, ou "nenhuma ainda"), **o que a derrubaria** (um fato observável) e como
   validá-la barato (conversa, landing page, pesquisa).
3. **Percentual agregado.** Derivado das confianças individuais — as premissas são
   em série (todas precisam valer), então o agregado é sempre menor ou igual à
   premissa mais fraca, nunca uma média otimista.
4. **Leitura honesta.** Uma frase interpretando o número: o que precisaria ser
   validado primeiro para o percentual subir.

## Workflow

1. Releia as Seções 1-4 e 6 e extraia as 3-5 premissas críticas.
2. Classifique confiança, evidência, derrubador e teste barato de cada uma.
3. (Opcional) Rode `the-fool` sobre as premissas quando o conjunto parecer
   confortável demais.
4. Derive o percentual agregado da lógica em série e escreva a leitura honesta.
5. Escreva a Seção 5 do `PLANO-COMERCIAL.md` (Hipótese de Viabilidade).

## Output Esperado

- **Formato**: Seção 5 do `PLANO-COMERCIAL.md` — "Hipótese de Viabilidade"
  (percentual + tabela de premissas: confiança, evidência, o que derruba, como
  validar + leitura honesta).
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] 3-5 premissas críticas, cada uma rastreável a uma seção do plano
- [ ] Toda premissa tem confiança, evidência (ou "nenhuma"), derrubador observável
      e teste barato de validação
- [ ] Percentual agregado é coerente com a lógica em série (≤ premissa mais fraca)
- [ ] Leitura honesta indica qual premissa validar primeiro

### MUST DO
- Recalcular o percentual quando qualquer seção do plano mudar em rodada de ajuste
  do Loop 0 — o número nunca fica dessincronizado das premissas.
- Espelhar as premissas ainda não validadas na Seção 7 (via
  `commercial-assumption-logging`).

### MUST NOT DO
- Apresentar percentual sem as premissas — o guardrail do `dono` proíbe.
- Usar média das confianças para inflar o agregado quando as premissas são
  dependentes em série.
