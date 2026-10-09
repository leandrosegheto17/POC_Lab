# ADR-018 — Pacote `nucleo` com `dominio` e `contrato`

- Status: Aceito
- Data: 2026-10-09
- Substitui em parte: ADR-008 (só a contagem de 2 pacotes e a frase "pacote `shared` separado" em "o que não foi feito"). O resto do ADR-008 (um único serviço, módulos com fronteira por lint) continua valendo.
- Origem: BK-0003, decidido pelo usuário (opção A).

## Contexto
O ADR-008 manteve 2 pacotes (`processamento` e `web`) e descartou o pacote `shared`. Por isso `dominio/` e `contrato/` moram em `processamento/src/` e o `web` (site e Worker) importa de lá (20 arquivos). Não há violação de regra, mas o site e o Worker dependem de um pacote de aplicação que tem `node:sqlite`, CLI e IA. A fronteira só existe por causa do lint, não do pacote. O SDD também não tinha a subseção `### Pacotes, pastas e fronteiras`.

## Alternativas consideradas
1. Manter 2 pacotes e registrar a exceção no SDD. Custo zero, mas mantém o `web` dependendo da aplicação.
2. Copiar `dominio` e `contrato` para o `web`. Duplica regra de negócio; contraria "lógica compartilhada nasce uma vez".
3. Criar o pacote `nucleo` (esta decisão).

## Decisão e motivo
Alternativa 3. O pnpm workspace passa a ter **3 pacotes**:
- `nucleo`: contém `dominio/` e `contrato/`. Não usa `node:*` e não faz I/O. Só depende de `zod` (no `contrato`). Não depende de nenhum outro pacote do projeto.
- `processamento`: depende de `nucleo`.
- `web`: depende de `nucleo`. Não depende de `processamento`.

Motivo: o código que roda nos três lugares (processamento, Worker, navegador) passa a ter casa própria, e a regra "o site e o Worker só pegam `dominio` e `contrato`" vira fronteira de pacote, além do lint. As regras de importação internas (`dominio` não importa nada; `contrato` só `dominio` e `zod`) não mudam.

## Consequências
- Muda a configuração do workspace: `package.json`, `tsconfig`, `eslint.config.js`, Vitest e CI.
- A migração (mover as pastas e ajustar os ~20 imports do `web` e os imports internos do `processamento`) é uma tarefa mecânica própria, sem mudar comportamento, feita **depois** das RTP-0056, 0057, 0058 e 0062 para não gerar conflito. Até lá, o código continua em `processamento/src/` e o SDD descreve o estado alvo.
- O `saude.py` deixa de contar imports entre aplicações.
- Mais um pacote para uma POC pequena: custo aceito pela fronteira mais clara.
- Voltar atrás exige novo ADR que supersede este.

## O que deliberadamente não foi feito
- Pacote `shared` genérico: o `nucleo` só tem `dominio` e `contrato`; nada de utilitário solto.
- Mover `armazenamento`, `fontes` ou `publicacao` para fora do `processamento`.
- Editar o ADR-008: ADR aceito é imutável.
