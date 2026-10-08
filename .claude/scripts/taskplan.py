#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""taskplan.py — gera e atualiza .md/TASKPLAN.md (ordem de execução e estado de cada tarefa).

Uso (a partir da raiz do projeto):
  python .claude/scripts/taskplan.py gerar              # reconstrói o TASKPLAN.md a partir do TASK.md e de .md/.taskplan/
  python .claude/scripts/taskplan.py set ID ESTADO      # troca só o estado de uma linha (ID: TP-0001, RTP-0003, SPK-0001, BK-0002, T-001)
  python .claude/scripts/taskplan.py estados            # lista os estados válidos
  python .claude/scripts/taskplan.py proxima [--etapa exe|qa|sec] [--lote N] [--pular ID,ID] [--n K] [--lotes-distintos]   # próxima(s) tarefa(s) elegível(is) da etapa (padrão exe)
  python .claude/scripts/taskplan.py reservar ID TOKEN [--assumir] [--etapa "Em execução|Em QA|Em DevSecOps"]   # reserva por sessão (OK | OCUPADA)
  python .claude/scripts/taskplan.py etapa ID TOKEN "Em execução|Em QA|Em DevSecOps"
  python .claude/scripts/taskplan.py iniciar ID TOKEN [--etapa "Em execução|Em QA|Em DevSecOps"] [--snap]   # reservar + etapa + status local (+ snapshot "antes")
  python .claude/scripts/taskplan.py concluir ID TOKEN executada|qa-ok|sec-ok|devolvida [--snap] [--motivo "..."]   # status local + libera a reserva (+ snapshot "depois"; devolução conta)
  python .claude/scripts/taskplan.py diff ID                          # diff da tarefa (snapshot antes..depois; senão commits que começam pelo ID)
  python .claude/scripts/taskplan.py fila [--bloqueios]               # /desenvolver: tamanho das filas exe/qa/sec, travadas e impressão digital do estado
  python .claude/scripts/taskplan.py consolidar                        # grava os Status locais no TASK.md, anexa os resumos de QA/Sec aos relatórios e regera o TASKPLAN.md (fim da rodada)
  python .claude/scripts/taskplan.py liberar ID Livre|Concluída|Bloqueada
  python .claude/scripts/taskplan.py status ID "<texto do Status>"    # grava o Status (TASK.md ou arquivo BK) e o estado no TASKPLAN.md
  python .claude/scripts/taskplan.py proximo-id RTP|BK|SPK|TP       # próximo ID livre do prefixo
  python .claude/scripts/taskplan.py nova --id RTP-0001 --grupo "Refatoração Lote-3" --lote ... --titulo ... \
        --chapeu ... --reqs ... --aceite ... --est ... --dep ... --par ... --arquivos ... --testes ... [--apos ID] [--status Pendente]
  python .claude/scripts/taskplan.py deps-substituir ID-ANTIGO ID1,ID2   # reaponta dependências no TASK.md
  python .claude/scripts/taskplan.py tarefa ID                       # cabeçalho e estado da tarefa (sem ler o TASK.md)
  python .claude/scripts/taskplan.py bloquear ID|- --por QUEM --escala QUEM-DECIDE --motivo "..." [--impacto "..."] [--sugestao "..."]
        [--tipo bk|spk] [--pergunta "..."] [--timebox "1 d"]
        # registra a entrada em .md/BLOCKERS.md E abre um BK-nnnn (ou SPK-nnnn, spike) em .md/.taskplan com a descrição do que
        # fazer; põe o BK/SPK na Dep da tarefa ID, marca a tarefa Bloqueada e reordena o TASKPLAN.md. ID "-" = sem tarefa afetada.
  python .claude/scripts/taskplan.py desbloquear BK-nnnn|SPK-nnnn "<resolução>"   # fecha o BK/SPK e a entrada do BLOCKERS.md, devolve as tarefas à fila e reordena
  python .claude/scripts/taskplan.py despriorizar ID [--motivo "..."]   # decisão do usuário: vai para o fim da lista e é ignorada por executar/testar/validar; a versão de distribuição exige tê-la Aprovada
  python .claude/scripts/taskplan.py repriorizar ID                   # desfaz: restaura o Status que a tarefa tinha
  python .claude/scripts/taskplan.py ordenar                          # /organizar --ordenar: só reordena o TASKPLAN.md (fila final) e relata
  python .claude/scripts/taskplan.py migrar [--confirmar] [--sem-git]  # /organizar --migrar (ver abaixo). Sem --confirmar é só relatório.

A FILA É A ORDEM DO TASKPLAN.md: /executar (`proxima`) e /listar leem a mesma ordem. `gerar` já a entrega final:
dependências antes dos dependentes e, para as tarefas bloqueadas, (a) bloqueada que nenhuma tarefa em aberto espera
vai para o fim da fila, com o BK imediatamente antes; (b) bloqueada da qual outras dependem fica no lugar, com o BK
logo antes dela. `bloquear`, `desbloquear` e `status` (quando mexe em Bloqueada) reordenam sozinhos, para o
/executar --continuar nunca parar numa tarefa que não pode rodar.

IDs padrão: TP-0000 (tarefa), RTP-0000 (refatoração), SPK-0000 (spike), BK-0000 (bloqueio).
TP/RTP são do Executor; SPK/BK são do Coordenador (agente registrado na coluna Agente).

O parser do TASK.md é guiado pelos NOMES das colunas (ID, Lote, Tarefa/Título, Chapéu/Time, Est, Aceite,
Depende de/Dep, Par, Status), não por posição: serve a tabelas de 9, 12 ou mais colunas. O lote, quando não
há coluna Lote, vem do título `### ...` acima da tabela.

Objetivo: o /executar não lê o TASK.md inteiro. Toda leitura passa pelo TASKPLAN.md e por
.md/.taskplan/<ID>.md; toda escrita no TASK.md é feita aqui, só na linha afetada.

O TASK.md continua sendo a fonte de verdade do Status das tarefas; o TASKPLAN.md é a visão ordenada.
DURANTE UMA RODADA (/executar, /testar, /validar) nada disso é reescrito: o estado vive só no arquivo da tarefa
(.md/.taskplan/<ID>.md, linhas `Reserva:` e `Status-local:`), que `proxima`/`tarefa` leem por cima do TASKPLAN.md.
`consolidar` (fim da rodada, ou antes de /listar e /deploy) grava os Status locais no TASK.md e regera o TASKPLAN.md.
A raiz do projeto é a da árvore principal (git-common-dir), mesmo quando o script roda numa worktree.
Bloqueios (BK) e spikes abertos durante a execução (SPK) vivem em .md/.taskplan/BK-0000.md / SPK-0000.md e também têm entrada em .md/BLOCKERS.md (que continua sendo escrito). `gerar` deriva o estado do Status e da linha
`Reserva:` do arquivo da tarefa (a reserva, quando ativa, tem prioridade).

