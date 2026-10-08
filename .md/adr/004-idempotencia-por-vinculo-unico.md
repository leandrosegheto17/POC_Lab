# ADR-004 — Idempotência por vínculo e chave de evento únicos

- Status: Aceito
- Data: 2026-10-07

## Contexto
Importar duas vezes os mesmos arquivos deve terminar com as mesmas contagens e o mesmo estado (RF-02). Arquivos também podem trazer o mesmo registro repetido.

## Alternativas consideradas
1. Apagar e recriar a base a cada importação.
2. Hash do arquivo para pular arquivos já importados.
3. Restrição única no banco: `UNIQUE(fonte, codigo_externo)` em `vinculo_fonte` e `UNIQUE(fonte, codigo_evento)` em `evento`, com `INSERT ... ON CONFLICT DO NOTHING`.

## Decisão e motivo
Alternativa 3. A garantia fica no banco, não em disciplina de código; funciona por registro (não por arquivo), então um arquivo com linhas novas e antigas também funciona. As contagens "novas" e "já existentes" saem do próprio resultado da inserção.

## Consequências
- "Registro repetido" (mesmo código no mesmo arquivo) vira achado de qualidade; "já existente" (de uma importação anterior) não.
- `achado_qualidade` também tem chave única, para reimportar sem duplicar achados.

## O que deliberadamente não foi feito
- Recriar a base: esconderia a idempotência em vez de demonstrá-la.
- Hash de arquivo: não cobre arquivos parcialmente novos.
