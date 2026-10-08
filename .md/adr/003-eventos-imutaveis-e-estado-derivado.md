# ADR-003 — Eventos imutáveis e estado derivado

- Status: Aceito
- Data: 2026-10-07

## Contexto
O estado de um pedido depende de fatos vindos de 3 fontes, em lote e fora de ordem. É preciso explicar cada divergência e reconstruir o estado em uma data (RF-06).

## Alternativas consideradas
1. Tabela `pedido` com colunas de estado (pago, enviado, entregue) atualizadas a cada importação.
2. Log de eventos imutáveis (`evento`), estado calculado por função pura a partir dele.
3. Event sourcing completo (agregados, snapshots, barramento).

## Decisão e motivo
Alternativa 2. Ordenar pelo momento do fato (RN-07) e derivar o estado torna o resultado independente da ordem de chegada; cada divergência aponta os eventos que a sustentam; "estado em uma data" é só filtrar eventos até a data. A função de derivação é pura e roda também no navegador.

## Consequências
- Código só faz `INSERT` em `evento` (RN-12); correção é nova importação.
- Estado, divergências e indicadores são recalculados a cada publicação (barato: ~16 mil pedidos).

## O que deliberadamente não foi feito
Snapshots, barramento de eventos, projeções incrementais e reprocessamento parcial: o volume não justifica.
