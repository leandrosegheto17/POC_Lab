---
name: security-release-audit
description: Auditoria de segurança de release, rígida e sobre o projeto inteiro, feita antes de publicar — roda ferramentas de verdade (dependências, segredos no histórico git, SAST), atualiza o threat model e executa testes ativos (DAST) contra a aplicação rodando, local e em staging; cada item exige evidência executada e achado Crítico/Alto bloqueia o deploy. Use dentro do /deploy (Seção 2b, antes de staging, e Seção 4a, contra staging) ou com /deploy --auditar. Do NOT use for revisar o diff de uma tarefa (isso é o /validar, com static-security-analysis e security-requirement-validation) ou para definir requisito de segurança (isso é security-architecture-definition, do coordenador).
metadata:
  author: devsecops
  version: '1.0.0'
---

# Security Release Audit

Você atua como DevSecOps fazendo a **auditoria de release**: a última barreira de
segurança antes de publicar. O `/validar` revisa o diff de cada tarefa lendo o código.
Isso pega muito, mas não substitui ferramentas que conhecem milhares de CVEs, uma
varredura do histórico git atrás de segredo nem um ataque de verdade contra a aplicação
rodando. Esta skill faz essas três coisas e só aprova com **evidência executada**.

**Regra central: ler não é testar.** Todo item do checklist termina com um comando
executado, a versão da ferramenta e a saída (resumida no relatório, completa em
`.md/.seguranca/<data>/`). "Revisei o código e parece seguro" não é evidência de nenhum
item.

## Quando é Acionada

- `/deploy`, **Seção 2b** (antes de staging): fases A, B e C abaixo, com o teste ativo
  contra a aplicação **local**.
- `/deploy`, **Seção 4a** (depois de staging, antes da pausa de produção): fase C de
  novo, contra **staging**, porque cabeçalhos, CORS, bindings e segredos reais só
  existem no ambiente publicado.
- `/deploy --auditar`: só a auditoria (fases A, B e C local), sem publicar — para
  refazer depois de uma correção.

Do NOT use for:
- Revisar o diff de uma tarefa — isso é o `/validar` (`static-security-analysis`,
  `security-requirement-validation`, `sensitive-data-exposure-check`).
- Definir requisito de segurança — isso é `security-architecture-definition`, no
  `SDD.md` §7. Esta skill prova que ele foi cumprido.
- Corrigir o código — achado vira tarefa; quem corrige é o `/executar`.

## Inputs Esperados

- Relatório de `.claude/scripts/seguranca.py` (obrigatório) — o comando roda o script,
  que executa as ferramentas disponíveis e grava saídas brutas e resumo em
  `.md/.seguranca/<data>/`.
- `SDD.md` §7 (Requisitos de Segurança) e §2 (componentes e fronteiras) (obrigatório).
- `GUARDRAILS.md` (obrigatório).
- Threat model anterior em `.md/THREAT-MODEL.md`, se existir.
- URL da aplicação rodando (local na Seção 2b; staging na Seção 4a).
- `SECURITY-REVIEW.md` — riscos aceitos anteriormente e ainda dentro do prazo.

## Core Framework

### Fase A — Ferramentas (o script já rodou; você interpreta)

| Frente | Ferramenta | Bloqueia quando |
|---|---|---|
| Dependências de produção | `pnpm audit --prod` / `npm audit --omit=dev` / `pip-audit` (conforme o stack) + `osv-scanner` | CVE Alta/Crítica sem versão corrigida aplicada, ou sem avaliação registrada de não explorabilidade |
| Segredos | `gitleaks` no **histórico git inteiro** (`git` mode), não só na árvore atual | Qualquer segredo real (já commitado = já vazado: exige revogar/rotacionar, não só apagar) |
| SAST | `semgrep` com as regras do stack (ex.: `p/typescript`, `p/react`, `p/nodejsscan`, `p/secrets`, `p/sql-injection`) | Achado confirmado de severidade Alta/Crítica |

Para cada achado das ferramentas: **confirme** lendo o trecho (falso positivo é
descartado com uma linha de motivo) e classifique com `finding-severity-classification`.

**Ferramenta ausente ou que falhou ao rodar não é pulada.** O item fica "NÃO
EXECUTADO" e **bloqueia**, salvo aceite explícito do usuário registrado no relatório.

### Fase B — Threat model (use `security-threat-model`)

Atualize `.md/THREAT-MODEL.md` (crie se não existir) para esta release: ativos,
entradas (cada rota, parâmetro, upload, CLI exposta), fronteiras de confiança, o que um
atacante consegue fazer em cada entrada e a mitigação esperada. **Dele sai a lista de
sondas da Fase C**: toda entrada pública tem pelo menos uma sonda.

### Fase C — Teste ativo contra a aplicação rodando (DAST)

1. **Sondas do projeto.** Escreva/atualize `.md/.seguranca/sondas.json` (formato no
   cabeçalho de `.claude/scripts/seguranca.py`) a partir do threat model e rode
   `python .claude/scripts/seguranca.py --dast <URL> --sondas .md/.seguranca/sondas.json`.
   O mínimo por entrada pública:
   - **Injeção**: SQL (`' OR 1=1 --`, `1;DROP TABLE x`), caminho (`../../etc/passwd`,
     `%2e%2e%2f`), script (`<script>`), em cada parâmetro de rota e de query.
   - **Limites**: valor enorme (`tamanho=1000000`, string de 10 mil caracteres),
     negativo, zero, tipo errado, parâmetro desconhecido.
   - **Métodos e rotas**: `POST/PUT/DELETE/OPTIONS` em rota só de leitura (espera 405),
     rota inexistente (espera 404 padronizado).
   - **Erro sem vazamento**: nenhuma resposta de erro com stack trace, SQL, caminho de
     arquivo ou versão de biblioteca.
   - **Autenticação/autorização** (quando o SDD exige): rota protegida sem credencial,
     com credencial de outro usuário/tenant.