`migrar` (projetos em andamento): renomeia os IDs do TASK.md e dos demais .md (TP/RTP/SPK, mapa antigo->novo
em .md/TASKPLAN-IDS.json), converte .md/BLOCKERS.md em arquivos BK-0000, apaga e regera .md/.taskplan e o
TASKPLAN.md (aprovadas/divididas ganham um arquivo curto sem planejamento; as em aberto ficam com seções
PENDENTE para o Executor preencher). Exige .md/ limpo no git (o git é o backup).
"""
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

CWD = os.getcwd()


def _raiz():
    """Raiz da árvore principal: estado/reservas vivem lá, mesmo que o script rode numa worktree."""
    env = os.environ.get('TASKPLAN_ROOT')
    if env:
        return env
    try:
        r = subprocess.run(['git', 'rev-parse', '--git-common-dir'], cwd=CWD, capture_output=True, text=True)
        gd = os.path.abspath(os.path.join(CWD, r.stdout.strip()))
        if r.returncode == 0 and os.path.basename(gd) == '.git':
            return os.path.dirname(gd)
    except Exception:
        pass
    return CWD


ROOT = _raiz()
MD = os.path.join(ROOT, '.md')
TASK = os.path.join(MD, 'TASK.md')
PLANDIR = os.path.join(MD, '.taskplan')
OUT = os.path.join(MD, 'TASKPLAN.md')
BLOCKERS = os.path.join(MD, 'BLOCKERS.md')
IDS_JSON = os.path.join(MD, 'TASKPLAN-IDS.json')

ESTADOS = [
    'Não executada',
    'Em execução',
    'Executada (aguarda teste)',
    'Em teste',
    'Testada (aguarda segurança)',
    'Em validação de segurança',
    'Aprovada',
    'Bloqueada',
    'Dividida',
    'Despriorizada',
]
# estados elegíveis por etapa do /executar (exe), /testar (qa) e /validar (sec); inclui o em-curso (retomada)
ETAPAS_ELEG = {
    'exe': ('Não executada', 'Em execução'),
    'qa': ('Executada (aguarda teste)', 'Em teste'),
    'sec': ('Testada (aguarda segurança)', 'Em validação de segurança'),
}
ID_RE = re.compile(r'\b(?:RTP-\d+[a-z]*|SPK-\d+[a-z]*|TP-\d+[a-z]*|BK-\d+|T-\d+)\b')
STD_RE = re.compile(r'^(?:RTP|SPK|TP)-\d+[a-z]*$')
LEGADO_T_RE = re.compile(r'^T-\d+[a-z]*$')
STATUS_RE = re.compile(r'\|\s*(?=[*_`]*(?:Concluída|Pendente|Em andamento|Bloqueada|Dividida|Despriorizada|Aguardando))')
COORD = ('BK-', 'SPK-')  # tarefas do Coordenador (com o usuário); as demais são do Executor


def agente(key):
    return 'coordenador' if key.startswith(COORD) else 'executor'


# ----------------------------------------------------------------- leitura de tabelas do TASK.md
def _tokenize(line, ticks):
    cells, cur, tick, i = [], [], False, 0
    while i < len(line):
        ch = line[i]
        if ch == chr(92) and i + 1 < len(line) and line[i + 1] == '|':  # pipe escapado com barra
            cur.append(line[i:i + 2])
            i += 2
            continue
        if ch == '`' and ticks:
            tick = not tick
        if ch == '|' and not tick:
            cells.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(ch)
        i += 1
    cells.append(''.join(cur).strip())
    return cells


def _inner(line):
    s = line.strip()
    if s.startswith('|'):
        s = s[1:]
    if s.endswith('|'):
        s = s[:-1]
    return s


def split_status(line):
    """(prefixo até o separador do Status, texto do Status). O Status é a última célula e começa por
    Concluída/Pendente/Em andamento/Bloqueada/Dividida/Aguardando — dispensa contar separadores
    (o texto do Status pode ter '|')."""
    ms = list(STATUS_RE.finditer(line))
    if ms:
        m = ms[-1]
        return line[:m.start() + 1], line[m.end():].strip().rstrip('|').strip()
    corpo = line.rstrip()
    corpo = corpo[:-1] if corpo.endswith('|') else corpo
    if ' | ' not in corpo:
        return corpo + ' |', ''
    pre, st = corpo.rsplit(' | ', 1)
    return pre + ' |', st.strip()


def split_cells(line, n=12):
    """Divide uma linha de tabela markdown em n células. Ignora '|' escapado e, quando as crases estão
    balanceadas, '|' dentro de crases; se a contagem não fechar em n, tenta sem a regra das crases."""
    s = _inner(line)
    for ticks in (True, False):
        c = _tokenize(s, ticks)
        if len(c) == n:
            return c
    return _tokenize(s, True)


def row_cells(line, n, status_last):
    c = split_cells(line, n)
    if len(c) == n:
        return c
    if status_last:  # há '|' solto numa célula: o Status é achado pelo texto e o resto é dividido
        pre, st = split_status(line)
        c = _tokenize(_inner(pre), True)
        c = c[:n - 1] + [''] * max(0, n - 1 - len(c)) + [st]
        return c
    return (c + [''] * n)[:n]


COLS = (
    ('id', ('id',)), ('lote', ('lote',)), ('titulo', ('tarefa', 'título', 'titulo')),
    ('chapeu', ('chap', 'time', 'agente')), ('reqs', ('req', 'origem')), ('aceite', ('crit', 'aceite')),
    ('est', ('est',)), ('dep', ('dep',)), ('par', ('par',)), ('arquivos', ('arq',)),
    ('testes', ('test',)), ('status', ('status',)),
)


def col_key(h):
    h = re.sub(r'[*`_]', '', h).strip().lower()
    for k, prefs in COLS:
        if h.startswith(prefs):
            return k
    return None


def clean_id(s):
    return re.sub(r'[*`\s]', '', s)


def tabelas():
    """Tabelas de tarefas da Seção 3 do TASK.md: [{'cols', 'header', 'grupo', 'rows'}]. Cada linha:
    id, lote, grupo, titulo, chapeu, reqs, aceite, est, dep, par, status, line (índice), cells."""
    lines = read_lines(TASK)
    sec, heading, cur, out = False, '', None, []
    for n, l in enumerate(lines):
        if l.startswith('## 3.'):
            sec = True
            continue
        if sec and l.startswith('## '):
            break
        if not sec:
            continue
        if l.startswith('### '):
            heading, cur = l[4:].strip(), None
            continue
        if not l.startswith('|'):
            if l.strip():  # linha em branco dentro da tabela não a encerra; texto, sim
                cur = None
            continue
        cab = _tokenize(_inner(l), True)
        if clean_id(cab[0]).lower() == 'id':
            cur = {'cols': [col_key(h) for h in cab], 'header': cab, 'rows': [],
                   'grupo': re.split(r'\s[—–-]\s', heading)[0].strip()}
            out.append(cur)
            continue
        if re.fullmatch(r'\|[\s:|-]+\|?', l.strip()) or cur is None:  # separador |---| ou tabela que não é de tarefas
            continue
        cols = cur['cols']
        ncols = len(cols)
        status_last = cols[-1] == 'status'
        cells = row_cells(l, ncols, status_last)
        row = {k: '' for k, _ in COLS}
        for k, v in zip(cols, cells):
            if k:
                row[k] = v
        if status_last:
            row['status'] = split_status(l)[1]
        row['id'] = clean_id(row['id'])
        row['titulo'] = re.sub(r'\s+', ' ', row['titulo'])
        row['grupo'] = cur['grupo']
        row['lote_col'] = row['lote']
        row['lote'] = row['lote'] or cur['grupo']
        row.update({'line': n, 'cells': cells, 'tab': cur})
        cur['rows'].append(row)
    return out


def norm(i):
    """T-001 -> TP-0001 (chave comum); TP-/RTP-/SPK-/BK- ficam como estão."""
    m = re.fullmatch(r'T-(\d+)', i)
    if m:
        return 'TP-%04d' % int(m.group(1))
    return i


def read_tasks():
    rows = [r for t in tabelas() for r in t['rows']]
    ruins = [r['id'] for r in rows if not (STD_RE.match(r['id']) or LEGADO_T_RE.match(r['id']))]
    if ruins:
        sys.exit('TASK.md fora do padrão de IDs (%s%s). Rode `/organizar --migrar`.' % (
            ', '.join(ruins[:6]), '…' if len(ruins) > 6 else ''))
    tasks = [{'id': r['id'], 'key': norm(r['id']), 'lote': r['lote'], 'titulo': r['titulo'],
              'dep': [norm(x) for x in ID_RE.findall(r['dep'])], 'status': r['status']} for r in rows]
    ja = {x['key'] for x in tasks}
    tasks += [b for b in read_bks() if b['key'] not in ja]
    return tasks


def read_bks():
    """Bloqueios (BK) vivem só em .md/.taskplan/BK-0000.md: linha `Status:` no cabeçalho."""
    out = []
    if not os.path.isdir(PLANDIR):
        return out
    for f in sorted(os.listdir(PLANDIR)):
        if not re.fullmatch(r'(?:BK|SPK)-\d+\.md', f):
            continue
        key = f[:-3]
        titulo, status = key, 'Pendente'
        for n, l in enumerate(read_lines(os.path.join(PLANDIR, f))):
            if n == 0:
                titulo = re.sub(r'^#\s*(?:BK|SPK)-\d+\s*[—-]\s*', '', l).strip() or key
            if l.startswith('Status:'):
                status = l.split(':', 1)[1].strip()
                break
            if n > 14:
                break
        out.append({'id': key, 'key': key, 'lote': '—', 'titulo': titulo[:90], 'dep': [], 'status': status})
    return out


def reserva(key):
    p = os.path.join(PLANDIR, key + '.md')
    if not os.path.exists(p):
        return None, False
    with open(p, encoding='utf-8') as f:
        for n, l in enumerate(f):
            if l.startswith('Reserva:'):
                return l.split(':', 1)[1].strip(), True
            if n > 12:
                break
    return None, True


LOCAL = 'Status-local:'


def status_local(key):
    """Status gravado só no arquivo da tarefa durante a rodada (None = não há)."""
    p = os.path.join(PLANDIR, key + '.md')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        for n, l in enumerate(f):
            if l.startswith(LOCAL):
                return l.split(':', 1)[1].strip()
            if n > 15:
                break
    return None


def estado(t):
    loc = status_local(t['key'])
    if loc is not None:
        t = dict(t, status=loc)
    if re.sub(r'^[*_`\s]+', '', t['status']).startswith('Despriorizada'):
        return 'Despriorizada'  # decisão do usuário: vale mesmo sobre reserva velha
    rv, _ = reserva(t['key'])
    if rv:
        if rv.startswith('Em execução'):
            return 'Em execução'
        if rv.startswith('Em QA'):
            return 'Em teste'
        if rv.startswith('Em DevSecOps'):
            return 'Em validação de segurança'
    s = re.sub(r'^[*_`\s]+', '', t['status'])  # Status em negrito/itálico (`**Concluída**`) vale igual
    if s.startswith('Bloqueada'):
        return 'Bloqueada'
    if s.startswith('Dividida'):
        return 'Dividida'
    if s.startswith('Concluída'):
        qa = 'QA ✔' in s
        sec = 'Sec ✔' in s
        if qa and sec:
            return 'Aprovada'
        if qa:
            return 'Testada (aguarda segurança)'
        if 'aguarda QA' in s:
            return 'Executada (aguarda teste)'
        return 'Aprovada'  # legado: concluída por fluxos antigos, sem marcadores
    if s.startswith('Em andamento'):
        return 'Em execução'
    return 'Não executada'


def ordenar(tasks):
    """Ordem do TASK.md, adiantando só o necessário para dependências virem antes."""
    by = {t['key']: t for t in tasks}
    pos = {t['key']: i for i, t in enumerate(tasks)}
    done, out, visiting = set(), [], set()

    def visit(t):
        if t['key'] in done or t['key'] in visiting:
            return
        visiting.add(t['key'])
        for d in sorted(t['dep'], key=lambda x: pos.get(x, 10 ** 9)):
            if d in by and d != t['key']:
                visit(by[d])
        visiting.discard(t['key'])
        if t['key'] not in done:
            done.add(t['key'])
            out.append(t)

    for t in tasks:
        visit(t)
    return out


def reordenar_bloqueios(tasks):
    """Ajusta a fila para as tarefas bloqueadas (ver docstring do módulo)."""
    est = {t['key']: estado(t) for t in tasks}
    abertas = {t['key'] for t in tasks if est[t['key']] != 'Aprovada'}
    dependentes = {}
    for t in tasks:
        if t['key'] in abertas:
            for d in t['dep']:
                if d in abertas and not d.startswith(COORD):
                    dependentes.setdefault(d, set()).add(t['key'])
    bloq = [t for t in tasks if est[t['key']] == 'Bloqueada' and not t['key'].startswith(COORD)]
    fim = [t for t in bloq if not dependentes.get(t['key'])]
    fim_keys = {t['key'] for t in fim}
    bks_de = {t['key']: [d for d in t['dep'] if d.startswith(COORD) and d in abertas] for t in bloq}
    todos_bk = {b for lst in bks_de.values() for b in lst}
    mover = {b for b in todos_bk if all(k in fim_keys for k, lst in bks_de.items() if b in lst)}
    ficam = todos_bk - mover  # BK que bloqueia alguma tarefa que não vai para o fim: fica antes da primeira dela
    by = {t['key']: t for t in tasks}
    base = [t for t in tasks if t['key'] not in fim_keys and t['key'] not in mover and t['key'] not in ficam]
    out, emitidos = [], set()
    for t in base:
        for b in bks_de.get(t['key'], []):
            if b in ficam and b not in emitidos and b in by:
                out.append(by[b])
                emitidos.add(b)
        out.append(t)
    for t in fim:
        for b in bks_de.get(t['key'], []):
            if b in mover and b not in emitidos and b in by:
                out.append(by[b])
                emitidos.add(b)
        out.append(t)
    # BK em aberto sem tarefa bloqueada associada (ou tarefa cujo BK não entrou): mantém a posição original
    pos = {t['key']: i for i, t in enumerate(tasks)}
    for r in [t for t in tasks if t not in out]:
        i = next((n for n, t in enumerate(out) if pos[t['key']] > pos[r['key']]), len(out))
        out.insert(i, r)
    return out


def reordenar_despriorizadas(tasks):
    """Despriorizada vai para o fim da fila (depois das bloqueadas), com o BK/SPK que só ela espera logo antes."""
    est = {t['key']: estado(t) for t in tasks}
    desp = [t for t in tasks if est[t['key']] == 'Despriorizada']
    if not desp:
        return tasks
    dk = {t['key'] for t in desp}
    abertas = {t['key'] for t in tasks if est[t['key']] != 'Aprovada'}
    esperados = {}
    for t in tasks:
        if t['key'] in abertas:
            for d in t['dep']:
                if d.startswith(COORD) and d in abertas:
                    esperados.setdefault(d, set()).add(t['key'])
    acompanha = {b for b, ks in esperados.items() if ks and ks <= dk}
    base = [t for t in tasks if t['key'] not in dk and t['key'] not in acompanha]
    fim = []
    for t in desp:
        for b in tasks:
            if b['key'] in acompanha and t['key'] in esperados.get(b['key'], ()) and b not in fim:
                fim.append(b)
        fim.append(t)
    return base + fim + [b for b in tasks if b['key'] in acompanha and b not in fim]


def agora():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M')


def gerar():
    tasks = reordenar_despriorizadas(reordenar_bloqueios(ordenar(read_tasks())))
    rows, cont = [], {e: 0 for e in ESTADOS}
    for n, t in enumerate(tasks, 1):
        e = estado(t)
        cont[e] += 1
        _, tem = reserva(t['key'])
        dep = ', '.join(sorted(set(t['dep']))) or '—'
        titulo = t['titulo'].replace('|', '/').replace('`', '')
        if len(titulo) > 90:
            titulo = titulo[:87].rstrip() + '...'
        rows.append('| %d | %s | %s | %s | %s | %s | %s | %s |' % (
            n, t['id'] if t['id'] == t['key'] else '%s (%s)' % (t['id'], t['key']), agente(t['key']),
            '✔' if tem else '—', titulo, t['lote'], dep, e))
    head = [
        '# TASKPLAN — ordem de execução e estado das tarefas',
        '',
        'Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,',
        'que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no',
        'arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as',
        'dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).',
        '',
        'Atualizado: %s' % agora(),
        '',
        'Resumo: ' + ' · '.join('%s %d' % (e, cont[e]) for e in ESTADOS if cont[e]) + ' · total %d' % len(tasks),
        '',
        'Estados: ' + ' → '.join(ESTADOS[:7]) + ' (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). '
        '`Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).',
        '',
        '| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |',
        '|---|---|---|---|---|---|---|---|',
    ]
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(head + rows) + '\n')
    print('TASKPLAN.md gerado: %d tarefas — ' % len(tasks) + ' · '.join('%s %d' % (e, cont[e]) for e in ESTADOS if cont[e]))


def _plan_cells(l):
    """Células de uma linha do TASKPLAN (layout novo de 8 colunas ou antigo de 7) -> dict."""
    c = [x.strip() for x in l.strip().strip('|').split('|')]
    if len(c) == 8:
        return c, {'n': 0, 'tarefa': 1, 'agente': 2, 'plano': 3, 'titulo': 4, 'lote': 5, 'dep': 6, 'estado': 7}
    if len(c) == 7:
        return c, {'n': 0, 'tarefa': 1, 'agente': None, 'plano': 2, 'titulo': 3, 'lote': 4, 'dep': 5, 'estado': 6}
    return None, None


def set_estado(i, novo):
    if novo not in ESTADOS:
        sys.exit('estado inválido: %r (válidos: %s)' % (novo, '; '.join(ESTADOS)))
    key = norm(i)
    with open(OUT, encoding='utf-8') as f:
        lines = f.read().split('\n')
    hit = False
    for n, l in enumerate(lines):
        if re.match(r'\| \d+ \|', l):
            c, ix = _plan_cells(l)
            if c and (key in ID_RE.findall(c[ix['tarefa']]) or norm(c[ix['tarefa']].split(' ')[0]) == key):
                c[ix['estado']] = novo
                lines[n] = '| ' + ' | '.join(c) + ' |'
                hit = True
                break
    if not hit:
        sys.exit('tarefa %s não está no TASKPLAN.md — rode `gerar`' % i)
    lines = [('Atualizado: %s' % agora()) if l.startswith('Atualizado:') else l for l in lines]
    cont, total = {e: 0 for e in ESTADOS}, 0
    for l in lines:
        if re.match(r'\| \d+ \|', l):
            c, ix = _plan_cells(l)
            if c and c[ix['estado']] in cont:
                cont[c[ix['estado']]] += 1
            total += 1
    resumo = 'Resumo: ' + ' · '.join('%s %d' % (e, cont[e]) for e in ESTADOS if cont[e]) + ' · total %d' % total
    lines = [resumo if l.startswith('Resumo:') else l for l in lines]
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))
    print('%s -> %s' % (i, novo))


# ----------------------------------------------------------------- utilitários
STALE_H = 2


def now():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def plan_path(key):
    return os.path.join(PLANDIR, key + '.md')


def read_lines(p):
    with open(p, encoding='utf-8', newline='') as f:
        return f.read().replace('\r\n', '\n').split('\n')


def write_lines(p, lines, crlf=False):
    t = '\n'.join(lines)
    if crlf:
        t = t.replace('\n', '\r\n')
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(t)


def ler_raw(p):
    with open(p, encoding='utf-8', newline='') as f:
        return f.read()


def gravar_raw(p, t):
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(t)


def task_crlf():
    return '\r\n' in ler_raw(TASK)


class Lock:
    """Trava por tarefa: mkdir é atômico."""
    def __init__(self, key, tentativas=50):
        self.d = os.path.join(PLANDIR, '.lock-' + key)
        self.tentativas = tentativas

    def __enter__(self):
        os.makedirs(PLANDIR, exist_ok=True)
        for _ in range(self.tentativas):
            try:
                os.mkdir(self.d)
                return self
            except FileExistsError:
                try:  # trava velha (>60 s) é descartada
                    if time.time() - os.path.getmtime(self.d) > 60:
                        os.rmdir(self.d)
                except OSError:
                    pass
                time.sleep(0.1)
        sys.exit('OCUPADA (trava de reserva ocupada)')

    def __exit__(self, *a):
        try:
            os.rmdir(self.d)
        except OSError:
            pass


def parse_reserva(txt):
    """'Em execução — sessão X — desde A — atualizado B' -> (valor, sessao, atualizado)."""
    parts = [x.strip() for x in txt.split('—')]
    valor = parts[0]
    sessao = atualizado = None
    for x in parts[1:]:
        if x.startswith('sessão '):
            sessao = x[len('sessão '):]
        elif x.startswith('atualizado '):
            atualizado = x[len('atualizado '):]
    return valor, sessao, atualizado


def reserva_info(key):
    p = plan_path(key)
    if not os.path.exists(p):
        return None
    for n, l in enumerate(read_lines(p)):
        if l.startswith('Reserva:'):
            return parse_reserva(l.split(':', 1)[1].strip()) + (n,)
        if n > 14:
            break
    return ('Livre', None, None, None)


def velha(atualizado):
    try:
        t = datetime.datetime.strptime(atualizado, '%Y-%m-%d %H:%M:%S')
    except Exception:
        return True
    return (datetime.datetime.now() - t).total_seconds() > STALE_H * 3600


def set_reserva(key, texto):
    p = plan_path(key)
    lines = read_lines(p)
    for n, l in enumerate(lines[:15]):
        if l.startswith('Reserva:'):
            lines[n] = 'Reserva: ' + texto
            break
    else:  # cabeçalho sem a linha: insere depois do título
        lines.insert(2 if len(lines) > 2 else len(lines), 'Reserva: ' + texto)
    write_lines(p, lines)


def set_cab(key, prefixo, valor):
    """Grava (ou remove, se valor for None) uma linha `prefixo valor` no cabeçalho do arquivo da tarefa."""
    p = plan_path(key)
    if not os.path.exists(p):
        return False
    with Lock(key):
        lines = read_lines(p)
        for n, l in enumerate(lines[:16]):
            if l.startswith(prefixo):
                if valor is None:
                    del lines[n]
                else:
                    lines[n] = '%s %s' % (prefixo, valor)
                break
        else:
            if valor is None:
                return True
            pos = next((n + 1 for n, l in enumerate(lines[:16]) if l.startswith('Reserva:')), 3 if len(lines) > 3 else len(lines))
            lines.insert(pos, '%s %s' % (prefixo, valor))
        write_lines(p, lines)
    return True


def get_cab(key, prefixo):
    p = plan_path(key)
    if not os.path.exists(p):
        return None
    for n, l in enumerate(read_lines(p)):
        if l.startswith(prefixo):
            return l.split(':', 1)[1].strip()
        if n > 16:
            break
    return None


def taskplan_rows():
    """Linhas do TASKPLAN.md como dicts (sem ler o TASK.md)."""
    rows = []
    for l in read_lines(OUT):
        if re.match(r'\| \d+ \|', l):
            c, ix = _plan_cells(l)
            if not c:
                continue
            ids = ID_RE.findall(c[ix['tarefa']])
            key = [x for x in ids if x.startswith(('TP-', 'RTP-', 'SPK-', 'BK-'))]
            key = key[0] if key else norm(ids[0])
            rows.append({'n': int(c[0]), 'id': c[ix['tarefa']].split(' ')[0], 'key': key,
                         'plano': c[ix['plano']] == '✔', 'titulo': c[ix['titulo']], 'lote': c[ix['lote']],
                         'dep': [norm(x) for x in ID_RE.findall(c[ix['dep']])], 'estado': c[ix['estado']]})
    for r in rows:  # estado vivo: reserva e Status-local do arquivo da tarefa valem mais que a linha do TASKPLAN
        rv, _ = reserva(r['key'])
        loc = status_local(r['key'])
        if loc is not None or (rv and rv.startswith(('Em execução', 'Em QA', 'Em DevSecOps'))):
            r['estado'] = estado({'key': r['key'], 'status': ''})
    return rows


def resolvida(row, by):
    if row['estado'] == 'Aprovada':
        return True
    if row['estado'] == 'Dividida':
        partes = [r for r in by.values() if re.fullmatch(re.escape(row['key']) + r'[a-z]+', r['key'])]
        return bool(partes) and all(resolvida(p, by) for p in partes if len(p['key']) == len(row['key']) + 1)
    return False


def lote_casa(lote, n):
    n = str(n).upper().lstrip('L').lstrip('0')
    l = lote.upper().lstrip('L').lstrip('0')
    return l == n


# ----------------------------------------------------------------- comandos
def _elegiveis(etapa, lote=None, pular=(), k=1, distintos=False):
    """Tarefas elegíveis da etapa (exe|qa|sec) na ordem da fila + contagem dos motivos de exclusão."""
    usados = set()
    rows = taskplan_rows()
    by = {r['key']: r for r in rows}
    out, motivos = [], {'sem plano': 0, 'dependência aberta': 0, 'reservada': 0, 'bloqueada/dividida': 0,
                        'do coordenador (BK/SPK)': 0, 'despriorizada': 0, 'outros': 0}
    ELEG = ETAPAS_ELEG[etapa]
    for r in rows:
        if r['estado'] in ('Aprovada',):
            continue
        if lote and not lote_casa(r['lote'], lote):
            continue
        if r['key'] in pular:
            continue
        if distintos and r['lote'] in usados:  # no máximo uma tarefa por lote (paralelismo seguro)
            continue
        if r['key'].startswith(COORD):
            motivos['do coordenador (BK/SPK)'] += 1
            continue
        if r['estado'] == 'Despriorizada':
            motivos['despriorizada'] += 1
            continue
        if r['estado'] in ('Bloqueada', 'Dividida'):
            motivos['bloqueada/dividida'] += 1
            continue
        if r['estado'] not in ELEG:
            motivos['outros'] += 1
            continue
        if not r['plano']:
            motivos['sem plano'] += 1
            continue
        # só a execução espera as dependências; teste e segurança operam sobre código já executado
        if etapa == 'exe' and any(not (d in by and resolvida(by[d], by)) for d in r['dep'] if d in by):
            motivos['dependência aberta'] += 1
            continue
        ri = reserva_info(r['key'])
        if ri and ri[0] != 'Livre' and ri[0] in ('Em execução', 'Em QA', 'Em DevSecOps'):
            motivos['reservada'] += 1
            continue
        out.append(r)
        usados.add(r['lote'])
        if len(out) >= k:
            break
    return out, motivos, rows


def cmd_proxima(args):
    lote, pular, k, etapa, distintos = None, set(), 1, 'exe', False
    i = 0
    while i < len(args):
        if args[i] == '--lotes-distintos':
            distintos = True; i += 1
        elif args[i] == '--etapa':
            etapa = args[i + 1]; i += 2
            if etapa not in ETAPAS_ELEG:
                sys.exit('etapa inválida: %r (válidas: exe, qa, sec)' % etapa)
        elif args[i] == '--lote':
            lote = args[i + 1]; i += 2
        elif args[i] == '--pular':
            pular = {norm(x) for x in args[i + 1].split(',') if x}; i += 2
        elif args[i] == '--n':
            k = int(args[i + 1]); i += 2
        else:
            i += 1
    out, motivos, _ = _elegiveis(etapa, lote, pular, k, distintos)
    for r in out:
        print('%s	%s	%s	%s	%s' % (r['id'], r['key'], r['estado'], r['lote'], r['titulo']))
    if not out:
        print('NENHUMA	' + '; '.join('%s: %d' % kv for kv in motivos.items() if kv[1]))


def cmd_fila(args):
    """Uma linha para o /desenvolver decidir o que rodar e se houve progresso."""
    import hashlib
    cont, mot, rows = {}, {}, None
    for et in ('exe', 'qa', 'sec'):
        out, motivos, rows = _elegiveis(et, k=10 ** 9)
        cont[et] = len(out)
        mot[et] = motivos
    abertos = [r for r in rows if r['estado'] != 'Aprovada']
    bloq = [r for r in abertos if r['estado'] == 'Bloqueada']
    coord = [r for r in abertos if r['key'].startswith(COORD)]
    desp = [r for r in abertos if r['estado'] == 'Despriorizada']
    reservadas = sum(m['reservada'] for m in mot.values())
    semplano = mot['exe']['sem plano'] + mot['qa']['sem plano'] + mot['sec']['sem plano']
    h = hashlib.md5('|'.join('%s:%s' % (r['key'], r['estado']) for r in rows).encode('utf-8')).hexdigest()[:12]
    print('FILA exe=%d qa=%d sec=%d | bloqueadas=%d despriorizadas=%d bk_spk_abertos=%d reservadas=%d sem_plano=%d | aprovadas=%d total=%d | estado=%s' % (
        cont['exe'], cont['qa'], cont['sec'], len(bloq), len(desp), len(coord), reservadas, semplano,
        len(rows) - len(abertos), len(rows), h))
    if '--bloqueios' in args:
        for r in coord:
            print('BK/SPK	%s	%s' % (r['id'], r['titulo']))
        for r in bloq:
            print('BLOQUEADA\t%s\t%s' % (r['id'], r['titulo']))
        for r in desp:
            print('DESPRIORIZADA\t%s\t%s' % (r['id'], r['titulo']))


def cmd_reservar(args):
    i, token, assumir = args[0], args[1], '--assumir' in args
    etapa = args[args.index('--etapa') + 1] if '--etapa' in args else 'Em execução'
    if etapa not in ('Em execução', 'Em QA', 'Em DevSecOps'):
        sys.exit('etapa inválida')
    key = norm(i)
    if not os.path.exists(plan_path(key)):
        sys.exit('SEM PLANO: %s' % plan_path(key))
    if any(r['key'] == key and r['estado'] == 'Despriorizada' for r in taskplan_rows()):
        print('DESPRIORIZADA\t%s\tignorada por executar/testar/validar; use `repriorizar` para voltar' % key)
        sys.exit(4)
    with Lock(key):
        ri = reserva_info(key)
        if ri and ri[0] in ('Em execução', 'Em QA', 'Em DevSecOps') and ri[1] != token:
            if not (assumir and velha(ri[2])):
                print('OCUPADA\t%s\tsessão %s\tatualizado %s' % (ri[0], ri[1], ri[2]))
                sys.exit(2)
        t = now()
        set_reserva(key, '%s — sessão %s — desde %s — atualizado %s' % (etapa, token, t, t))
    ri = reserva_info(key)  # confere
    if ri[1] != token:
        print('OCUPADA\toutra sessão assumiu')
        sys.exit(2)
    print('OK')


def cmd_etapa(args):
    i, token, etapa = args[0], args[1], args[2]
    if etapa not in ('Em execução', 'Em QA', 'Em DevSecOps'):
        sys.exit('etapa inválida')
    key = norm(i)
    with Lock(key):
        ri = reserva_info(key)
        if not ri or ri[1] != token:
            sys.exit('RESERVA PERDIDA (sessão %s)' % (ri[1] if ri else '-'))
        desde = None
        for l in read_lines(plan_path(key))[:15]:
            if l.startswith('Reserva:') and 'desde ' in l:
                desde = [x.strip()[6:] for x in l.split('—') if x.strip().startswith('desde ')][0]
        set_reserva(key, '%s — sessão %s — desde %s — atualizado %s' % (etapa, token, desde or now(), now()))
    # o estado vivo vem da Reserva (lida por cima do TASKPLAN.md); o TASKPLAN.md só é regerado no consolidar


def cmd_liberar(args):
    i, valor = args[0], args[1]
    if valor not in ('Livre', 'Concluída', 'Bloqueada'):
        sys.exit('valor inválido')
    key = norm(i)
    with Lock(key):
        set_reserva(key, valor)
    print('%s -> Reserva: %s' % (key, valor))


def cmd_status(args):
    i, texto = args[0], args[1]
    key = norm(i)
    sync = '--sync' in args[2:]
    ehbk = key.startswith('BK-') or (key.startswith('SPK-') and _linha_tarefa(key) is None)
    if not sync and not ehbk and os.path.exists(plan_path(key)):
        # durante a rodada o Status vive só no arquivo da tarefa; TASK.md e TASKPLAN.md ficam para o `consolidar`
        set_cab(key, LOCAL, texto.replace('\n', ' '))
        print('Status de %s gravado (local; rode `consolidar` no fim)' % i)
        return
    with Lock('_TASK', 300):
        _status_sync(i, key, texto)


def _status_sync(i, key, texto):
    hit = {'status': ''}
    so_arquivo = key.startswith('BK-') or (key.startswith('SPK-') and _linha_tarefa(key) is None)
    if so_arquivo:  # bloqueio/spike aberto na execução: o Status vive no arquivo dele
        p = plan_path(key)
        if not os.path.exists(p):
            sys.exit('bloqueio %s sem arquivo em .md/.taskplan' % i)
        lines = read_lines(p)
        for n, l in enumerate(lines[:15]):
            if l.startswith('Status:'):
                lines[n] = 'Status: ' + texto.replace('\n', ' ')
                break
        else:
            lines.insert(3, 'Status: ' + texto.replace('\n', ' '))
        write_lines(p, lines)
    else:
        hit = None
        for t in tabelas():
            for r in t['rows']:
                if norm(r['id']) == key:
                    hit = r
                    break
            if hit:
                break
        if hit is None:
            sys.exit('tarefa %s não encontrada na Seção 3 do TASK.md' % i)
        lines = read_lines(TASK)
        pre, _ = split_status(lines[hit['line']])
        lines[hit['line']] = pre + ' ' + texto.replace('|', '/').replace('\n', ' ') + ' |'
        write_lines(TASK, lines, task_crlf())
        set_cab(key, LOCAL, None)  # o TASK.md voltou a ser a verdade
    t = {'id': i, 'key': key, 'status': texto, 'dep': []}
    mexe_em_bloqueio = so_arquivo or estado(t) == 'Bloqueada' or \
        re.sub(r'^[*_`\s]+', '', hit['status']).startswith('Bloqueada')
    if os.path.exists(OUT):
        if mexe_em_bloqueio:
            gerar()  # reordena a fila (bloqueada vai para o fim ou fica depois do BK)
        else:
            try:
                set_estado(key, estado(t))
            except SystemExit:
                pass
    print('Status de %s gravado' % i)


DESP_PREFIXO = 'Despriorizada · antes: '
DESP_MOTIVO = ' · motivo: '


def cmd_despriorizar(args):
    """despriorizar ID [--motivo "..."]: a tarefa fica Despriorizada (fim da lista; ignorada por /executar, /testar, /validar)."""
    i, key = args[0], norm(args[0])
    motivo = args[args.index('--motivo') + 1] if '--motivo' in args else ''
    if key.startswith('BK-'):
        sys.exit('BK não é tarefa: despriorize a tarefa que ele bloqueia')
    t = next((x for x in read_tasks() if x['key'] == key), None)
    if t is None:
        sys.exit('tarefa %s não encontrada na Seção 3 do TASK.md' % i)
    atual = status_local(key) or t['status']
    if re.sub(r'^[*_`\s]+', '', atual).startswith('Despriorizada'):
        print('JA DESPRIORIZADA\t%s' % key)
        return
    est = estado(t)
    if est == 'Aprovada':
        sys.exit('%s já está Aprovada: nada a despriorizar' % key)
    if est == 'Dividida':
        sys.exit('%s foi dividida: despriorize as partes' % key)
    ri = reserva_info(key)
    if ri and ri[0] in ('Em execução', 'Em QA', 'Em DevSecOps'):
        sys.exit('OCUPADA\t%s\t%s (sessão %s): espere a etapa terminar ou libere a reserva' % (key, ri[0], ri[1]))
    antes = re.sub(r'\s+', ' ', atual.replace('|', '/')).strip() or 'Pendente'
    texto = DESP_PREFIXO + antes + ((DESP_MOTIVO + motivo.replace('|', '/').replace('\n', ' ')) if motivo else '')
    _status_sync(i, key, texto)
    gerar()
    dependentes = [x['key'] for x in read_tasks() if key in x['dep'] and estado(x) != 'Aprovada']
    print('DESPRIORIZADA\t%s (estava: %s)' % (key, est))
    if dependentes:
        print('ATENCAO: ficam esperando %s as tarefas: %s' % (key, ', '.join(dependentes)))


def cmd_repriorizar(args):
    i, key = args[0], norm(args[0])
    t = next((x for x in read_tasks() if x['key'] == key), None)
    if t is None:
        sys.exit('tarefa %s não encontrada na Seção 3 do TASK.md' % i)
    atual = re.sub(r'^[*_`\s]+', '', status_local(key) or t['status'])
    if not atual.startswith('Despriorizada'):
        sys.exit('%s não está despriorizada' % key)
    antes = 'Pendente'
    if atual.startswith(DESP_PREFIXO):
        antes = atual[len(DESP_PREFIXO):].split(DESP_MOTIVO)[0].strip() or 'Pendente'
    _status_sync(i, key, antes)
    gerar()
    print('REPRIORIZADA\t%s\tStatus restaurado: %s' % (key, antes))


def proximo_id(pref):
    nums = [0]
    if os.path.exists(TASK):
        for l in read_lines(TASK):
            for m in re.finditer(r'\b%s-(\d+)' % pref, l):
                nums.append(int(m.group(1)))
    if os.path.isdir(PLANDIR):
        for f in os.listdir(PLANDIR):
            m = re.match(r'%s-(\d+)' % pref, f)
            if m:
                nums.append(int(m.group(1)))
    return '%s-%04d' % (pref, max(nums) + 1)


def cmd_proximo_id(args):
    print(proximo_id(args[0] if args else 'RTP'))


def parse_opts(args):
    o, i = {}, 0
    while i < len(args):
        if args[i].startswith('--') and i + 1 < len(args):
            o[args[i][2:]] = args[i + 1]
            i += 2
        else:
            i += 1
    return o


def montar_linha(tab, valores):
    cl = lambda x: str(x).replace('|', '/').replace('\n', ' ').strip()
    cells = [cl(valores.get(k, '-')) if k else '-' for k in tab['cols']]
    return '| ' + ' | '.join(cells) + ' |'


def cmd_nova(args):
    o = parse_opts(args)
    o.setdefault('lote', o.get('grupo', ''))
    for k in ('id', 'grupo', 'lote', 'titulo', 'chapeu', 'reqs', 'aceite', 'est', 'dep', 'par', 'arquivos', 'testes'):
        if k not in o:
            sys.exit('falta --%s' % k)
    o.setdefault('status', 'Pendente')
    tabs = tabelas()
    if any(norm(r['id']) == norm(o['id']) for t in tabs for r in t['rows']):
        sys.exit('ID %s já existe no TASK.md' % o['id'])
    lines = read_lines(TASK)
    pos, tab = None, None
    if 'apos' in o:
        ak = norm(o['apos'])
        for t in tabs:
            for r in t['rows']:
                if norm(r['id']) == ak:
                    pos, tab = r['line'] + 1, t
        if pos is None:
            sys.exit('--apos %s não encontrada' % o['apos'])
    else:  # depois da última linha do grupo (Lote == grupo, ou tabela sob o título do grupo)
        for t in tabs:
            for r in t['rows']:
                if o['grupo'] in (r['lote'], r['grupo']):
                    pos, tab = r['line'] + 1, t
    if tab is None:  # grupo novo, antes da Seção 4 (ou do próximo `## ` depois da Seção 3)
        padrao = {'cols': ['id', 'lote', 'titulo', 'chapeu', 'reqs', 'aceite', 'est', 'dep', 'par', 'arquivos', 'testes', 'status']}
        hdr = '| ID | Lote | Título | Chapéu | Reqs | Aceite | Est | Dep | Par | Arquivos | Testes e diretrizes | Status |'
        fim = next((n for n, l in enumerate(lines) if l.startswith('## 4.')), len(lines))
        if tabs:
            ult = max(t['rows'][-1]['line'] for t in tabs if t['rows'])
            fim = ult + 1
        bloco = ['', '### %s' % o['grupo'], hdr, '|---|---|---|---|---|---|---|---|---|---|---|---|',
                 montar_linha(padrao, o), '']
        lines[fim:fim] = bloco
        write_lines(TASK, lines, task_crlf())
        print('grupo criado e linha %s gravada' % o['id'])
        return
    lines.insert(pos, montar_linha(tab, o))
    write_lines(TASK, lines, task_crlf())
    print('linha %s gravada no TASK.md' % o['id'])


def cmd_deps_substituir(args):
    antigo, novos = norm(args[0]), [norm(x) for x in args[1].split(',')]
    lines = read_lines(TASK)
    n_alt = 0
    for t in tabelas():
        if 'dep' not in t['cols']:
            continue
        di = t['cols'].index('dep')
        for r in t['rows']:
            c = list(r['cells'])
            ids = [norm(x) for x in ID_RE.findall(c[di])]
            if antigo in ids and norm(r['id']) not in novos:
                c[di] = ID_RE.sub(lambda m: ', '.join(novos) if norm(m.group(0)) == antigo else m.group(0), c[di])
                lines[r['line']] = '| ' + ' | '.join(c) + ' |'
                n_alt += 1
    write_lines(TASK, lines, task_crlf())
    print('%d linha(s) reapontada(s): %s -> %s' % (n_alt, args[0], ', '.join(novos)))


def _linha_tarefa(key):
    for tb in tabelas():
        for r in tb['rows']:
            if norm(r['id']) == key:
                return r
    return None


def _add_dep(lines, row, bid):
    if 'dep' not in row['tab']['cols']:
        return
    di = row['tab']['cols'].index('dep')
    c = list(row['cells'])
    atual = c[di].strip()
    if bid in atual:
        return
    c[di] = bid if atual in ('', '-', '—') else atual + ', ' + bid
    lines[row['line']] = '| ' + ' | '.join(c) + ' |'


def _blockers_proximo_numero():
    nums = [0]
    if os.path.exists(BLOCKERS):
        for l in read_lines(BLOCKERS):
            m = re.match(r'^## Bloqueio (\d+)', l)
            if m:
                nums.append(int(m.group(1)))
    return max(nums) + 1


def _blockers_acrescentar(texto):
    bruto = ler_raw(BLOCKERS) if os.path.exists(BLOCKERS) else '# BLOCKERS\n'
    nl = '\r\n' if '\r\n' in bruto else '\n'
    base = bruto.rstrip('\r\n') + nl + nl
    gravar_raw(BLOCKERS, base + texto.replace('\n', nl))


def _blockers_status(cab, texto):
    """Troca o `- Status:` da entrada do BLOCKERS.md cujo título começa por `cab`."""
    if not os.path.exists(BLOCKERS) or not cab:
        return False
    bruto = ler_raw(BLOCKERS)
    nl = '\r\n' if '\r\n' in bruto else '\n'
    linhas = bruto.replace('\r\n', '\n').split('\n')
    dentro = False
    for n, l in enumerate(linhas):
        if l.startswith('## '):
            dentro = l[3:].strip().startswith(cab.strip())
        elif dentro and l.startswith('- Status:'):
            linhas[n] = '- Status: ' + texto
            gravar_raw(BLOCKERS, nl.join(linhas))
            return True
    return False


def cmd_bloquear(args):
    alvo = args[0]
    key = norm(alvo) if alvo != '-' else None
    o = parse_opts(args[1:])
    for k in ('por', 'escala', 'motivo'):
        if k not in o:
            sys.exit('falta --%s' % k)
    tipo = o.get('tipo', 'bk').lower()
    if tipo not in ('bk', 'spk'):
        sys.exit('--tipo deve ser bk ou spk')
    row = _linha_tarefa(key) if key else None
    if key and row is None:
        sys.exit('tarefa %s não encontrada na Seção 3 do TASK.md' % alvo)
    bid = proximo_id(tipo.upper())
    motivo = re.sub(r'\s+', ' ', o['motivo']).strip()
    hoje = datetime.date.today().isoformat()
    cab = 'Bloqueio %03d — %s (%s)' % (_blockers_proximo_numero(), hoje, bid)
    campos = ['- Reportado por: %s' % o['por'], '- Escalado para: %s' % o['escala'],
              '- Artefato/trecho afetado: %s' % (key or '—'), '- Descrição: %s' % motivo,
              '- Impacto se não resolvido: %s' % o.get('impacto', '—'), '- Sugestão: %s' % o.get('sugestao', '—')]
    if tipo == 'spk':
        campos += ['- Pergunta a responder: %s' % o.get('pergunta', motivo), '- Time-box: %s' % o.get('timebox', '1 d')]
    campos.append('- Status: Em aberto')
    texto = '## ' + cab + '\n' + '\n'.join(campos) + '\n'
    _blockers_acrescentar(texto)  # os agentes continuam registrando no BLOCKERS.md
    e = {'cab': cab, 'titulo': motivo[:90], 'texto': texto,
         'campos': {'reportado por': o['por'], 'escalado para': o['escala']}}
    os.makedirs(PLANDIR, exist_ok=True)
    gravar_raw(plan_path(bid), arquivo_bk(bid, e, [key] if key else [], 'Pendente — em aberto'))
    if row:
        lines = read_lines(TASK)
        _add_dep(lines, row, bid)
        pre, _ = split_status(lines[row['line']])
        lines[row['line']] = pre + ' Bloqueada (%s: %s) |' % (bid, motivo[:120].replace('|', '/'))
        write_lines(TASK, lines, task_crlf())
        if os.path.exists(plan_path(key)):
            with Lock(key):
                set_reserva(key, 'Bloqueada')
            set_cab(key, LOCAL, None)  # o Status oficial (Bloqueada) acabou de ir para o TASK.md
    gerar()
    print('%s\t%s\t%s\tescala para %s\tBLOCKERS.md: %s' % (bid, plan_path(bid), ('bloqueia ' + key) if key else 'sem tarefa afetada',
                                                         o['escala'], cab.split(' (')[0]))


def cmd_desbloquear(args):
    bid = norm(args[0])
    texto = args[1] if len(args) > 1 else 'resolvido'
    if not os.path.exists(plan_path(bid)):
        sys.exit('bloqueio/spike %s sem arquivo em .md/.taskplan' % args[0])
    lines_bk = read_lines(plan_path(bid))
    origem = ''
    for n, l in enumerate(lines_bk[:15]):
        if 'Origem:' in l:
            m = re.search(r'Origem:\s*(.*?)\s*(?:·|$)', l)
            origem = m.group(1) if m else ''
        if l.startswith('Status:'):
            lines_bk[n] = 'Status: Concluída — ' + texto.replace('\n', ' ')
    write_lines(plan_path(bid), lines_bk)
    resolvido = 'Resolvido (%s): %s' % (datetime.date.today().isoformat(), texto.replace('\n', ' '))
    _blockers_status(origem, resolvido)
    lines = read_lines(TASK)
    liberadas = []
    for tb in tabelas():
        for r in tb['rows']:
            if norm(r['id']) == bid:  # SPK/BK que também é linha do TASK.md
                pre, _ = split_status(lines[r['line']])
                lines[r['line']] = pre + ' Concluída — %s |' % texto.replace('|', '/').replace('\n', ' ')
            elif bid in ID_RE.findall(r['dep']) and re.sub(r'^[*_`\s]+', '', r['status']).startswith('Bloqueada'):
                pre, _ = split_status(lines[r['line']])
                lines[r['line']] = pre + ' Pendente (desbloqueada: %s resolvido) |' % bid
                liberadas.append(norm(r['id']))
    write_lines(TASK, lines, task_crlf())
    for k in liberadas:
        if os.path.exists(plan_path(k)):
            with Lock(k):
                set_reserva(k, 'Livre')
            set_cab(k, LOCAL, None)
    with Lock(bid):  # o próprio BK/SPK deixa de estar "em execução" antes de a fila ser regerada
        set_reserva(bid, 'Concluída')
    gerar()
    print('%s resolvido; voltam à fila: %s' % (bid, ', '.join(liberadas) or 'nenhuma'))


def cmd_ordenar(args):
    """Reconstrói só o TASKPLAN.md na ordem final da fila. Não toca no TASK.md, em .md/.taskplan/ nem nos IDs."""
    existia = os.path.exists(OUT)
    antes = [r['key'] for r in taskplan_rows()] if existia else []
    gerar()
    rows = taskplan_rows()
    depois = [r['key'] for r in rows]
    mudaram = sum(1 for i, k in enumerate(depois) if i >= len(antes) or antes[i] != k) if existia else len(depois)
    abertas = [r for r in rows if r['estado'] != 'Aprovada']
    sem_plano = [r['key'] for r in abertas if not r['plano'] and not r['key'].startswith(COORD)]
    print('ORDENAR: %d posições mudaram (de %d); em aberto: %d' % (mudaram, len(depois), len(abertas)))
    if not existia:
        print('TASKPLAN.md não existia: foi criado agora.')
    print('Fila em aberto (na ordem):')
    for r in abertas[:15]:
        print('  #%d\t%s\t%s\t%s' % (r['n'], r['id'], r['estado'], 'dep ' + ', '.join(r['dep']) if r['dep'] else ''))
    if len(abertas) > 15:
        print('  … e mais %d' % (len(abertas) - 15))
    if sem_plano:
        print('Sem arquivo em .md/.taskplan (rode /organizar): ' + ', '.join(sem_plano[:10]))
    print('Primeira elegível para o /executar:')
    cmd_proxima(['--n', '1'])


def _git(args, env=None, check=True):
    r = subprocess.run(['git'] + args, cwd=CWD, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode != 0:
        sys.exit('git %s falhou: %s' % (' '.join(args), r.stderr.strip()))
    return r


def _snapshot():
    """Hash de uma árvore com o estado atual do diretório de trabalho (inclui arquivos novos), sem commit e
    sem tocar no índice real: usa um índice temporário dentro do .git."""
    gd = os.path.abspath(os.path.join(CWD, _git(['rev-parse', '--git-dir']).stdout.strip()))
    idx = os.path.join(gd, 'taskplan-snap-index')
    env = dict(os.environ, GIT_INDEX_FILE=idx)
    try:
        _git(['read-tree', 'HEAD'], env=env, check=False)  # sem HEAD: índice vazio
        _git(['add', '-A'], env=env)
        return _git(['write-tree'], env=env).stdout.strip()
    finally:
        try:
            os.remove(idx)
        except OSError:
            pass


EXCLUI_DIFF = [':(exclude).md/.taskplan', ':(exclude).md/TASKPLAN.md']


def cmd_iniciar(args):
    i, token = args[0], args[1]
    key = norm(i)
    o = args[2:]
    etapa = o[o.index('--etapa') + 1] if '--etapa' in o else 'Em execução'
    cmd_reservar([i, token, '--etapa', etapa] + (['--assumir'] if '--assumir' in o else []))
    cmd_etapa([i, token, etapa])
    if etapa == 'Em execução':
        set_cab(key, LOCAL, 'Em andamento')
        if '--snap' in o:
            set_cab(key, 'Snapshot:', _snapshot())  # só o "antes"; o concluir acrescenta o "depois"
    print('INICIADA %s (%s)' % (key, etapa))


RESULTADOS = {
    'executada': 'Concluída · aguarda QA',
    'qa-ok': 'Concluída · QA ✔',
    'sec-ok': 'Concluída · QA ✔ · Sec ✔',
    'devolvida': 'Em andamento',
}


def cmd_concluir(args):
    i, token, res = args[0], args[1], args[2]
    key = norm(i)
    o = args[3:]
    if res not in RESULTADOS:
        sys.exit('resultado inválido: %r (válidos: %s)' % (res, ', '.join(RESULTADOS)))
    ri = reserva_info(key)
    if not ri or ri[1] != token:
        sys.exit('RESERVA PERDIDA (sessão %s)' % (ri[1] if ri else '-'))
    if res == 'devolvida':
        n = int(get_cab(key, 'Devoluções:') or 0) + 1
        if n > 2:
            print('LIMITE\t%s\t%d devoluções: 3ª é bloqueio crítico (use `bloquear`); status inalterado' % (key, n))
            sys.exit(3)
        set_cab(key, 'Devoluções:', str(n))
        motivo = o[o.index('--motivo') + 1] if '--motivo' in o else ''
        print('DEVOLUCAO\t%s\t%d de 2%s' % (key, n, ('\t' + motivo) if motivo else ''))
    if res == 'executada' and '--snap' in o:
        antes = (get_cab(key, 'Snapshot:') or '').split('..')[0]
        if antes:
            set_cab(key, 'Snapshot:', '%s..%s' % (antes, _snapshot()))
    set_cab(key, LOCAL, RESULTADOS[res])
    with Lock(key):
        set_reserva(key, 'Livre')
    print('CONCLUIDA\t%s\t%s' % (key, RESULTADOS[res]))


def cmd_diff(args):
    key = norm(args[0])
    snap = get_cab(key, 'Snapshot:')
    if snap and '..' in snap and all(snap.split('..')):
        a, b = snap.split('..')
        sys.stdout.write(_git(['diff', a, b, '--'] + ['.'] + EXCLUI_DIFF).stdout)
        return
    hs = _git(['log', '--format=%H', '--extended-regexp', '--grep', '^%s[: ]' % re.escape(key)], check=False).stdout.split()
    if not hs:
        sys.exit('SEM DIFF: %s não tem snapshot nem commit que comece pelo ID' % key)
    for h in reversed(hs):
        sys.stdout.write(_git(['show', h, '--format=commit %h %s', '--'] + ['.'] + EXCLUI_DIFF).stdout)


RESUMO = 'Resumo para o relatório:'
RELATORIOS = [  # (regex do cabeçalho da seção no arquivo da tarefa, arquivo, rótulo)
    (r'^## 5\.', 'QA-REPORT.md', 'QA'),
    (r'^## 6\.', 'SECURITY-REVIEW.md', 'DevSecOps'),
]


def _resumo_da_secao(lines, rx):
    """Última linha `Resumo para o relatório:` da seção cujo cabeçalho casa com rx (None se não houver)."""
    dentro, achado = False, None
    for l in lines:
        if l.startswith('## '):
            dentro = bool(re.match(rx, l))
        elif dentro and l.strip().startswith(RESUMO):
            achado = l.strip()[len(RESUMO):].strip()
    return achado or None


def _anexar_relatorios():
    """O QA e o DevSecOps escrevem só no arquivo da tarefa (inclusive a linha `Resumo para o relatório:`);
    aqui as entradas de QA-REPORT.md e SECURITY-REVIEW.md são montadas de uma vez, sem escrita concorrente."""
    if not os.path.isdir(PLANDIR):
        return 0
    novos = {arq: [] for _, arq, _ in RELATORIOS}
    for f in sorted(os.listdir(PLANDIR)):
        if not f.endswith('.md') or f.startswith('BK-'):
            continue
        lines = read_lines(os.path.join(PLANDIR, f))
        for rx, arq, rot in RELATORIOS:
            res = _resumo_da_secao(lines, rx)
            if res:
                novos[arq].append((f[:-3], rot, res))
    n = 0
    for arq, itens in novos.items():
        p = os.path.join(MD, arq)
        atual = ler_raw(p) if os.path.exists(p) else '# %s\n' % arq[:-3]
        nl = '\r\n' if '\r\n' in atual else '\n'
        add = [(k, rot, res) for k, rot, res in itens if res not in atual]
        if add:
            hoje = datetime.date.today().isoformat()
            bloco = ''.join('%s## %s — %s — %s%s%s%s' % (nl, k, rot, hoje, nl, res, nl) for k, rot, res in add)
            gravar_raw(p, atual.rstrip('\r\n') + nl + bloco)
            n += len(add)
    return n


def cmd_consolidar(args):
    """Grava os Status locais no TASK.md (uma leitura/escrita só) e regera o TASKPLAN.md."""
    locais = {}
    if os.path.isdir(PLANDIR):
        for f in os.listdir(PLANDIR):
            if f.endswith('.md') and not f.startswith('BK-'):
                key = f[:-3]
                loc = status_local(key)
                if loc is not None:
                    locais[key] = loc
    gravados, ficaram = 0, []
    if locais and os.path.exists(TASK):
        lines = read_lines(TASK)
        feitos = set()
        for t in tabelas():
            for r in t['rows']:
                k = norm(r['id'])
                if k in locais:
                    pre, _ = split_status(lines[r['line']])
                    lines[r['line']] = pre + ' ' + locais[k].replace('|', '/').replace('\n', ' ') + ' |'
                    feitos.add(k)
        if feitos:
            write_lines(TASK, lines, task_crlf())
        for k in locais:
            if k in feitos:
                set_cab(k, LOCAL, None)
                gravados += 1
            else:
                ficaram.append(k)
    rels = _anexar_relatorios()
    gerar()
    print('CONSOLIDADO: %d status gravado(s) no TASK.md%s; %d entrada(s) nova(s) em QA-REPORT.md/SECURITY-REVIEW.md' % (
        gravados, ('; sem linha no TASK.md (mantidos locais): ' + ', '.join(ficaram)) if ficaram else '', rels))


def cmd_tarefa(args):
    key = norm(args[0])
    for r in taskplan_rows():
        if r['key'] == key:
            ri = reserva_info(key)
            print('%s (%s) | lote %s | agente %s | estado %s | dep %s | plano %s | reserva %s' % (
                r['id'], r['key'], r['lote'], agente(key), r['estado'], ', '.join(r['dep']) or '—',
                plan_path(key) if r['plano'] else 'SEM PLANO', ri[0] if ri else '—'))
            return
    sys.exit('tarefa %s não está no TASKPLAN.md' % args[0])


# ----------------------------------------------------------------- migração (/organizar --migrar)
NOTA_PRONTA = 'Não precisou de planejamento: tarefa já concluída no TASK.md (migração `/organizar --migrar`).'
NOTA_DIVIDIDA = 'Não precisou de planejamento: tarefa dividida em partes (as partes têm o próprio arquivo).'
NOTA_A_GERAR = 'PENDENTE: a gerar pelo `/organizar --migrar` (Executor).'
CAUDA_RE = re.compile(r'^## (?:4\.|5\.|6\.|Bloqueio)')
HIFEN_RE = re.compile(r'^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$')


def categoria(r):
    if re.match(r'(?i)^(S|SP|SPK)-\d', r['id']) or re.match(r'(?i)^spike\b', r['titulo'].strip('*_ ')):
        return 'SPK'
    base = (r['lote_col'] or r['grupo']).lower()  # a coluna Lote manda; sem ela, o título `### ...` da tabela
    if base.startswith('refatora') or re.match(r'(?i)^(RFT|RTP)-', r['id']):
        return 'RTP'
    return 'TP'


def _num(i):
    m = re.search(r'-(\d+)', i)
    return int(m.group(1)) if m else 0


def construir_mapa(rows):
    """{id antigo: novo ID} para as linhas fora do padrão. T-nnn mantém o número (TP-nnnn); IDs semânticos
    (BF-01, SP-01, RFT-L02-04…) recebem TP/RTP/SPK sequenciais na ordem do documento."""
    padrao = [r['id'] for r in rows if STD_RE.match(r['id'])]
    usados = {p: {_num(i) for i in padrao if i.startswith(p + '-')} for p in ('TP', 'RTP', 'SPK')}
    fora = [r for r in rows if not STD_RE.match(r['id'])]
    tps = [r for r in fora if categoria(r) == 'TP']
    numerico = bool(tps) and all(LEGADO_T_RE.match(r['id']) for r in tps)
    cont = {'TP': 0, 'RTP': 0, 'SPK': 0}
    mapa = {}
    for r in fora:
        cat = categoria(r)
        if cat == 'TP' and numerico:
            m = re.fullmatch(r'T-(\d+)([a-z]*)', r['id'])
            mapa[r['id']] = 'TP-%04d%s' % (int(m.group(1)), m.group(2))
            continue
        cont[cat] += 1
        while cont[cat] in usados[cat]:
            cont[cat] += 1
        usados[cat].add(cont[cat])
        mapa[r['id']] = '%s-%04d' % (cat, cont[cat])
    return mapa


def compilar(mapa):
    chaves = sorted((k for k in mapa if HIFEN_RE.match(k)), key=len, reverse=True)
    if not chaves:
        return None
    return re.compile(r'(?<![A-Za-z0-9_-])(?:' + '|'.join(re.escape(k) for k in chaves) + r')(?![A-Za-z0-9_-])')


def reescrever(texto, mapa, rx):
    if rx is None:
        return texto, 0
    n = [0]

    def sub(m):
        n[0] += 1
        return mapa[m.group(0)]
    return rx.sub(sub, texto), n[0]


def docs_md():
    out = []
    for dp, dn, fn in os.walk(MD):
        dn[:] = [d for d in dn if not d.startswith('.')]
        for f in fn:
            if f.endswith('.md') and f != 'TASKPLAN.md':
                out.append(os.path.join(dp, f))
    return sorted(out)


def cauda_de(texto):
    """Seções gravadas pelos agentes (## 4./5./6./Bloqueio) de um arquivo .taskplan antigo."""
    linhas = texto.replace('\r\n', '\n').split('\n')
    for i, l in enumerate(linhas):
        if CAUDA_RE.match(l):
            return '\n'.join(linhas[i:]).rstrip('\n') + '\n'
    return ''


def parse_blockers(texto):
    """Entradas `## ...` do BLOCKERS.md -> [{'titulo', 'campos', 'aberto', 'texto'}]."""
    entradas, atual = [], None
    for l in texto.replace('\r\n', '\n').split('\n'):
        if l.startswith('## '):
            atual = {'cab': l[3:].strip(), 'linhas': [l]}
            entradas.append(atual)
        elif atual is not None:
            atual['linhas'].append(l)
    out = []
    for e in entradas:
        campos = {}
        for l in e['linhas']:
            m = re.match(r'^-\s*([^:]+):\s*(.*)$', l)
            if m:
                campos.setdefault(m.group(1).strip().lower(), m.group(2).strip())
        if not campos:
            continue
        st = campos.get('status', '')
        fechado = bool(re.match(r'(?i)\W*(resolvid|encerrad|fechad|cancelad)', st))
        desc = campos.get('descrição', campos.get('descricao', e['cab']))
        out.append({'cab': e['cab'], 'campos': campos, 'aberto': not fechado, 'titulo': re.sub(r'\s+', ' ', desc)[:90],
                    'texto': '\n'.join(e['linhas']).rstrip('\n') + '\n'})
    return out


def arquivo_tarefa(r, antes, ag, nota, cauda):
    antes_txt = ' (antes: %s)' % antes if antes and antes != r['id'] else ''
    dash = lambda x: x if x else '—'
    linhas = ['# %s — %s' % (r['id'], r['titulo']), '', 'Reserva: Livre',
              'ID no TASK.md: %s%s · Lote: %s · Agente: %s · Chapéu: %s · Est: %s · Dep: %s · Status no TASK.md: %s' % (
                  r['id'], antes_txt, r['lote'], ag, dash(r['chapeu']), dash(r['est']), dash(r['dep']), dash(r['status'])),
              'Reqs: %s · Aceite: %s' % (dash(r['reqs']), dash(r['aceite'])), '',
              '## 1. Plano de execução', nota, '', '## 2. Plano de teste', nota, '',
              '## 3. Plano de validação de segurança', nota, '']
    return '\n'.join(linhas) + '\n' + (('\n' + cauda) if cauda else '')


def arquivo_bk(bid, e, afeta, status):
    c = e['campos']
    linhas = ['# %s — %s' % (bid, e['titulo']), '', 'Reserva: Livre',
              'Agente: coordenador · Origem: %s · Reportado por: %s · Escalado para: %s' % (
                  e['cab'], c.get('reportado por', '—'), c.get('escalado para', '—')),
              'Status: %s' % status, 'Afeta: %s' % (', '.join(afeta) or '—'), '', '## Bloqueio', e['texto']]
    return '\n'.join(linhas)


def cmd_migrar(args):
    dry = '--confirmar' not in args
    sem_git = '--sem-git' in args
    if not os.path.exists(TASK):
        sys.exit('sem .md/TASK.md')
    rows = [r for t in tabelas() for r in t['rows']]
    if not rows:
        sys.exit('nenhuma tabela de tarefas (cabeçalho com coluna ID) na Seção 3 do TASK.md')
    mapa = construir_mapa(rows)
    novos = [mapa.get(r['id'], r['id']) for r in rows]
    dups = sorted({x for x in novos if novos.count(x) > 1})
    if dups:
        sys.exit('ID duplicado após o rename: ' + ', '.join(dups))
    sem_hifen = [k for k in mapa if not HIFEN_RE.match(k)]
    rx = compilar(mapa)
    if not sem_git:
        try:
            sujo = subprocess.run(['git', 'status', '--porcelain', '--', '.md'], cwd=ROOT, capture_output=True,
                                  text=True).stdout.strip()
        except OSError:
            sujo = 'git indisponível'
        if sujo:
            sys.exit('RECUSADO: há alterações não commitadas em .md/ (o git é o backup da migração):\n' + sujo[:1500])
    existentes, ativas = {}, []
    if os.path.isdir(PLANDIR):
        for f in sorted(os.listdir(PLANDIR)):
            if f.endswith('.md'):
                existentes[f[:-3]] = ler_raw(os.path.join(PLANDIR, f))
        for k in existentes:
            ri = reserva_info(k)
            if ri and ri[0] in ('Em execução', 'Em QA', 'Em DevSecOps') and not velha(ri[2]):
                ativas.append('%s (%s, sessão %s)' % (k, ri[0], ri[1]))
    if ativas:
        sys.exit('RECUSADO: reserva ativa de outra sessão: ' + '; '.join(ativas))
    ids_antigos = {}
    if os.path.exists(IDS_JSON):
        try:
            ids_antigos = json.loads(ler_raw(IDS_JSON))
        except ValueError:
            ids_antigos = {}

    docs, total = [], 0
    for p in docs_md():
        _, n = reescrever(ler_raw(p), mapa, rx)
        if n:
            docs.append((p, n))
            total += n
    prontas = [r for r in rows if estado({'key': '-', 'status': r['status']}) in ('Aprovada', 'Dividida')]
    abertas = [r for r in rows if r not in prontas]
    bks = parse_blockers(reescrever(ler_raw(BLOCKERS), mapa, rx)[0]) if os.path.exists(BLOCKERS) else []
    cats = {c: sum(1 for r in rows if r['id'] in mapa and categoria(r) == c) for c in ('TP', 'RTP', 'SPK')}
    print('MIGRAR %s' % ('DRY-RUN (nada foi alterado)' if dry else 'EXECUTANDO'))
    print('Tarefas no TASK.md: %d (já no padrão: %d)' % (len(rows), len(rows) - len(mapa)))
    print('IDs renomeados: %d (TP %d, RTP %d, SPK %d)' % (len(mapa), cats['TP'], cats['RTP'], cats['SPK']))
    exemplos = list(mapa.items())[:5]
    print('Exemplos: ' + '; '.join('%s -> %s' % kv for kv in exemplos))
    if sem_hifen:
        print('ATENÇÃO: IDs sem hífen só são trocados na tabela, não no texto: ' + ', '.join(sem_hifen[:10]))
    print('Documentos em .md/ com referências a reescrever: %d arquivos, %d ocorrências' % (len(docs), total))
    print('Bloqueios (BLOCKERS.md) -> BK: %d (abertos: %d)' % (len(bks), sum(1 for b in bks if b['aberto'])))
    print('Arquivos de .taskplan existentes (serão apagados e regerados): %d' % len(existentes))
    print('Tarefas sem planejamento (aprovadas/divididas): %d' % len(prontas))
    print('Tarefas a planejar (Executor): %d' % len(abertas))
    for r in abertas[:12]:
        print('ABERTA\t%s\t%s\t%s\t%s' % (mapa.get(r['id'], r['id']), r['lote'], estado({'key': '-', 'status': r['status']}),
                                          r['titulo'][:80]))
    if len(abertas) > 12:
        print('… e mais %d tarefas a planejar' % (len(abertas) - 12))
    if dry:
        return

    # 1. reescreve IDs no TASK.md e nos demais .md (preserva o fim de linha de cada arquivo) + mapa em JSON
    for p in [TASK] + [d for d, _ in docs if os.path.abspath(d) != os.path.abspath(TASK)]:
        gravar_raw(p, reescrever(ler_raw(p), mapa, rx)[0])
    gravar_raw(IDS_JSON, json.dumps(mapa, ensure_ascii=False, indent=1) + '\n')
    inverso = {v: k for k, v in mapa.items()}

    # 2. guarda as seções gravadas pelos agentes e apaga planos e TASKPLAN antigos
    caudas = {}
    for r, novo in zip(rows, novos):
        antigo = r['id']
        candidatos = [norm(antigo), ids_antigos.get(antigo, ''), novo]
        for c in candidatos:
            if c in existentes and cauda_de(existentes[c]):
                caudas[novo] = cauda_de(existentes[c])
                break
    if os.path.isdir(PLANDIR):
        for f in os.listdir(PLANDIR):
            p = os.path.join(PLANDIR, f)
            if f.endswith('.md'):
                os.remove(p)
            elif f.startswith('.lock-') and os.path.isdir(p):
                shutil.rmtree(p, ignore_errors=True)
    if os.path.exists(OUT):
        os.remove(OUT)
    os.makedirs(PLANDIR, exist_ok=True)

    # 3. bloqueios -> BK-0000; o BK aberto entra na dependência das tarefas que ele afeta
    afetadas = {}
    for n, e in enumerate(bks, 1):
        bid = 'BK-%04d' % n
        afeta = sorted(set(ID_RE.findall(e['campos'].get('artefato/trecho afetado', ''))) |
                       {x for x in re.findall(r'\b(?:TP|RTP|SPK)-\d+[a-z]*\b', e['campos'].get('artefato/trecho afetado', ''))})
        st = ('Pendente — em aberto' if e['aberto'] else 'Concluída — ' + e['campos'].get('status', 'resolvido')[:160])
        gravar_raw(plan_path(bid), arquivo_bk(bid, e, afeta, st))
        if e['aberto']:
            for a in afeta:
                afetadas.setdefault(norm(a), []).append(bid)
    if afetadas:
        lines = read_lines(TASK)
        for t in tabelas():
            if 'dep' not in t['cols']:
                continue
            di = t['cols'].index('dep')
            for r in t['rows']:
                bk = afetadas.get(norm(r['id']))
                if bk and not r['status'].startswith('Concluída'):
                    c = list(r['cells'])
                    c[di] = (c[di] if c[di] not in ('', '-', '—') else '') + (', ' if c[di] not in ('', '-', '—') else '') + ', '.join(bk)
                    lines[r['line']] = '| ' + ' | '.join(c) + ' |'
        write_lines(TASK, lines, task_crlf())

    # 4. um arquivo por tarefa (aprovadas/divididas: sem planejamento; em aberto: seções PENDENTE)
    for r in [x for t in tabelas() for x in t['rows']]:
        est = estado({'key': '-', 'status': r['status']})
        nota = NOTA_PRONTA if est == 'Aprovada' else NOTA_DIVIDIDA if est == 'Dividida' else NOTA_A_GERAR
        gravar_raw(plan_path(norm(r['id'])), arquivo_tarefa(r, inverso.get(r['id']), agente(norm(r['id'])), nota,
                                                             caudas.get(r['id'], '')))
    gerar()


# ----------------------------------------------------------------- entrada
ESCREVE_TASK = {'consolidar', 'gerar', 'set', 'nova', 'deps-substituir', 'ordenar', 'bloquear', 'desbloquear'}


def despachar(a):
    cmd = a[0] if a else ''
    if cmd == 'migrar':
        cmd_migrar(a[1:])
    elif cmd == 'gerar':
        gerar()
    elif cmd == 'consolidar':
        cmd_consolidar(a[1:])
    elif cmd == 'set' and len(a) == 3:
        set_estado(a[1], a[2])
    elif cmd == 'estados':
        print('\n'.join(ESTADOS))
    elif cmd == 'proxima':
        cmd_proxima(a[1:])
    elif cmd == 'fila':
        cmd_fila(a[1:])
    elif cmd == 'reservar' and len(a) >= 3:
        cmd_reservar(a[1:])
    elif cmd == 'etapa' and len(a) == 4:
        cmd_etapa(a[1:])
    elif cmd == 'iniciar' and len(a) >= 3:
        cmd_iniciar(a[1:])
    elif cmd == 'concluir' and len(a) >= 4:
        cmd_concluir(a[1:])
    elif cmd == 'diff' and len(a) == 2:
        cmd_diff(a[1:])
    elif cmd == 'liberar' and len(a) == 3:
        cmd_liberar(a[1:])
    elif cmd == 'status' and len(a) >= 3:
        cmd_status(a[1:])
    elif cmd == 'proximo-id':
        cmd_proximo_id(a[1:])
    elif cmd == 'nova':
        cmd_nova(a[1:])
    elif cmd == 'deps-substituir' and len(a) == 3:
        cmd_deps_substituir(a[1:])
    elif cmd == 'ordenar':
        cmd_ordenar(a[1:])
    elif cmd == 'bloquear' and len(a) >= 2:
        cmd_bloquear(a[1:])
    elif cmd == 'desbloquear' and len(a) >= 2:
        cmd_desbloquear(a[1:])
    elif cmd == 'despriorizar' and len(a) >= 2:
        cmd_despriorizar(a[1:])
    elif cmd == 'repriorizar' and len(a) == 2:
        cmd_repriorizar(a[1:])
    elif cmd == 'tarefa' and len(a) == 2:
        cmd_tarefa(a[1:])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] in ESCREVE_TASK:  # escritas no TASK.md/TASKPLAN.md são serializadas entre sessões/agentes
        with Lock('_TASK', 300):
            despachar(a)
    else:
        despachar(a)
