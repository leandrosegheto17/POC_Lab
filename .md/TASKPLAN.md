# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-08 00:08

Resumo: Não executada 85 · total 85

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Monorepo pnpm, tsconfig base e pacote processamento vazio com Vitest | Lote 1 | — | Não executada |
| 2 | TP-0002 | executor | ✔ | ESLint 9 com fronteiras de módulo e proibições | Lote 1 | TP-0001 | Não executada |
| 3 | TP-0003 | executor | ✔ | Pacote web vazio: Vite, React 19, React Router, Vitest jsdom, Testing Library, vitest-axe | Lote 1 | TP-0001 | Não executada |
| 4 | TP-0004 | executor | ✔ | CLI baixar-base com URL fixada em commit e SHA-256 | Lote 1 | TP-0001 | Não executada |
| 5 | TP-0005 | executor | ✔ | CI no GitHub Actions | Lote 1 | TP-0002, TP-0003, TP-0004 | Não executada |
| 6 | TP-0006 | executor | ✔ | Contrato de evento v1 e tipos do modelo comum | Lote 2 | TP-0001 | Não executada |
| 7 | TP-0007 | executor | ✔ | RN-07 ordenação canônica dos eventos | Lote 2 | TP-0006 | Não executada |
| 8 | TP-0008 | executor | ✔ | RN-01 valor devido do pedido | Lote 2 | TP-0006 | Não executada |
| 9 | TP-0009 | executor | ✔ | RN-02 quitação e saldo do pedido | Lote 2 | TP-0006 | Não executada |
| 10 | TP-0010 | executor | ✔ | RN-09 normalização e casamento da referência de pagamento | Lote 2 | TP-0006 | Não executada |
| 11 | TP-0011 | executor | ✔ | RN-10 valores fora do padrão | Lote 2 | TP-0006 | Não executada |
| 12 | TP-0012 | executor | ✔ | Estado derivado do pedido até uma data | Lote 3 | TP-0007, TP-0009 | Não executada |
| 13 | TP-0013 | executor | ✔ | RN-08 eventos recebidos fora de ordem | Lote 3 | TP-0007 | Não executada |
| 14 | TP-0014 | executor | ✔ | RN-03 pagamento duplicado | Lote 3 | TP-0009 | Não executada |
| 15 | TP-0015 | executor | ✔ | RN-04 pagamento parcial | Lote 3 | TP-0009 | Não executada |
| 16 | TP-0016 | executor | ✔ | RN-05 pago e não enviado / enviado e não pago, com data de corte RN-14 | Lote 3 | TP-0012 | Não executada |
| 17 | TP-0017 | executor | ✔ | RN-06 entrega atrasada | Lote 3 | TP-0006 | Não executada |
| 18 | TP-0018 | executor | ✔ | Schema do event store e repositório SQLite idempotente | Lote 4 | TP-0006 | Não executada |
| 19 | TP-0019 | executor | ✔ | Leitura somente leitura da base de vendas e normalização das datas | Lote 4 | TP-0004, TP-0006 | Não executada |
| 20 | TP-0020 | executor | ✔ | Adaptador de vendas: vínculos, evento venda e achados | Lote 4 | TP-0008, TP-0011, TP-0019 | Não executada |
| 21 | TP-0021 | executor | ✔ | Adaptador de pagamentos.csv | Lote 4 | TP-0010, TP-0011 | Não executada |
| 22 | TP-0022 | executor | ✔ | Adaptador de rastreio.csv | Lote 4 | TP-0006 | Não executada |
| 23 | TP-0023 | executor | ✔ | Gerador base: PRNG com semente, pedidos limpos, pagamentos.csv sem problemas e CLI gerar | Lote 5 | TP-0019 | Não executada |
| 24 | TP-0024 | executor | ✔ | Gerador base: rastreio.csv sem problemas | Lote 5 | TP-0023 | Não executada |
| 25 | TP-0025 | executor | ✔ | Gerador: plantar casos de pagamento | Lote 5 | TP-0023 | Não executada |
| 26 | TP-0026 | executor | ✔ | Gerador: plantar casos de rastreio | Lote 5 | TP-0024 | Não executada |
| 27 | TP-0027 | executor | ✔ | Caso de uso importar com identidade própria e CLI | Lote 5 | TP-0018, TP-0020, TP-0021, TP-0022 | Não executada |
| 28 | TP-0028 | executor | ✔ | Lista de divergências do pedido e teste de M1 contra o gabarito | Lote 5 | TP-0014, TP-0015, TP-0016, TP-0017, TP-0025, TP-0026, TP-0027 | Não executada |
| 29 | TP-0029 | executor | ✔ | Contrato base da API: erro RFC 9457, paginação, parâmetros e normalização do código | Lote 6 | TP-0006 | Não executada |
| 30 | TP-0030 | executor | ✔ | Esquemas de resposta v1: resumo, divergências e linha do tempo | Lote 6 | TP-0029 | Não executada |
| 31 | TP-0031 | executor | ✔ | Esquemas de resposta v1: indicadores e qualidade | Lote 6 | TP-0029 | Não executada |
| 32 | TP-0032 | executor | ✔ | Schema SQL das visões de leitura do D1 | Lote 6 | TP-0006 | Não executada |
| 33 | TP-0033 | executor | ✔ | Indicadores Must no domínio | Lote 7 | TP-0017, TP-0028 | Não executada |
| 34 | TP-0034 | executor | ✔ | Totais do resumo no domínio (cartões da T1) | Lote 7 | TP-0033 | Não executada |
| 35 | TP-0035 | executor | ✔ | Projeção de pedido_resumo e vinculo_codigo | Lote 7 | TP-0027, TP-0029, TP-0032 | Não executada |
| 36 | TP-0036 | executor | ✔ | Projeção de linha_do_tempo | Lote 7 | TP-0013, TP-0027, TP-0032 | Não executada |
| 37 | TP-0037 | executor | ✔ | Projeção de divergencia | Lote 7 | TP-0028, TP-0032 | Não executada |
| 38 | TP-0038 | executor | ✔ | Projeção do documento qualidade | Lote 7 | TP-0013, TP-0027, TP-0031, TP-0032 | Não executada |
| 39 | TP-0039 | executor | ✔ | Projeção dos documentos resumo e indicadores | Lote 7 | TP-0030, TP-0031, TP-0032, TP-0033, TP-0034 | Não executada |
| 40 | TP-0040 | executor | ✔ | Escritor do arquivo leitura.sql | Lote 8 | TP-0032 | Não executada |
| 41 | TP-0041 | executor | ✔ | Esqueleto do Worker e pnpm dev com site + API | Lote 8 | TP-0003 | Não executada |
| 42 | TP-0042 | executor | ✔ | Erros centrais e cabeçalhos da API | Lote 8 | TP-0029, TP-0041 | Não executada |
| 43 | TP-0043 | executor | ✔ | D1 de teste sobre node:sqlite | Lote 8 | TP-0040, TP-0041 | Não executada |
| 44 | TP-0044 | executor | ✔ | CLI publicar-dados: escreve leitura.sql e carrega o D1 local | Lote 8 | TP-0035, TP-0036, TP-0037, TP-0038, TP-0039, TP-0040, TP-0041 | Não executada |
| 45 | TP-0045 | executor | ✔ | pnpm preparar de ponta a ponta | Lote 8 | TP-0004, TP-0024, TP-0025, TP-0026, TP-0027, TP-0044 | Não executada |
| 46 | TP-0046 | executor | ✔ | Endpoint GET /api/v1/resumo | Lote 9 | TP-0030, TP-0042, TP-0043 | Não executada |
| 47 | TP-0047 | executor | ✔ | Endpoint GET /api/v1/divergencias | Lote 9 | TP-0030, TP-0042, TP-0043 | Não executada |
| 48 | TP-0048 | executor | ✔ | Endpoint GET /api/v1/pedidos/{codigo}/linha-do-tempo | Lote 9 | TP-0030, TP-0042, TP-0043 | Não executada |
| 49 | TP-0049 | executor | ✔ | Endpoint GET /api/v1/indicadores | Lote 9 | TP-0031, TP-0042, TP-0043 | Não executada |
| 50 | TP-0050 | executor | ✔ | Endpoint GET /api/v1/qualidade | Lote 9 | TP-0031, TP-0042, TP-0043 | Não executada |
| 51 | TP-0051 | executor | ✔ | Tokens do Modelo B e fontes auto-hospedadas | Lote 10 | TP-0003 | Não executada |
| 52 | TP-0052 | executor | ✔ | clienteApi e gancho useConsulta | Lote 10 | TP-0003, TP-0029 | Não executada |
| 53 | TP-0053 | executor | ✔ | Componentes de estado | Lote 10 | TP-0003 | Não executada |
| 54 | TP-0054 | executor | ✔ | Componentes TabelaDados, EtiquetaTipo, EtiquetaFonte e Paginacao | Lote 10 | TP-0051 | Não executada |
| 55 | TP-0055 | executor | ✔ | Casca do app: menu lateral / barra de abas, rotas e página não encontrada (T5) | Lote 11 | TP-0051 | Não executada |
| 56 | TP-0056 | executor | ✔ | Faixa de resumo e contexto do resumo | Lote 11 | TP-0030, TP-0052, TP-0055 | Não executada |
| 57 | TP-0057 | executor | ✔ | Busca de pedido | Lote 11 | TP-0055 | Não executada |
| 58 | TP-0058 | executor | ✔ | Componentes CartoesResumo e FiltroTipo em chips | Lote 12 | TP-0054, TP-0056 | Não executada |
| 59 | TP-0059 | executor | ✔ | Tela T1 Divergências: consulta, filtro e tabela | Lote 12 | TP-0052, TP-0053, TP-0055, TP-0058 | Não executada |
| 60 | TP-0060 | executor | ✔ | Tela T1: paginação na URL | Lote 12 | TP-0059 | Não executada |
| 61 | TP-0061 | executor | ✔ | Componente LinhaDoTempo (grade no PC, cartões no celular) | Lote 13 | TP-0054 | Não executada |
| 62 | TP-0062 | executor | ✔ | Tela T2 Linha do tempo do pedido (sem estado em data) | Lote 13 | TP-0030, TP-0052, TP-0053, TP-0055, TP-0061 | Não executada |
| 63 | TP-0063 | executor | ✔ | Tela T3 Indicadores (Must) | Lote 13 | TP-0031, TP-0052, TP-0053, TP-0054, TP-0055 | Não executada |
| 64 | TP-0064 | executor | ✔ | Tela T4 Qualidade dos dados | Lote 13 | TP-0031, TP-0052, TP-0053, TP-0054, TP-0055 | Não executada |
| 65 | TP-0065 | executor | ✔ | pnpm publicar: D1 remoto + Worker, e conferência do link | Lote 14 | TP-0045, TP-0046, TP-0047, TP-0048, TP-0049, TP-0050, TP-0057, TP-0060, TP-0062, TP-0063, TP-0064 | Não executada |
| 66 | TP-0066 | executor | ✔ | README: o que é, como rodar, mapa de decisões e fora de propósito | Lote 14 | TP-0045 | Não executada |
| 67 | TP-0067 | executor | ✔ | README da API e avisos de licença | Lote 14 | TP-0046, TP-0047, TP-0048, TP-0049, TP-0050, TP-0051 | Não executada |
| 68 | TP-0068 | executor | ✔ | Domínio: tempo médio pedido→envio e envio→entrega | Lote 15 | TP-0033 | Não executada |
| 69 | TP-0069 | executor | ✔ | Domínio: valor pago × valor devido, total e por situação | Lote 15 | TP-0033 | Não executada |
| 70 | TP-0070 | executor | ✔ | Projeção: os 2 blocos novos no documento indicadores | Lote 15 | TP-0039, TP-0068, TP-0069 | Não executada |
| 71 | TP-0071 | executor | ✔ | T3: seções dos indicadores complementares | Lote 15 | TP-0063, TP-0070 | Não executada |
| 72 | TP-0072 | executor | ✔ | Componente SeletorData | Lote 16 | TP-0051 | Não executada |
| 73 | TP-0073 | executor | ✔ | T2: estado do pedido em uma data | Lote 16 | TP-0012, TP-0062, TP-0072 | Não executada |
| 74 | TP-0074 | executor | ✔ | Domínio: pagamento v2 com meio_pagamento | Lote 17 | TP-0009 | Não executada |
| 75 | TP-0075 | executor | ✔ | Gerador e adaptador de pagamentos com meio_pagamento opcional | Lote 17 | TP-0021, TP-0025, TP-0074 | Não executada |
| 76 | TP-0076 | executor | ✔ | Contrato: esquema da linha do tempo v2 | Lote 17 | TP-0030, TP-0074 | Não executada |
| 77 | TP-0077 | executor | ✔ | Endpoint GET /api/v2/pedidos/{codigo}/linha-do-tempo | Lote 17 | TP-0048, TP-0076 | Não executada |
| 78 | TP-0078 | executor | ✔ | Teste validação: contrato v1 e v2 e demonstração no README | Lote 17 | TP-0075, TP-0077 | Não executada |
| 79 | TP-0079 | executor | ✔ | Tabela cache_ia no event store | Lote 18 | TP-0018 | Não executada |
| 80 | TP-0080 | executor | ✔ | RN-11 conferência da sugestão | Lote 18 | TP-0009 | Não executada |
| 81 | TP-0081 | executor | ✔ | Porta ProvedorSugestao, provedor falso e caso de uso sugerir | Lote 18 | TP-0027, TP-0079, TP-0080 | Não executada |
| 82 | TP-0082 | executor | ✔ | Provedor de IA via fetch | Lote 18 | TP-0081 | Não executada |
| 83 | TP-0083 | executor | ✔ | CLI sugerir no preparar | Lote 18 | TP-0045, TP-0081 | Não executada |
| 84 | TP-0084 | executor | ✔ | Projeção: sugestões no documento qualidade | Lote 18 | TP-0038, TP-0081 | Não executada |
| 85 | TP-0085 | executor | ✔ | T4: seção "Sugestões da IA" | Lote 18 | TP-0064, TP-0084 | Não executada |