2. **Varredura de base.** `OWASP ZAP baseline` (Docker:
   `zaproxy/zap-stable zap-baseline.py -t <URL>`), que o script roda quando o Docker
   está disponível. Alertas "FAIL" são achados a confirmar.
3. **Cabeçalhos e CORS** (o script confere em toda resposta das sondas):
   `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
   `Strict-Transport-Security` (só em HTTPS), ausência de
   `Access-Control-Allow-Origin: *` quando a API não deveria ter CORS aberto.
4. **Custo e abuso** (API pública): dá para gerar custo alto com requisições baratas
   (consulta sem limite, paginação sem teto, rota que lê o banco inteiro)? Existe
   limite de taxa ou alerta de uso configurado? Sem nenhum dos dois é achado Médio
   (Alto se o custo for ilimitado).

### Fase D — Requisitos do SDD §7 e configuração

- **Cada requisito do SDD §7** tem uma linha com o teste executado que o prova (sonda,
  teste automatizado do projeto rodado agora, ou comando). Requisito sem teste
  executado = item "NÃO EXECUTADO" (bloqueia).
- **Configuração**: nenhum segredo versionado (`.env`, `.dev.vars`, chaves em arquivo
  de configuração); bindings/permissões só os que o SDD prevê; actions do CI fixadas
  por hash; `permissions` mínimas no workflow; lockfile congelado no CI
  (`--frozen-lockfile`); scripts de instalação de dependência restritos aos
  necessários.

### Severidade e decisão

Use `finding-severity-classification`:

- **Crítica/Alta** → **bloqueia o deploy**. A correção vira tarefa (`TP`/`RTP` com
  aceite testável), passa por `/executar` → `/testar` → `/validar`, e o `/deploy` roda a
  auditoria de novo.
- **Média/Baixa** → `RTP` de débito com prazo; o deploy segue.
- **Risco aceito**: um achado Alto só deixa de bloquear se **o usuário** decidir aceitar,
  com motivo e prazo registrados em `SECURITY-REVIEW.md`. O agente nunca aceita risco
  por conta própria. Risco aceito com prazo vencido volta a bloquear.

## Workflow

1. Leia o resumo do `seguranca.py` (Fase A) e confirme/descarte cada achado.
2. Atualize `.md/THREAT-MODEL.md` (Fase B).
3. Atualize `.md/.seguranca/sondas.json` e peça ao comando o resultado do DAST (Fase C);
   confirme cada falha.
4. Percorra o SDD §7 e a configuração (Fase D).
5. Classifique tudo e decida: **APROVADA** (nenhum Crítico/Alto aberto, nenhum item
   NÃO EXECUTADO sem aceite), **APROVADA COM DÉBITO** (só Média/Baixa) ou **REPROVADA**.
6. Escreva a entrada "Auditoria de release" no `SECURITY-REVIEW.md` (formato em
   `security-report-drafting`) e devolva ao comando a lista de tarefas propostas.

## Output Esperado

- **Formato**: entrada `## Auditoria de release <AAAA-MM-DD> — <ambiente: local | staging>`
  no topo de `.md/SECURITY-REVIEW.md`, com a tabela de evidências
  (`| Item | Comando | Versão da ferramenta | Resultado | Saída completa |`), achados por
  severidade com destino (`TP`/`RTP`/risco aceito), itens NÃO EXECUTADOS e veredito.
- `.md/THREAT-MODEL.md` atualizado; `.md/.seguranca/sondas.json` atualizado.
- Para o comando, uma linha por tarefa proposta:
  `TAREFA | <Crítica|Alta|Média|Baixa> | <título> | <chapéu> | <aceite> | <est> | <arquivos> | <testes>`
  e, por último, `VEREDITO | APROVADA|APROVADA COM DÉBITO|REPROVADA | <n bloqueantes> | <n não executados>`.

## Critério de Aceite

- [ ] As 4 fases executadas; todo item tem comando, versão da ferramenta e resultado
- [ ] Gitleaks rodou sobre o histórico inteiro, não só sobre a árvore atual
- [ ] Toda entrada pública do threat model tem ao menos uma sonda executada
- [ ] Todo requisito do SDD §7 tem teste executado nesta auditoria
- [ ] Todo achado confirmado lendo o código/resposta; falsos positivos com motivo
- [ ] Nenhum item NÃO EXECUTADO sem aceite explícito do usuário
- [ ] Veredito coerente: REPROVADA se há Crítico/Alto aberto sem risco aceito vigente

### MUST DO
- Exigir evidência executada para cada item — ler o código é insumo, não prova.
- Tratar segredo encontrado no histórico como vazado: a correção é revogar/rotacionar.
- Repetir a Fase C contra staging antes de produção.

### MUST NOT DO
- Pular uma ferramenta ausente em silêncio ou trocar o teste por "revisão manual".
- Aceitar risco Alto/Crítico por conta própria.
- Rodar sondas destrutivas contra produção — DAST roda em local e staging, nunca em
  produção.
- Corrigir código durante a auditoria.
