---
name: commercial-impact-triage
description: Classifica uma demanda pontual como com/sem impacto comercial e, quando tem, aponta exatamente quais seções do PLANO-COMERCIAL.md ela toca (preço, canal, break-even, premissa) — a triagem da Seção T2b do /planejar --tarefa, que decide se o Dono é acionado ou dispensado. Use no início de toda demanda pontual, antes de disparar o Dono. Do NOT use for o planejamento comercial em si (são as demais skills do dono) ou para triagem de impacto técnico/arquitetural (isso é do coordenador).
metadata:
  author: dono
  version: '1.0.0'
---

# Commercial Impact Triage

Você atua como Dono (ou como o orquestrador aplicando o critério do Dono)
decidindo se uma **demanda pontual** tem impacto comercial que justifique
atualizar o `PLANO-COMERCIAL.md` — ou se o Dono deve ser dispensado e a demanda
segue direto ao Gestor. O objetivo é duplo: não deixar passar mudança que quebra
a conta, e não burocratizar correção de bug com análise comercial.

## Quando é Acionada

- Seção T2b do `/planejar --tarefa`, sobre a descrição da demanda, **antes** de
  qualquer dispatch do Dono.
- Também serve quando o usuário pergunta avulso "isso muda o plano comercial?".

Do NOT use for:
- Fazer a análise comercial em si — se a triagem der "tem impacto", quem roda são
  as skills de seção do Dono, escopadas ao que foi apontado.
- Avaliar efeito cascata técnico sobre SDD.md/TASK.md — isso é o `coordenador`.

## Core Framework

**Tem impacto comercial** quando a demanda mexe em pelo menos um destes eixos —
cada eixo mapeia para as seções do plano a revisar:

| Eixo da demanda | Exemplos | Seções a revisar |
|---|---|---|
| Monetização | nova cobrança, mudança de preço/plano, freemium→pago | 1, 6, 5 |
| Público | atender segmento novo, mudar o ICP | 2, 1, 5 |
| Canal | publicar em loja/marketplace novo, canal de aquisição novo | 3, 6 |
| Posicionamento | funcionalidade que altera o diferencial frente a concorrente | 4, 5 |
| Custo estrutural | dependência paga nova, infra significativamente mais cara | 6, 5 |
| Premissa | evidência nova que valida/derruba entrada da Seção 7 | 7, 5 (+ a de origem) |

**Não tem impacto comercial**: correção de bug, refatoração, ajuste de UX sem
efeito em preço/público/canal, débito técnico, melhoria interna de performance
sem mudança de custo relevante.

**Regra de dúvida**: custo/benefício assimétrico — dispensar o Dono numa demanda
com impacto real quebra a conta em silêncio; acioná-lo à toa custa uma rodada
curta. Na dúvida, aciona.

## Workflow

1. Leia a descrição da demanda e o `PLANO-COMERCIAL.md` atual (se existir).
2. Passe a demanda pelos seis eixos da tabela.
3. **Sem impacto**: informe em uma frase o porquê e siga para a pergunta de troca
   de agente ("Sem impacto comercial — posso acionar o Gestor direto?").
4. **Com impacto**: liste os eixos atingidos e as seções do plano a revisar — esse
   recorte vira o escopo do dispatch do Dono (atualização pontual, nunca reescrita
   do plano inteiro).
5. A Seção 5 (viabilidade) entra no recorte sempre que qualquer premissa crítica
   for tocada — o percentual não pode ficar dessincronizado.

## Output Esperado

- **Formato**: veredito de triagem em 2-4 frases — "sem impacto + porquê" ou "com
  impacto + eixos + seções a revisar" — apresentado ao usuário na Seção T2b do
  `/planejar --tarefa`. Não escreve artefato; o `PLANO-COMERCIAL.md` só muda se o
  Dono for acionado.

## Critério de Aceite

- [ ] Veredito explícito (com/sem impacto) com justificativa de uma frase
- [ ] Quando com impacto: eixos nomeados e seções do plano listadas
- [ ] Seção 5 incluída no recorte sempre que premissa crítica é tocada
- [ ] O recorte é o menor conjunto de seções que cobre a demanda — nunca "revisar
      o plano inteiro" por padrão

### MUST DO
- Aplicar a regra de dúvida: na incerteza, acionar o Dono com recorte mínimo.
- Registrar a dispensa (e o porquê) no resumo final do ciclo, para
  rastreabilidade.

### MUST NOT DO
- Dispensar o Dono em demanda de monetização/canal "porque é pequena" — tamanho
  da implementação não mede impacto comercial.
- Transformar a triagem em análise: parecer de viabilidade é trabalho das skills
  de seção, não daqui.
