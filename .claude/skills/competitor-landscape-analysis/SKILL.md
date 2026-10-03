---
name: competitor-landscape-analysis
description: Mapeia concorrentes diretos e substitutos (incluindo planilha/"não fazer nada" quando forem o substituto real) com preço praticado, pontos fortes/fracos e o diferencial da ideia frente a cada um, usando WebSearch/WebFetch com fonte obrigatória — a Seção 4 do PLANO-COMERCIAL.md. Use dentro do Loop 0 do Dono, idealmente antes de fechar o preço da Seção 1. Do NOT use for decisão build-vs-buy de componente técnico (use build-vs-buy-analysis, do gestor) ou para benchmarking de stack (isso é do coordenador).
metadata:
  author: dono
  version: '1.0.0'
---

# Competitor Landscape Analysis

Você atua como Dono respondendo **quem já vende isso e por quanto**: concorrentes
diretos, indiretos e substitutos, com preço e diferencial. É a seção mais
dependente de pesquisa real do plano inteiro — concorrente inventado ou preço
chutado contamina a âncora de preço, a viabilidade e o break-even de uma vez.

## Quando é Acionada

- Dentro do Loop 0 de `/avaliar_ideia`, idealmente cedo — a Seção 1
  (`value-proposition-and-pricing`) usa o preço de concorrente como âncora e é
  revisada depois desta skill quando a âncora era provisória.
- Em atualização pontual (`/planejar --tarefa`), quando surge concorrente novo
  relevante ou a demanda entra num mercado adjacente.

Do NOT use for:
- Comprar vs. construir um componente técnico — isso é `build-vs-buy-analysis`
  (gestor).
- Comparar tecnologias/frameworks — isso é o `coordenador`
  (`tech-stack-selection`).

## Inputs Esperados

- Ideia bruta + Seções 1-2 do `PLANO-COMERCIAL.md` (obrigatório) — proposta de
  valor e ICP delimitam quem é concorrente de verdade.
- `WebSearch`/`WebFetch` (obrigatório na prática) — preços, planos e posicionamento
  dos concorrentes. Todo dado sem pesquisa é marcado como premissa não verificada.

## Core Framework

1. **Três anéis de concorrência:**
   - **Diretos**: resolvem a mesma dor para o mesmo ICP com solução parecida.
   - **Indiretos**: mesma dor, solução diferente.
   - **Substitutos**: o que o ICP faz hoje sem comprar nada — planilha, WhatsApp,
     funcionário, "não fazer nada". Quando o substituto real é esse, ele entra na
     tabela como o concorrente a bater.
2. **Por concorrente**: nome, preço/plano praticado (com fonte e data da consulta),
   ponto forte, ponto fraco percebido.
3. **Diferencial da ideia frente a cada um** — em uma frase, verificável. "Ser
   melhor" não é diferencial; "cobrar por uso em vez de assinatura" é.
4. **Barreira**: o que impede os concorrentes de copiarem o diferencial rápido? Se
   nada impede, isso é risco declarado (Seção 7), não motivo de silêncio.

## Workflow

1. Pesquise (WebSearch) os players do segmento do ICP; classifique nos três anéis.
2. Para cada relevante (3-7 no total bastam), colete preço/plano com fonte e data.
3. Escreva o diferencial da ideia frente a cada um, e a barreira de cópia.
4. Se o preço praticado no mercado contradisser a âncora da Seção 1, sinalize a
   revisão explicitamente.
5. Escreva a Seção 4 do `PLANO-COMERCIAL.md` (Concorrentes e Diferenciação).

## Output Esperado

- **Formato**: Seção 4 do `PLANO-COMERCIAL.md` — "Concorrentes e Diferenciação"
  (tabela por concorrente: anel, preço com fonte/data, forte/fraco, diferencial;
  + barreira de cópia).
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] Pelo menos os concorrentes diretos óbvios mapeados, e o substituto real
      incluído quando for "planilha/não fazer nada"
- [ ] Todo preço/plano tem fonte (URL/data) ou está marcado como premissa não
      verificada
- [ ] Diferencial frente a cada concorrente é uma frase verificável, não adjetivo
- [ ] Barreira de cópia declarada — ou a ausência dela registrada como risco

### MUST DO
- Usar WebSearch/WebFetch antes de afirmar preço ou posicionamento de concorrente —
  memória de treinamento não é fonte.
- Sinalizar revisão da Seção 1 quando o preço de mercado contradisser a âncora.

### MUST NOT DO
- Declarar "não tem concorrente" sem ter procurado os substitutos — quase sempre o
  concorrente é a planilha.
- Omitir um concorrente forte para o plano parecer melhor.
