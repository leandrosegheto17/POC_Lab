# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-09 15:41

Resumo: Em execução 1 · Aprovada 198 · total 199

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Monorepo pnpm, tsconfig base e pacote processamento vazio com Vitest | Lote 1 | — | Aprovada |
| 2 | TP-0002 | executor | ✔ | ESLint 9 com fronteiras de módulo e proibições | Lote 1 | TP-0001 | Aprovada |
| 3 | TP-0003 | executor | ✔ | Pacote web vazio: Vite, React 19, React Router, Vitest jsdom, Testing Library, vitest-axe | Lote 1 | TP-0001 | Aprovada |
| 4 | TP-0004 | executor | ✔ | CLI baixar-base com URL fixada em commit e SHA-256 | Lote 1 | TP-0001 | Aprovada |
| 5 | TP-0005 | executor | ✔ | CI no GitHub Actions | Lote 1 | TP-0002, TP-0003, TP-0004 | Aprovada |
| 6 | TP-0006 | executor | ✔ | Contrato de evento v1 e tipos do modelo comum | Lote 2 | TP-0001 | Aprovada |
| 7 | TP-0007 | executor | ✔ | RN-07 ordenação canônica dos eventos | Lote 2 | TP-0006 | Aprovada |
| 8 | TP-0008 | executor | ✔ | RN-01 valor devido do pedido | Lote 2 | TP-0006 | Aprovada |
| 9 | TP-0009 | executor | ✔ | RN-02 quitação e saldo do pedido | Lote 2 | TP-0006 | Aprovada |
| 10 | TP-0010 | executor | ✔ | RN-09 normalização e casamento da referência de pagamento | Lote 2 | TP-0006 | Aprovada |
| 11 | TP-0011 | executor | ✔ | RN-10 valores fora do padrão | Lote 2 | TP-0006 | Aprovada |
| 12 | TP-0012 | executor | ✔ | Estado derivado do pedido até uma data | Lote 3 | TP-0007, TP-0009 | Aprovada |
| 13 | TP-0013 | executor | ✔ | RN-08 eventos recebidos fora de ordem | Lote 3 | TP-0007 | Aprovada |
| 14 | TP-0014 | executor | ✔ | RN-03 pagamento duplicado | Lote 3 | TP-0009 | Aprovada |
| 15 | TP-0015 | executor | ✔ | RN-04 pagamento parcial | Lote 3 | TP-0009 | Aprovada |
| 16 | TP-0016 | executor | ✔ | RN-05 pago e não enviado / enviado e não pago, com data de corte RN-14 | Lote 3 | TP-0012 | Aprovada |
| 17 | TP-0017 | executor | ✔ | RN-06 entrega atrasada | Lote 3 | TP-0006 | Aprovada |
| 18 | TP-0018 | executor | ✔ | Schema do event store e repositório SQLite idempotente | Lote 4 | TP-0006 | Aprovada |
| 19 | TP-0019 | executor | ✔ | Leitura somente leitura da base de vendas e normalização das datas | Lote 4 | TP-0004, TP-0006 | Aprovada |
| 20 | TP-0020 | executor | ✔ | Adaptador de vendas: vínculos, evento venda e achados | Lote 4 | TP-0008, TP-0011, TP-0019 | Aprovada |
| 21 | TP-0021 | executor | ✔ | Adaptador de pagamentos.csv | Lote 4 | TP-0010, TP-0011 | Aprovada |
| 22 | TP-0022 | executor | ✔ | Adaptador de rastreio.csv | Lote 4 | TP-0006 | Aprovada |
| 23 | TP-0023 | executor | ✔ | Gerador base: PRNG com semente, pedidos limpos, pagamentos.csv sem problemas e CLI gerar | Lote 5 | TP-0019 | Aprovada |
| 24 | TP-0024 | executor | ✔ | Gerador base: rastreio.csv sem problemas | Lote 5 | TP-0023 | Aprovada |
| 25 | TP-0025 | executor | ✔ | Gerador: plantar casos de pagamento | Lote 5 | TP-0023 | Aprovada |
| 26 | TP-0026 | executor | ✔ | Gerador: plantar casos de rastreio | Lote 5 | TP-0024 | Aprovada |
| 27 | TP-0027 | executor | ✔ | Caso de uso importar com identidade própria e CLI | Lote 5 | TP-0018, TP-0020, TP-0021, TP-0022 | Aprovada |
| 28 | TP-0028 | executor | ✔ | Lista de divergências do pedido e teste de M1 contra o gabarito | Lote 5 | TP-0014, TP-0015, TP-0016, TP-0017, TP-0025, TP-0026, TP-0027 | Aprovada |
| 29 | TP-0029 | executor | ✔ | Contrato base da API: erro RFC 9457, paginação, parâmetros e normalização do código | Lote 6 | TP-0006 | Aprovada |
| 30 | TP-0030 | executor | ✔ | Esquemas de resposta v1: resumo, divergências e linha do tempo | Lote 6 | TP-0029 | Aprovada |
| 31 | TP-0031 | executor | ✔ | Esquemas de resposta v1: indicadores e qualidade | Lote 6 | TP-0029 | Aprovada |
| 32 | TP-0032 | executor | ✔ | Schema SQL das visões de leitura do D1 | Lote 6 | TP-0006 | Aprovada |
| 33 | TP-0033 | executor | ✔ | Indicadores Must no domínio | Lote 7 | TP-0017, TP-0028 | Aprovada |
| 34 | TP-0034 | executor | ✔ | Totais do resumo no domínio (cartões da T1) | Lote 7 | TP-0033 | Aprovada |
| 35 | TP-0035 | executor | ✔ | Projeção de pedido_resumo e vinculo_codigo | Lote 7 | TP-0027, TP-0029, TP-0032 | Aprovada |
| 36 | TP-0036 | executor | ✔ | Projeção de linha_do_tempo | Lote 7 | TP-0013, TP-0027, TP-0032 | Aprovada |
| 37 | TP-0037 | executor | ✔ | Projeção de divergencia | Lote 7 | TP-0028, TP-0032 | Aprovada |
| 38 | TP-0038 | executor | ✔ | Projeção do documento qualidade | Lote 7 | TP-0013, TP-0027, TP-0031, TP-0032 | Aprovada |
| 39 | TP-0039 | executor | ✔ | Projeção dos documentos resumo e indicadores | Lote 7 | TP-0030, TP-0031, TP-0032, TP-0033, TP-0034 | Aprovada |
| 40 | TP-0040 | executor | ✔ | Escritor do arquivo leitura.sql | Lote 8 | TP-0032 | Aprovada |
| 41 | TP-0041 | executor | ✔ | Esqueleto do Worker e pnpm dev com site + API | Lote 8 | TP-0003 | Aprovada |
| 42 | TP-0042 | executor | ✔ | Erros centrais e cabeçalhos da API | Lote 8 | TP-0029, TP-0041 | Aprovada |
| 43 | TP-0043 | executor | ✔ | D1 de teste sobre node:sqlite | Lote 8 | TP-0040, TP-0041 | Aprovada |
| 44 | TP-0044 | executor | ✔ | CLI publicar-dados: escreve leitura.sql e carrega o D1 local | Lote 8 | TP-0035, TP-0036, TP-0037, TP-0038, TP-0039, TP-0040, TP-0041 | Aprovada |
| 45 | TP-0045 | executor | ✔ | pnpm preparar de ponta a ponta | Lote 8 | TP-0004, TP-0024, TP-0025, TP-0026, TP-0027, TP-0044 | Aprovada |
| 46 | TP-0046 | executor | ✔ | Endpoint GET /api/v1/resumo | Lote 9 | TP-0030, TP-0042, TP-0043 | Aprovada |
| 47 | TP-0047 | executor | ✔ | Endpoint GET /api/v1/divergencias | Lote 9 | TP-0030, TP-0042, TP-0043 | Aprovada |
| 48 | TP-0048 | executor | ✔ | Endpoint GET /api/v1/pedidos/{codigo}/linha-do-tempo | Lote 9 | TP-0030, TP-0042, TP-0043 | Aprovada |
| 49 | TP-0049 | executor | ✔ | Endpoint GET /api/v1/indicadores | Lote 9 | TP-0031, TP-0042, TP-0043 | Aprovada |
| 50 | TP-0050 | executor | ✔ | Endpoint GET /api/v1/qualidade | Lote 9 | TP-0031, TP-0042, TP-0043 | Aprovada |
| 51 | TP-0051 | executor | ✔ | Tokens do Modelo B e fontes auto-hospedadas | Lote 10 | TP-0003 | Aprovada |
| 52 | TP-0052 | executor | ✔ | clienteApi e gancho useConsulta | Lote 10 | TP-0003, TP-0029 | Aprovada |
| 53 | TP-0053 | executor | ✔ | Componentes de estado | Lote 10 | TP-0003 | Aprovada |
| 54 | TP-0054 | executor | ✔ | Componentes TabelaDados, EtiquetaTipo, EtiquetaFonte e Paginacao | Lote 10 | TP-0051 | Aprovada |
| 55 | TP-0055 | executor | ✔ | Casca do app: menu lateral / barra de abas, rotas e página não encontrada (T5) | Lote 11 | TP-0051 | Aprovada |
| 56 | TP-0056 | executor | ✔ | Faixa de resumo e contexto do resumo | Lote 11 | TP-0030, TP-0052, TP-0055 | Aprovada |
| 57 | TP-0057 | executor | ✔ | Busca de pedido | Lote 11 | TP-0055 | Aprovada |
| 58 | TP-0058 | executor | ✔ | Componentes CartoesResumo e FiltroTipo em chips | Lote 12 | TP-0054, TP-0056 | Aprovada |
| 59 | TP-0059 | executor | ✔ | Tela T1 Divergências: consulta, filtro e tabela | Lote 12 | TP-0052, TP-0053, TP-0055, TP-0058 | Aprovada |
| 60 | TP-0060 | executor | ✔ | Tela T1: paginação na URL | Lote 12 | TP-0059 | Aprovada |
| 61 | TP-0061 | executor | ✔ | Componente LinhaDoTempo (grade no PC, cartões no celular) | Lote 13 | TP-0054 | Aprovada |
| 62 | TP-0062 | executor | ✔ | Tela T2 Linha do tempo do pedido (sem estado em data) | Lote 13 | TP-0030, TP-0052, TP-0053, TP-0055, TP-0061 | Aprovada |
| 63 | TP-0063 | executor | ✔ | Tela T3 Indicadores (Must) | Lote 13 | TP-0031, TP-0052, TP-0053, TP-0054, TP-0055 | Aprovada |
| 64 | TP-0064 | executor | ✔ | Tela T4 Qualidade dos dados | Lote 13 | TP-0031, TP-0052, TP-0053, TP-0054, TP-0055 | Aprovada |
| 65 | TP-0065 | executor | ✔ | pnpm publicar: D1 remoto + Worker, e conferência do link | Lote 14 | TP-0045, TP-0046, TP-0047, TP-0048, TP-0049, TP-0050, TP-0057, TP-0060, TP-0062, TP-0063, TP-0064 | Aprovada |
| 66 | TP-0066 | executor | ✔ | README: o que é, como rodar, mapa de decisões e fora de propósito | Lote 14 | TP-0045 | Aprovada |
| 67 | TP-0067 | executor | ✔ | README da API e avisos de licença | Lote 14 | TP-0046, TP-0047, TP-0048, TP-0049, TP-0050, TP-0051 | Aprovada |
| 68 | TP-0068 | executor | ✔ | Domínio: tempo médio pedido→envio e envio→entrega | Lote 15 | TP-0033 | Aprovada |
| 69 | TP-0069 | executor | ✔ | Domínio: valor pago × valor devido, total e por situação | Lote 15 | TP-0033 | Aprovada |
| 70 | TP-0070 | executor | ✔ | Projeção: os 2 blocos novos no documento indicadores | Lote 15 | TP-0039, TP-0068, TP-0069 | Aprovada |
| 71 | TP-0071 | executor | ✔ | T3: seções dos indicadores complementares | Lote 15 | TP-0063, TP-0070 | Aprovada |
| 72 | TP-0072 | executor | ✔ | Componente SeletorData | Lote 16 | TP-0051 | Aprovada |
| 73 | TP-0073 | executor | ✔ | T2: estado do pedido em uma data | Lote 16 | TP-0012, TP-0062, TP-0072 | Aprovada |
| 74 | TP-0074 | executor | ✔ | Domínio: pagamento v2 com meio_pagamento | Lote 17 | TP-0009 | Aprovada |
| 75 | TP-0075 | executor | ✔ | Gerador e adaptador de pagamentos com meio_pagamento opcional | Lote 17 | TP-0021, TP-0025, TP-0074 | Aprovada |
| 76 | TP-0076 | executor | ✔ | Contrato: esquema da linha do tempo v2 | Lote 17 | TP-0030, TP-0074 | Aprovada |
| 77 | TP-0077 | executor | ✔ | Endpoint GET /api/v2/pedidos/{codigo}/linha-do-tempo | Lote 17 | TP-0048, TP-0076 | Aprovada |
| 78 | TP-0078 | executor | ✔ | Teste validação: contrato v1 e v2 e demonstração no README | Lote 17 | TP-0075, TP-0077 | Aprovada |
| 79 | TP-0079 | executor | ✔ | Tabela cache_ia no event store | Lote 18 | TP-0018 | Aprovada |
| 80 | TP-0080 | executor | ✔ | RN-11 conferência da sugestão | Lote 18 | TP-0009 | Aprovada |
| 81 | TP-0081 | executor | ✔ | Porta ProvedorSugestao, provedor falso e caso de uso sugerir | Lote 18 | TP-0027, TP-0079, TP-0080 | Aprovada |
| 82 | TP-0082 | executor | ✔ | Provedor de IA via fetch | Lote 18 | TP-0081 | Aprovada |
| 83 | TP-0083 | executor | ✔ | CLI sugerir no preparar | Lote 18 | TP-0045, TP-0081 | Aprovada |
| 84 | TP-0084 | executor | ✔ | Projeção: sugestões no documento qualidade | Lote 18 | TP-0038, TP-0081 | Aprovada |
| 85 | TP-0085 | executor | ✔ | T4: seção "Sugestões da IA" | Lote 18 | TP-0064, TP-0084 | Aprovada |
| 86 | RTP-0001 | executor | ✔ | Corrigir erros de typecheck em processamento/test/dominio/evento.test.ts após pagamento v2 | Refatoração Lote-17 | TP-0074 | Aprovada |
| 87 | RTP-0002 | executor | ✔ | Deixar pnpm typecheck verde no pacote processamento (tsconfig base e testes) | Refatoração Lote-1 | TP-0001 | Aprovada |
| 88 | RTP-0011 | executor | ✔ | Cobrir dangerouslySetInnerHTML em componentes JSX customizados no ESLint | Refatoração Lote-1 | TP-0002 | Aprovada |
| 89 | BK-0001 | coordenador | ✔ | Fazer o push da main (331 commits à frente do origin; último CI no GitHub = failure em a42 | — | — | Aprovada |
| 90 | RTP-0023 | executor | ✔ | Confirmar execução verde do CI no GitHub | Refatoração Lote-1 | BK-0001, TP-0005 | Aprovada |
| 91 | RTP-0034 | executor | ✔ | Ampliar .gitignore para variantes de segredo local | Refatoração Lote-1 | TP-0001 | Aprovada |
| 92 | RTP-0035 | executor | ✔ | Desligar persistência de credenciais no checkout do CI | Refatoração Lote-1 | TP-0005 | Aprovada |
| 93 | RTP-0039 | executor | ✔ | Zerar o backlog do pnpm lint do código dos lotes 2+ | Refatoração Lote-1 | TP-0002 | Aprovada |
| 94 | RTP-0045 | executor | ✔ | Ignorar variantes .dev.vars.* no .gitignore | Refatoração Lote-1 | RTP-0034 | Aprovada |
| 95 | BK-0002 | coordenador | ✔ | Aprovar a mudança em GUARDRAILS.md G-04 (citar problemas-plantados.json), que é do Gestor; | — | — | Aprovada |
| 96 | RTP-0046 | executor | ✔ | Alinhar a nomenclatura gabarito/problemas-plantados nos docs e na regra de fronteira | Refatoração Lote-1 | BK-0002, RTP-0039 | Aprovada |
| 97 | RTP-0049 | executor | ✔ | Dar timeout explícito ao teste da regra de fronteira do gabarito | Refatoração Lote-1 | RTP-0046 | Aprovada |
| 98 | RTP-0003 | executor | ✔ | Trocar a URL placeholder do link 'Como foi feito' pelo repositório real | Refatoração Lote-11 | TP-0055 | Aprovada |
| 99 | RTP-0018 | executor | ✔ | Teste axe do CampoBusca dentro da Casca | Refatoração Lote-11 | TP-0057 | Aprovada |
| 100 | RTP-0004 | executor | ✔ | Teste de Cache-Control no 200 de GET /api/v1/resumo | Refatoração Lote-9 | TP-0046 | Aprovada |
| 101 | RTP-0014 | executor | ✔ | Teste de rota: % e ; em código inválido devolvem 400 parametro_invalido | Refatoração Lote-9 | TP-0048 | Aprovada |
| 102 | RTP-0022 | executor | ✔ | Cobrir Cache-Control e HEAD de /api/v1/indicadores na app real | Refatoração Lote-9 | TP-0049 | Aprovada |
| 103 | RTP-0025 | executor | ✔ | Cobrir Cache-Control e HEAD sem corpo em /api/v1/qualidade | Refatoração Lote-9 | TP-0050 | Aprovada |
| 104 | RTP-0005 | executor | ✔ | LinhaDoTempo: texto 'chegou fora de ordem' e valor em mono na grade (achado QA TP-0061) | Refatoração Lote-13 | TP-0061 | Aprovada |
| 105 | RTP-0017 | executor | ✔ | Validar /?tipo= do bloco Divergências por tipo contra TipoDivergencia | Refatoração Lote-13 | TP-0063 | Aprovada |
| 106 | RTP-0006 | executor | ✔ | Nomear teste de ordenação como 'validação: ordenação' (G-07) | Refatoração Lote-2 | TP-0007 | Aprovada |
| 107 | RTP-0019 | executor | ✔ | Quitação: tolerância de R$ 0,01 robusta a ponto flutuante | Refatoração Lote-2 | TP-0009 | Aprovada |
| 108 | RTP-0036 | executor | ✔ | RN-10 tratar NaN/Infinity como valor fora do padrão | Refatoração Lote-2 | TP-0011 | Aprovada |
| 109 | RTP-0040 | executor | ✔ | Quitação: tolerância não pode absorver saldo sub-centavo (0,011) | Refatoração Lote-2 | RTP-0019 | Aprovada |
| 110 | RTP-0007 | executor | ✔ | Endurecer asserções do teste de leitura-vendas (curto/longo e somente leitura) | Refatoração Lote-4 | TP-0019 | Aprovada |
| 111 | RTP-0020 | executor | ✔ | Pagamentos: aspas quebradas no CSV viram linha_invalida sem abortar | Refatoração Lote-4 | TP-0021 | Aprovada |
| 112 | RTP-0026 | executor | ✔ | Rastreio: linha com número de colunas diferente do cabeçalho não aborta a importação | Refatoração Lote-4 | TP-0022 | Aprovada |
| 113 | RTP-0048 | executor | ✔ | Pagamentos: achado linha_invalida sem conteúdo do CSV e sem perda silenciosa de linhas | Refatoração Lote-4 | RTP-0020 | Aprovada |
| 114 | RTP-0008 | executor | ✔ | rastreio.csv: repassar 'Transportadora N' em vez do código cru de ShipVia | Refatoração Lote-5 | TP-0024 | Aprovada |
| 115 | RTP-0030 | executor | ✔ | Testes de integração pesados (gabarito/qualidade) terminam sem Unhandled Error e com ex... | Refatoração Lote-5 | TP-0028 | Aprovada |
| 116 | RTP-0009 | executor | ✔ | Tolerância de R$ 0,01 em conferirSugestao sensível a ponto flutuante | Refatoração Lote-18 | TP-0080 | Aprovada |
| 117 | RTP-0021 | executor | ✔ | Timeout na chamada do provedor de IA | Refatoração Lote-18 | TP-0082 | Aprovada |
| 118 | RTP-0027 | executor | ✔ | Passo 4 do preparar: mensagem desatualizada e ordem não testada | Refatoração Lote-18 | TP-0083 | Aprovada |
| 119 | RTP-0028 | executor | ✔ | qualidade: sugestões de IA reais aparecem em ia.sugestoes (modelo na chave de cache) | Refatoração Lote-18 | TP-0084 | Aprovada |
| 120 | RTP-0033 | executor | ✔ | README: registrar a IA (Sugestões da IA, ADR-010) como entregue | Refatoração Lote-18 | TP-0085 | Aprovada |
| 121 | RTP-0041 | executor | ✔ | qualidade: persistir o modelo em cache_ia para listar sugestões de qualquer modelo | Refatoração Lote-18 | RTP-0028 | Aprovada |
| 122 | RTP-0047 | executor | ✔ | repositorio: teste de migração do ALTER TABLE cache_ia em banco legado | Refatoração Lote-18 | RTP-0041 | Aprovada |
| 123 | RTP-0010 | executor | ✔ | Ajustar web/tsconfig.json para o typecheck do Worker (tipos Cloudflare e extensão .ts) | Refatoração Lote-8 | TP-0041 | Aprovada |
| 124 | RTP-0037 | executor | ✔ | Escritor SQL: rejeitar número não finito e valor não primitivo | Refatoração Lote-8 | TP-0040 | Aprovada |
| 125 | RTP-0038 | executor | ✔ | publicar-dados: não usar shell:true no spawn do wrangler | Refatoração Lote-8 | TP-0044 | Aprovada |
| 126 | RTP-0042 | executor | ✔ | Zerar o typecheck do pacote web (alinhar vite/vitest e tipos dos testes) | Refatoração Lote-8 | RTP-0010 | Aprovada |
| 127 | RTP-0012 | executor | ✔ | clienteApi: 5xx sem corpo RFC 9457 deve mostrar a mensagem de indisponível | Refatoração Lote-10 | TP-0052 | Aprovada |
| 128 | RTP-0013 | executor | ✔ | T2: incluir eventos do próprio dia escolhido no estado em uma data | Refatoração Lote-16 | TP-0073 | Aprovada |
| 129 | RTP-0043 | executor | ✔ | Ajustar teste de LinhaDoTempo para dataEscolhida em AAAA-MM-DD | Refatoração Lote-16 | RTP-0013 | Aprovada |
| 130 | RTP-0015 | executor | ✔ | T1 paginação: foco no caption e anúncio 'página X de Y' | Refatoração Lote-12 | TP-0060 | Aprovada |
| 131 | RTP-0044 | executor | ✔ | T1: limpar focoPendente em erro ou troca de filtro | Refatoração Lote-12 | RTP-0015 | Aprovada |
| 132 | RTP-0016 | executor | ✔ | Tipar os casos negativos de qualidade em respostas-v1.test.ts | Refatoração Lote-6 | TP-0031 | Aprovada |
| 133 | RTP-0024 | executor | ✔ | Teste de ordenação secundária por tipo em divergencias | Refatoração Lote-7 | TP-0037 | Aprovada |
| 134 | RTP-0031 | executor | ✔ | Teste de qualidade: tipos com contagem 0 e os 830 pedidos de formato curto | Refatoração Lote-7 | TP-0038 | Aprovada |
| 135 | RTP-0032 | executor | ✔ | Testar dataCorte = maior momento_fato na publicação | Refatoração Lote-7 | TP-0039 | Aprovada |
| 136 | RTP-0050 | executor | ✔ | Repositório do event store com consultas de leitura, transação e comandos preparados um... | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 137 | RTP-0051 | executor | ✔ | publicacao lê o event store só pelo repositório, com uma única conversão linha→Evento | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 138 | RTP-0052 | executor | ✔ | importar sem SQL próprio e sem repetir o corpo por fonte | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 139 | RTP-0053 | executor | ✔ | Candidatos e chave de cache da IA em um só lugar; repositório sem conexão exposta | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 140 | RTP-0054 | executor | ✔ | CLIs finas sobre uma camada de casos de uso e um módulo de configuração | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 141 | RTP-0055 | executor | ✔ | plantar-pagamentos sem blocos repetidos por caso | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 142 | RTP-0056 | executor | ✔ | Listas de tipos e fontes em um só módulo; evento v2 derivado do v1 no contrato | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 143 | RTP-0057 | executor | ✔ | Rotas v1 e v2 da linha do tempo com resolução e montagem comuns | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 144 | RTP-0058 | executor | ✔ | Rótulos e listas de tipos do site em um só módulo | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 145 | RTP-0059 | executor | ✔ | T3: um componente de bloco de indicador por arquivo | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 146 | RTP-0060 | executor | ✔ | T2: página Pedido fina, LinhaDoTempo dividida e adaptador tipado de evento | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 147 | RTP-0061 | executor | ✔ | T1: página Divergências fina | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 148 | RTP-0062 | executor | ✔ | T4: página Qualidade fina e sugestão da IA validada pelo contrato | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 149 | RTP-0063 | executor | ✔ | casca.css dividida e ícones sobre um invólucro comum | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 150 | RTP-0064 | executor | ✔ | Testes do site divididos por comportamento, com fábricas comuns | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 151 | RTP-0065 | executor | ✔ | Testes do processamento: gerador dividido e dados de teste comuns | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 152 | RTP-0066 | executor | ✔ | Comentários do processamento sem ID de tarefa, sem narração e sem texto desatualizado | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 153 | RTP-0067 | executor | ✔ | Comentários do web sem ID de tarefa, sem narração e sem texto desatualizado | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 154 | RTP-0068 | executor | ✔ | eslint.config.js sem grupos de fronteira repetidos | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 155 | RTP-0069 | executor | ✔ | Cache do CI no caminho certo e publicação em scripts dedicados (site separado dos dados) | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 156 | RTP-0070 | executor | ✔ | Checagem automática para os guardrails G-05, G-17 e G-22 | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 157 | RTP-0071 | executor | ✔ | importar.ts dentro de 300 linhas | Refatoração Revisão 2026-10-08 | RTP-0052 | Aprovada |
| 158 | RTP-0072 | executor | ✔ | Mensagem do passo sugerir impressa uma só vez | Refatoração Revisão 2026-10-08 | RTP-0054 | Aprovada |
| 159 | RTP-0073 | executor | ✔ | plantar-rastreio reaproveita a partição de pagamentos | Refatoração Revisão 2026-10-08 | RTP-0055 | Aprovada |
| 160 | RTP-0074 | executor | ✔ | Comentário de plantarCasosPagamento sem a linha quebrada | Refatoração Revisão 2026-10-08 | RTP-0055 | Aprovada |
| 161 | RTP-0075 | executor | ✔ | Teste das listas do domínio cobre também o z.enum de TIPOS_ACHADO | Refatoração Revisão 2026-10-08 | RTP-0056 | Aprovada |
| 162 | RTP-0076 | executor | ✔ | Teste de foco após erro de paginação sem falha intermitente | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 163 | RTP-0077 | executor | ✔ | Mover VALOR_TODOS para dados/rotulos e tirar a importacao nav para componentes | Refatoração Revisão 2026-10-08 | RTP-0061 | Aprovada |
| 164 | RTP-0078 | executor | ✔ | Corrigir espaco perdido em SITUACOES_PAGAMENTO em dados/rotulos.ts | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 165 | RTP-0079 | executor | ✔ | Atualizar comentário de test/casca.test.tsx que cita o casca.css removido | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 166 | RTP-0080 | executor | ✔ | Extrair para fábricas os trechos de teste ainda repetidos em web/test (linha-do-tempo W... | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 167 | RTP-0081 | executor | ✔ | Remover imports não usados deixados nos testes do processamento após extração das fábricas | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 168 | RTP-0082 | executor | ✔ | Enxugar o cabeçalho de eslint.config.js (nota de interpretação longa) e a linha em bran... | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 169 | RTP-0083 | executor | ✔ | Fechar brechas da checagem G-05: identificador entre aspas, REPLACE e ON CONFLICT DO UP... | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 170 | RTP-0084 | executor | ✔ | Apertar checagens G-17 e G-22: lista permitida por pacote, optional/peer deps e outros... | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 171 | RTP-0085 | executor | ✔ | Limitar tamanho dos textos de EsquemaSugestaoIA (contrato) e testar descarte de item gr... | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 172 | BK-0006 | coordenador | ✔ | Decidir como registrar a regra de convergência de identidade de pedido: a skill adr-drafti | — | — | Aprovada |
| 173 | RTP-0086 | executor | ✔ | Registrar no ADR-004 a regra de convergência de identidade de pedido | Refatoração Revisão 2026-10-08 | BK-0006, RTP-0071 | Aprovada |
| 174 | RTP-0087 | executor | ✔ | Investigar falha rara do teste de foco após erro de paginação (1 em 80 execuções) | Refatoração Revisão 2026-10-08 | RTP-0076 | Aprovada |
| 175 | RTP-0088 | executor | ✔ | Extrair os pares de 10 linhas que restam em linha-do-tempo v1/v2 e nos testes de acessi... | Refatoração Revisão 2026-10-08 | RTP-0080 | Aprovada |
| 176 | RTP-0089 | executor | ✔ | Mensagem do teste g17 indicar a lista do pacote certo | Refatoração Revisão 2026-10-08 | RTP-0084 | Aprovada |
| 177 | RTP-0090 | executor | ✔ | Publicação da qualidade não pode abortar por texto de sugestão acima do limite | Refatoração Revisão 2026-10-08 | RTP-0085 | Aprovada |
| 178 | RTP-0091 | executor | ✔ | Cobrir ALTER TABLE, PRAGMA writable_schema e ponto e vírgula em string na checagem G-05 | Refatoração Revisão 2026-10-08 | — | Aprovada |
| 179 | RTP-0092 | executor | ✔ | G-17 checar especificadores de versão, overrides e pacotes novos do workspace | Refatoração Revisão 2026-10-08 | RTP-0084 | Aprovada |
| 180 | RTP-0093 | executor | ✔ | Regra DO UPDATE do G-05 voltar a acusar SQL com aspas desbalanceadas ou escapadas por b... | Refatoração Revisão 2026-10-08 | RTP-0091 | Aprovada |
| 181 | RTP-0094 | executor | ✔ | G-17 cobrir overrides/catalog do pnpm-workspace.yaml e tags de texto como especificador | Refatoração Revisão 2026-10-08 | RTP-0092 | Aprovada |
| 182 | RTP-0095 | executor | ✔ | Regex DO UPDATE do G-05 sem backtracking exponencial | Refatoração Revisão 2026-10-08 | RTP-0093 | Aprovada |
| 183 | RTP-0096 | executor | ✔ | G-17 rejeitar tag de texto dentro de faixa com // e ler pnpm-workspace.yaml com BOM | Refatoração Revisão 2026-10-08 | RTP-0094 | Aprovada |
| 184 | RTP-0097 | executor | ✔ | Regex DO UPDATE do G-05 volta a acusar aspa escapada por barra seguida de string com po... | Refatoração Revisão 2026-10-08 | RTP-0095 | Aprovada |
| 185 | RTP-0098 | executor | ✔ | Tirar IDs de tarefa dos comentários de web/vite.config.ts e web/wrangler.jsonc | Refatoração Revisão 2026-10-09 | — | Aprovada |
| 186 | RTP-0099 | executor | ✔ | gabarito.test.ts usa consultas.listarEventos em vez de recriar a leitura do event store | Refatoração Revisão 2026-10-09 | — | Aprovada |
| 187 | RTP-0100 | executor | ✔ | Teste de desempenho do G-05 sem limite fixo de 50 ms (instável sob carga) | Refatoração Revisão 2026-10-09 | — | Aprovada |
| 188 | RTP-0101 | executor | ✔ | Migrar dominio e contrato para o novo pacote nucleo | Refatoração Revisão 2026-10-09 | RTP-0056, RTP-0057, RTP-0058, RTP-0062 | Aprovada |
| 189 | RTP-0102 | executor | ✔ | Teste: T2 só marca pagamento duplicado quando a API declarou a divergência duplicado | Refatoração Revisão 2026-10-09 | — | Aprovada |
| 190 | RTP-0103 | executor | ✔ | Publicar: guardar bookmark do Time Travel antes da carga do D1 e conferir version produ... | Refatoração Revisão 2026-10-09 | — | Aprovada |
| 191 | RTP-0104 | executor | ✔ | Tirar os helpers de teste do exports do nucleo (apoio/*) | Refatoração Revisão 2026-10-09 | RTP-0101 | Aprovada |
| 192 | RTP-0105 | executor | ✔ | Lint: tirar o ?. desnecessário no teste de duplicado só com divergência | Refatoração Revisão 2026-10-09 | RTP-0102 | Aprovada |
| 193 | RTP-0106 | executor | ✔ | Testes pesados de integração do processamento: Unhandled Error de timeout do Vitest (on... | Refatoração Revisão 2026-10-09 | RTP-0101 | Em execução |
| 194 | RTP-0107 | executor | ✔ | Teste: colunas de INSERCOES na fixture do web conferidas contra o DDL copiado | Refatoração Revisão 2026-10-09 | RTP-0101 | Aprovada |
| 195 | RTP-0109 | executor | ✔ | Lint: barrar import de apoio-teste fora de test/ (nucleo, processamento e web) | Refatoração Revisão 2026-10-09 | RTP-0104 | Aprovada |
| 196 | RTP-0110 | executor | ✔ | web/test/apoio/obrigatorio.ts duplica apoio-teste/obrigatorio.ts: usar o comum | Refatoração Revisão 2026-10-09 | RTP-0104 | Aprovada |
| 197 | BK-0003 | coordenador | ✔ | Decidir se dominio e contrato saem do pacote processamento para um pacote compartilhado pr | — | — | Aprovada |
| 198 | BK-0004 | coordenador | ✔ | Decidir onde roda a marcação de pagamentos duplicados (RN-03) da tela T2: hoje Pedido.tsx | — | — | Aprovada |
| 199 | BK-0005 | coordenador | ✔ | Decidir como o D1 é trocado em produção e escrever a subseção Troca de dados em produção d | — | — | Aprovada |
