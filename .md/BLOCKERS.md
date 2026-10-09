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

## Bloqueio 003 — 2026-10-09 (BK-0003)
- Reportado por: coordenador (/revisar)
- Escalado para: usuário
- Artefato/trecho afetado: —
- Descrição: Decidir se dominio e contrato saem do pacote processamento para um pacote compartilhado próprio (novo ADR que substitui em parte o ADR-008, que descartou o pacote shared) e escrever no SDD §2 a subseção Pacotes, pastas e fronteiras (módulo único de dados = armazenamento/; camadas novas aplicacao/ e config/)
- Impacto se não resolvido: Média: o site e o Worker dependem do pacote da aplicação de processamento (20 arquivos de web/ importam processamento/...) e, sem a subseção, o /revisar e o /organizar não têm referência formal de fronteiras (achado 1 do ARCH-REVIEW 2026-10-08)
- Sugestão: Recomendo criar o pacote nucleo (dominio + contrato, sem node:*) com ADR novo; se o prazo não comportar, manter o desenho atual e registrar a exceção no SDD; nos dois casos escrever a subseção
- Status: Em aberto

## Bloqueio 004 — 2026-10-09 (BK-0004)
- Reportado por: coordenador (/revisar)
- Escalado para: usuário
- Artefato/trecho afetado: —
- Descrição: Decidir onde roda a marcação de pagamentos duplicados (RN-03) da tela T2: hoje Pedido.tsx chama detectarDuplicado do domínio no navegador, e a resposta v1 não pode ganhar campo (G-21)
- Impacto se não resolvido: Média: regra de negócio recalculada na tela, fora do que o SDD §5 permite (só o estado em uma data, RF-06, roda no navegador) (achado 2 do ARCH-REVIEW 2026-10-08)
- Sugestão: Opção a: expor os códigos dos pagamentos duplicados em /api/v2 ou num recurso novo e a tela usar esse dado; opção b: registrar no SDD §5, com ADR curto, a exceção ao lado da RF-06. Recomendo b por prazo, ou a se uma v2 da tela estiver no plano
- Status: Em aberto

## Bloqueio 005 — 2026-10-09 (BK-0005)
- Reportado por: coordenador (/revisar)
- Escalado para: usuário
- Artefato/trecho afetado: —
- Descrição: Decidir como o D1 é trocado em produção e escrever a subseção Troca de dados em produção do SDD §6: hoje o leitura.sql faz DROP/CREATE e INSERT sem atomicidade nem volta atrás
- Impacto se não resolvido: Média: uma falha no meio da carga deixa a API com tabelas vazias ou parciais, sem caminho documentado para voltar (achado 30 do ARCH-REVIEW 2026-10-08)
- Sugestão: Recomendo guardar o bookmark do Time Travel do D1 antes da carga e documentar o restore no script de publicação (confirmar na documentação que já está incluso no plano, sem custo, G-22); alternativa: tabelas de staging com troca por renomeação
- Status: Em aberto

## Bloqueio 006 — 2026-10-09 (BK-0006)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0086
- Descrição: Decidir como registrar a regra de convergência de identidade de pedido: a skill adr-drafting proíbe editar ADR aceito (ADR-004 está Aceito); escolher entre (1) autorizar adendo datado no ADR-004, (2) criar um novo ADR complementar e apontar o comentário de importar.ts para ele, ou (3) pôr a regra no SDD
- Impacto se não resolvido: RTP-0086 fica parada; o comentário de importar.ts continua citando o ADR-004 sem a regra
- Sugestão: Opção 2: novo ADR complementar, sem mexer em ADR aceito
- Status: Em aberto
