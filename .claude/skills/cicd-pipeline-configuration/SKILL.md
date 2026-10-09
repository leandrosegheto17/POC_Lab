---
name: cicd-pipeline-configuration
description: Configura e mantém o pipeline de CI/CD (build, testes automatizados, deploy), incorporando os requisitos de segurança operacional definidos pelo DevSecOps. Use em paralelo à implementação, assim que a infraestrutura base já está definida. Do NOT use for provisionar a infraestrutura em si (isso é infrastructure-as-code-provisioning) ou para executar o deploy manualmente (o pipeline executa; deployment-execution decide quando acionar).
metadata:
  author: devops
  version: '1.0.0'
---

# CI/CD Pipeline Configuration

Você atua como DevOps Engineer configurando o pipeline que builda, testa e (quando
autorizado) deploya o projeto automaticamente — incorporando os requisitos de
segurança operacional que o DevSecOps definiu, para que segurança não seja uma
etapa manual esquecível.

## Quando é Acionada

- Em paralelo à implementação, assim que a infraestrutura base
  (`infrastructure-as-code-provisioning`) já está definida.

Do NOT use for:
- Provisionar a infraestrutura em si — isso é `infrastructure-as-code-provisioning`,
  que roda antes.
- Executar o deploy manualmente — o pipeline configurado aqui executa a etapa de
  deploy; `deployment-execution` decide quando de fato acionar (só após dupla
  aprovação).

## Inputs Esperados

- Infraestrutura já provisionada (obrigatório).
- `TASK.md`, Seção 1 (Diretrizes de Implementação) (obrigatório) — framework de
  teste e convenção de build usados pelos times.
- Requisitos de segurança operacional do DevSecOps, quando disponíveis (contexto)
  — gestão de secrets, scan de dependência no próprio pipeline.

## Core Framework

1. **Estágios do pipeline.** Build → Lint → Teste automatizado → Scan de segurança
   (dependências/segredos) → Deploy (condicionado à dupla aprovação de QA e
   DevSecOps) — cada estágio falha o pipeline se não passar, não segue "mesmo
   assim".
2. **Gestão de secrets no pipeline.** Nenhum segredo em variável de ambiente
   exposta em log do pipeline — usa cofre/gerenciador de segredo integrado.
3. **Ambientes.** Pipeline distingue staging (deploy automático, mais permissivo)
   de produção (deploy só com aprovação explícita/gate, nunca automático sem
   checagem).
4. **Falha rastreável.** Todo estágio que falha produz log claro o suficiente para
   diagnosticar sem precisar reproduzir localmente do zero.
5. **Caminhos que batem com onde o comando roda.** Todo `path` de cache, artefato
   ou upload é relativo à pasta onde o comando que gera o arquivo **realmente
   roda**. Em monorepo isso engana: `pnpm --filter <pacote> run x` (e equivalentes
   de npm/yarn workspaces) roda dentro de `<pacote>/`, então um arquivo gravado em
   `dados/origem` vai parar em `<pacote>/dados/origem`, não na raiz. Para cada
   cache, confirme lendo o script de destino (ou a saída do primeiro run) onde o
   arquivo cai, e confira no **segundo** run que o log mostra "cache hit".
6. **Fronteiras checadas no CI.** As checagens automáticas indicadas na coluna
   "Como verificar" do `GUARDRAILS.md` (lint de import, testes de contrato, `grep`
   de SQL fora do módulo de dados) rodam como estágio do pipeline — regra que só
   existe no papel não protege nada.
7. **Segurança desde o CI.** O estágio "scan de segurança" roda ferramentas de
   verdade em todo push, para o problema aparecer cedo e a auditoria do `/deploy`
   (`security-release-audit`) ser confirmação, não descoberta:
   - auditoria de dependências de produção (`pnpm audit --prod --audit-level high` ou
     equivalente) — falha em Alta/Crítica;
   - `gitleaks` (ação oficial ou binário) sobre o histórico — falha em qualquer
     segredo;
   - `semgrep` com as regras do stack — falha em severidade ERROR.
   Actions fixadas por hash e `permissions` mínimas no workflow.

## Workflow

1. Configure os estágios do pipeline (build, lint, teste, scan de segurança,
   deploy) conforme o framework acima.
2. Incorpore gestão de secrets segura no pipeline.
3. Configure o gate de produção para exigir a dupla aprovação (QA + DevSecOps)
   antes de acionar `deployment-execution`.
4. Verifique que falha em qualquer estágio produz log diagnosticável.
5. Para cada cache/artefato, confirme o caminho real contra a pasta de execução do
   comando e registre no `DEPLOY.md` como confirmou (item 5 do Core Framework).
6. Inclua as checagens automáticas do `GUARDRAILS.md` como estágio do pipeline.
7. Inclua auditoria de dependências, `gitleaks` e `semgrep` no estágio de scan de
   segurança (item 7 do Core Framework).

## Output Esperado

- **Formato**: configuração de pipeline (arquivo de CI/CD conforme a ferramenta
  usada pelo projeto), versionado no repositório.
- **Onde salva**: árvore de código do projeto (fora de `.md/`); registro da
  configuração em `.md/DEPLOY.md`.

## Critério de Aceite

- [ ] Todos os estágios (build, lint, teste, scan de segurança, deploy) configurados
- [ ] Nenhum segredo exposto em log do pipeline
- [ ] Gate de produção exige dupla aprovação (QA + DevSecOps), nunca deploy
      automático sem checagem
- [ ] Falha em qualquer estágio produz log diagnosticável
- [ ] Todo caminho de cache/artefato confere com a pasta onde o comando roda
      (inclusive em monorepo com `--filter`); "cache hit" confirmado no 2º run
- [ ] As checagens automáticas do `GUARDRAILS.md` rodam como estágio do pipeline
- [ ] Auditoria de dependências, `gitleaks` e `semgrep` rodam em todo push e falham
      o pipeline em Alta/Crítica

### MUST DO
- Configurar o gate de produção para exigir a dupla aprovação antes de qualquer
  deploy.
- Garantir que nenhum segredo vaza em log do pipeline.

### MUST NOT DO
- Permitir deploy automático em produção sem o gate de dupla aprovação.
- Deixar um estágio "soft-fail" (continua mesmo falhando) sem justificativa
  explícita registrada.
