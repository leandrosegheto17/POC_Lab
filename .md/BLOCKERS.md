# BLOCKERS

## Bloqueio 001 — 2026-10-08 (BK-0001)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0023
- Descrição: Fazer o push da main (331 commits à frente do origin; último CI no GitHub = failure em a425a8a, versão antiga) e rodar /executar --tarefa RTP-0023 para conferir o CI verde
- Impacto se não resolvido: Só Lote-1 refatoração; sem push não há CI novo para conferir
- Sugestão: —
- Status: Resolvido (2026-10-08): Push feito; CI verde em 282b45f (build-and-test success)

## Bloqueio 002 — 2026-10-08 (BK-0002)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0046
- Descrição: Aprovar a mudança em GUARDRAILS.md G-04 (citar problemas-plantados.json), que é do Gestor; depois rodar /executar --tarefa RTP-0046
- Impacto se não resolvido: Docs normativos e regra de lint ficam sem o nome novo
- Sugestão: —
- Status: Resolvido (2026-10-08): Usuário aprovou a mudança em GUARDRAILS.md G-04 (citar problemas-plantados.json)
