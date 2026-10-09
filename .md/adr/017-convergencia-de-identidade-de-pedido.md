# ADR-017 — Convergência de identidade de pedido pelo código bruto de vendas

- Status: Aceito
- Data: 2026-10-09
- Complementa: ADR-002 (identidade própria do pedido) e ADR-004 (idempotência por vínculo único). Não substitui nenhum dos dois.

## Contexto
As 3 fontes (vendas, pagamentos, rastreio) falam do mesmo pedido, mas o ADR-002 só diz que a identidade é `PED-nnnnnn` e que o vínculo fica em `vinculo_fonte`. O ADR-004 só trata da idempotência. Faltava registrar como as três fontes chegam ao mesmo `PED-nnnnnn`, em que ordem ele é cunhado e de onde o contador continua. A regra existia só em um comentário de `processamento/src/importacao/importar.ts`, que remetia ao ADR-004 sem ela estar lá (achado do QA da RTP-0071, tratado na RTP-0086 e no BK-0006).

## Alternativas consideradas
1. Pôr a regra dentro do ADR-004 como adendo. Contraria a imutabilidade de ADR aceito.
2. Pôr a regra só no SDD. O SDD resume; a decisão e o motivo ficam sem lugar próprio.
3. Novo ADR complementar (esta decisão).

## Decisão e motivo
Alternativa 3. A regra que o código já cumpre fica assim:
- As 3 fontes expressam o vínculo com o pedido pelo **código bruto de vendas**. O par `(fonte = 'vendas', codigo_externo = <código bruto>)` em `vinculo_fonte` é o índice de identidade.
- Se esse par existe, reaproveita-se o `id_pedido`. Se não existe, cunha-se o próximo `PED-nnnnnn` e insere-se o vínculo `vendas` **antecipadamente**, mesmo que a venda ainda não tenha sido importada. Assim as fontes convergem no mesmo pedido, qualquer que chegue primeiro.
- Cada fonte grava também o **próprio vínculo** (rastreio, transação de pagamento, código de vendas).
- **Ordem de cunhagem** (determinística, para a mesma entrada gerar os mesmos identificadores, RNF-05 e G-10): vendas (código crescente), depois rastreio, depois pagamentos.
- O **contador** continua do maior `PED-nnnnnn` já existente no event store, então reimportar sobre a mesma base não reutiliza nem repete número.

## Consequências
- O comentário de `importar.ts` passa a apontar para este ADR (ADR-017) e o ADR-004 fica intacto.
- Mudar a ordem de cunhagem muda os identificadores gerados: só por novo ADR que supersede este.
- Um pagamento ou rastreio sem venda correspondente cria o vínculo `vendas` antecipado; a venda que chegar depois reaproveita o mesmo pedido.

## O que deliberadamente não foi feito
- Editar o ADR-004 ou o ADR-002: ADR aceito é imutável.
- Fusão de pedidos já cunhados (mesma ressalva do ADR-002).
