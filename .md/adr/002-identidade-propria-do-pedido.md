# ADR-002 — Identidade própria do pedido

- Status: Aceito
- Data: 2026-10-07

## Contexto
Três sistemas usam códigos próprios para o mesmo pedido. O sistema de vendas é a origem, mas não é o dono do conceito "pedido conciliado".

## Alternativas consideradas
1. Usar o código do sistema de vendas como chave em todo o modelo.
2. Identidade própria sequencial (`PED-000001`) + tabela `vinculo_fonte` (fonte, código externo).
3. UUID aleatório + `vinculo_fonte`.
4. UUID determinístico (hash da fonte + código).

## Decisão e motivo
Alternativa 2. Nenhuma fonte é privilegiada; um pagamento ou rastreio pode chegar antes da venda sem mudar o modelo; a busca aceita qualquer código (RF-05). A sequência é atribuída na ordem determinística da importação, então a mesma entrada gera os mesmos identificadores (RNF-05).

## Consequências
- Toda consulta por código externo passa por `vinculo_fonte`.
- A identidade depende da ordem de importação de uma base vazia; reimportar sobre a mesma base preserva as identidades (o vínculo já existe).

## O que deliberadamente não foi feito
- UUID aleatório: quebraria a saída byte a byte idêntica.
- UUID derivado do código da fonte: amarraria a identidade a um sistema, o oposto do objetivo.
- Fusão de pedidos (dois vínculos que depois se revelam o mesmo pedido): não há esse caso nas fontes.
