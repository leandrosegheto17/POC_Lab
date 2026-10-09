#!/usr/bin/env python3
"""Mede a saúde estrutural do código do projeto, sem alterar nada.

Usado pela skill `architecture-health-review` (comando `/revisar`). Produz um
relatório em markdown com números objetivos; quem interpreta contra o SDD.md e
contra `.claude/CONVENCOES-DE-CODIGO.md` é o Coordenador.

Seções do relatório:
  1. Tamanho de arquivos (acima do limite por tipo)
  2. Blocos duplicados entre arquivos (janela de linhas normalizadas)
  3. IDs de tarefa/lote no código
  4. Comentários que admitem cópia
  5. Acesso a dados (SQL/prepare) por pasta
  6. Dependências: entre pacotes e entre pontos de entrada
  7. Conversões forçadas (`as unknown as`)

Uso:
  python .claude/scripts/saude.py [--raiz DIR] [--saida ARQ] [--top N]
      [--limite-codigo 300] [--limite-componente 200] [--limite-teste 400]
      [--janela 8] [--incluir-testes]

Só biblioteca padrão. Lista os arquivos com `git ls-files` (respeita o
.gitignore); sem git, percorre a árvore ignorando pastas geradas.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath

EXT_CODIGO = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".java", ".kt",
    ".cs", ".rb", ".php", ".rs", ".swift", ".vue", ".svelte", ".sql",
}
EXT_ESTILO = {".css", ".scss", ".sass", ".less"}
EXT_COMPONENTE = {".tsx", ".jsx", ".vue", ".svelte"}
EXT_JS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}

PASTAS_IGNORADAS = {
    "node_modules", "dist", "build", "out", "coverage", ".git", ".claude", ".md",
    ".wrangler", ".next", ".turbo", "vendor", "__pycache__", ".venv", "venv",
}
SUFIXOS_IGNORADOS = (".min.js", ".min.css", ".d.ts", ".lock", "-lock.yaml", "-lock.json")

# Pastas cujo conteúdo é ponto de entrada: um arquivo daqui não deve importar outro daqui.
PASTAS_ENTRADA = {
    "cli", "rotas", "routes", "commands", "comandos", "controllers", "handlers",
    "paginas", "pages", "screens", "telas",
}

RE_ID_TAREFA = re.compile(r"\b(?:TP|RTP|SPK|BK)-\d{3,4}[a-z]*\b|\bLote[ -]\d+\b")
RE_COMENTARIO_COPIA = re.compile(
    r"duplicad|mesma l[oó]gica|copiad[oa] de|espelh|c[oó]pia de|igual a `|same logic|copied from",
    re.IGNORECASE,
)
RE_ACESSO_DADOS = re.compile(
    r"\.prepare\(|\.query\(|\.execute\(|\bdb\.exec\(|"
    r"[`'\"]\s*(?:SELECT|INSERT|UPDATE|DELETE)\s",
    re.IGNORECASE,
)
RE_CAST_FORCADO = re.compile(r"\bas\s+unknown\s+as\b")
RE_IMPORT_JS = re.compile(
    r"""(?:^|[\s;])(?:import|export)\s[^'"`;]*?\sfrom\s+['"]([^'"]+)['"]"""
    r"""|(?:^|[\s;])import\s+['"]([^'"]+)['"]"""
    r"""|\bimport\(\s*['"]([^'"]+)['"]\s*\)"""
    r"""|\brequire\(\s*['"]([^'"]+)['"]\s*\)""",
    re.MULTILINE,
)
LINHAS_TRIVIAIS = {
    "{", "}", "(", ")", "[", "]", "};", "});", "})", "},", "),", ");", "];",
    "]);", "/>", ">", "</>", "<>", "*/", "/**", "else {", "} else {", "return;",
    "break;", "default:", "try {", "} catch {", "} finally {",
}


# ---------------------------------------------------------------- arquivos


def eh_teste(caminho: str) -> bool:
    partes = PurePosixPath(caminho).parts
    nome = partes[-1]
    return (
        any(p in {"test", "tests", "__tests__", "spec", "e2e"} for p in partes[:-1])
        or ".test." in nome
        or ".spec." in nome
        or nome.startswith("test_")
    )


def listar_arquivos(raiz: Path) -> list[str]:
    try:
        saida = subprocess.run(
            ["git", "ls-files", "-z"], cwd=raiz, capture_output=True, check=True
        ).stdout.decode("utf-8", "replace")
        candidatos = [c for c in saida.split("\0") if c]
    except (OSError, subprocess.CalledProcessError):
        candidatos = []
        for pasta, subpastas, nomes in os.walk(raiz):
            subpastas[:] = [s for s in subpastas if s not in PASTAS_IGNORADAS]
            for nome in nomes:
                completo = Path(pasta, nome).relative_to(raiz)
                candidatos.append(completo.as_posix())

    arquivos = []
    for caminho in candidatos:
        partes = PurePosixPath(caminho).parts
        if any(p in PASTAS_IGNORADAS for p in partes[:-1]):
            continue
        if caminho.endswith(SUFIXOS_IGNORADOS):
            continue
        ext = PurePosixPath(caminho).suffix.lower()
        if ext in EXT_CODIGO or ext in EXT_ESTILO:
            if (raiz / caminho).is_file():
                arquivos.append(caminho)
    return sorted(arquivos)


def ler(raiz: Path, caminho: str) -> list[str]:
    try:
        return (raiz / caminho).read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []


def linha_eh_comentario(texto: str) -> bool:
    t = texto.lstrip()
    return t.startswith(("//", "#", "*", "/*", "--", "<!--"))


# ---------------------------------------------------------------- 1. tamanho


def secao_tamanho(conteudo, args):
    linhas = []
    acima = {"código": [], "componente": [], "teste": [], "estilo": []}
    for caminho, texto in conteudo.items():
        n = len(texto)
        ext = PurePosixPath(caminho).suffix.lower()
        if ext in EXT_ESTILO:
            tipo, limite = "estilo", args.limite_codigo
        elif eh_teste(caminho):
            tipo, limite = "teste", args.limite_teste
        elif ext in EXT_COMPONENTE:
            tipo, limite = "componente", args.limite_componente
        else:
            tipo, limite = "código", args.limite_codigo
        if n > limite:
            acima[tipo].append((n, caminho, limite))

    linhas.append("## 1. Tamanho de arquivos\n")
    linhas.append(
        f"Limites: código {args.limite_codigo} · componente de tela {args.limite_componente} · "
        f"teste {args.limite_teste} · estilo {args.limite_codigo} linhas.\n"
    )
    linhas.append("| Tipo | Acima do limite |")
    linhas.append("|---|---|")
    for tipo, itens in acima.items():
        linhas.append(f"| {tipo} | {len(itens)} |")
    linhas.append("")
    todos = sorted((i for itens in acima.values() for i in itens), reverse=True)
    if todos:
        linhas.append("| Linhas | Limite | Arquivo |")
        linhas.append("|---|---|---|")
        for n, caminho, limite in todos[: args.top]:
            linhas.append(f"| {n} | {limite} | `{caminho}` |")
        if len(todos) > args.top:
            linhas.append(f"\n… e mais {len(todos) - args.top} arquivo(s).")
    linhas.append("")
    return linhas


# ---------------------------------------------------------------- 2. duplicação


def normalizar(texto: list[str]) -> list[tuple[int, str]]:
    """Linhas relevantes para comparar cópia: sem vazias, comentários, imports e pontuação solta."""
    saida = []
    for numero, linha in enumerate(texto, start=1):
        t = re.sub(r"\s+", " ", linha.strip())
        if not t or t in LINHAS_TRIVIAIS or linha_eh_comentario(t):
            continue
        if t.startswith(("import ", "from ", "export {", "} from ")):
            continue
        saida.append((numero, t))
    return saida


def secao_duplicacao(conteudo, args):
    janela = args.janela
    normalizados = {}
    ocorrencias = defaultdict(list)
    for caminho, texto in conteudo.items():
        ext = PurePosixPath(caminho).suffix.lower()
        if ext in EXT_ESTILO or ext == ".sql":
            continue
        if eh_teste(caminho) and not args.incluir_testes:
            continue
        norm = normalizar(texto)
        normalizados[caminho] = norm
        for i in range(len(norm) - janela + 1):
            chave = hashlib.sha1(
                "\n".join(t for _, t in norm[i : i + janela]).encode("utf-8")
            ).hexdigest()
            ocorrencias[chave].append((caminho, i))

    pares = defaultdict(set)
    for lista in ocorrencias.values():
        if len(lista) < 2 or len(lista) > 12:  # >12: padrão genérico, não cópia
            continue
        for a in range(len(lista)):
            for b in range(a + 1, len(lista)):
                (fa, ia), (fb, ib) = sorted([lista[a], lista[b]])
                if fa == fb and abs(ia - ib) < janela:
                    continue
                pares[(fa, fb)].add((ia, ib))

    blocos = []
    for (fa, fb), indices in pares.items():
        restantes = sorted(indices)
        vistos = set()
        for ia, ib in restantes:
            if (ia, ib) in vistos:
                continue
            fim = 0
            while (ia + fim + 1, ib + fim + 1) in indices:
                fim += 1
            for k in range(fim + 1):
                vistos.add((ia + k, ib + k))
            tamanho = fim + janela
            na, nb = normalizados[fa], normalizados[fb]
            ini_a, fim_a = na[ia][0], na[min(ia + tamanho - 1, len(na) - 1)][0]
            ini_b, fim_b = nb[ib][0], nb[min(ib + tamanho - 1, len(nb) - 1)][0]
            blocos.append((tamanho, fa, ini_a, fim_a, fb, ini_b, fim_b))

    blocos.sort(reverse=True)
    linhas = ["## 2. Blocos duplicados\n"]
    escopo = "código e testes" if args.incluir_testes else "código (testes fora; use --incluir-testes)"
    linhas.append(
        f"Janela: {janela} linhas normalizadas (sem vazias, comentários, imports e pontuação solta). "
        f"Escopo: {escopo}.\n"
    )
    if not blocos:
        linhas.append("Nenhum bloco duplicado encontrado.\n")
        return linhas
    total = sum(b[0] for b in blocos)
    mesmo_arquivo = sum(1 for b in blocos if b[1] == b[4])
    linhas.append(
        f"{len(blocos)} bloco(s), {total} linhas normalizadas repetidas; "
        f"{mesmo_arquivo} dentro do mesmo arquivo.\n"
    )
    linhas.append("| Linhas | Arquivo A | Arquivo B |")
    linhas.append("|---|---|---|")
    for tamanho, fa, ia, fa_fim, fb, ib, fb_fim in blocos[: args.top]:
        linhas.append(f"| {tamanho} | `{fa}:{ia}-{fa_fim}` | `{fb}:{ib}-{fb_fim}` |")
    if len(blocos) > args.top:
        linhas.append(f"\n… e mais {len(blocos) - args.top} bloco(s).")
    linhas.append("")
    return linhas


# ---------------------------------------------------------------- 3 e 4. comentários


def secao_ids_tarefa(conteudo, args):
    por_arquivo = {}
    for caminho, texto in conteudo.items():
        n = sum(len(RE_ID_TAREFA.findall(linha)) for linha in texto)
        if n:
            por_arquivo[caminho] = n
    linhas = ["## 3. IDs de tarefa/lote no código\n"]
    total = sum(por_arquivo.values())
    linhas.append(f"{total} menção(ões) em {len(por_arquivo)} arquivo(s).\n")
    if por_arquivo:
        linhas.append("| Menções | Arquivo |")
        linhas.append("|---|---|")
        for caminho, n in sorted(por_arquivo.items(), key=lambda x: (-x[1], x[0]))[: args.top]:
            linhas.append(f"| {n} | `{caminho}` |")
    linhas.append("")
    return linhas


def secao_comentarios_copia(conteudo, args):
    achados = []
    for caminho, texto in conteudo.items():
        for numero, linha in enumerate(texto, start=1):
            if linha_eh_comentario(linha) and RE_COMENTARIO_COPIA.search(linha):
                achados.append((caminho, numero, linha.strip()[:140]))
    linhas = ["## 4. Comentários que admitem cópia\n"]
    linhas.append(f"{len(achados)} ocorrência(s).\n")
    if achados:
        linhas.append("| Local | Trecho |")
        linhas.append("|---|---|")
        for caminho, numero, trecho in achados[: args.top * 2]:
            trecho = trecho.replace("|", "\\|")
            linhas.append(f"| `{caminho}:{numero}` | {trecho} |")
    linhas.append("")
    return linhas


# ---------------------------------------------------------------- 5. acesso a dados


def zona(caminho: str, profundidade: int = 3) -> str:
    pasta = PurePosixPath(caminho).parent.parts
    return "/".join(pasta[:profundidade]) or "."


def secao_acesso_dados(conteudo, args):
    por_zona = defaultdict(lambda: defaultdict(int))
    for caminho, texto in conteudo.items():
        if eh_teste(caminho) or PurePosixPath(caminho).suffix.lower() in EXT_ESTILO | {".sql"}:
            continue
        n = sum(1 for linha in texto if RE_ACESSO_DADOS.search(linha))
        if n:
            por_zona[zona(caminho)][caminho] += n
    linhas = ["## 5. Acesso a dados (SQL/prepare/query fora de testes)\n"]
    linhas.append(
        "Compare com o módulo único de acesso a dados definido na subseção "
        "\"Pacotes, pastas e fronteiras\" do SDD.md: toda pasta além dele é achado.\n"
    )
    if not por_zona:
        linhas.append("Nenhum acesso a dados encontrado.\n")
        return linhas
    linhas.append("| Pasta | Arquivos | Ocorrências |")
    linhas.append("|---|---|---|")
    for z, arquivos in sorted(por_zona.items(), key=lambda x: -sum(x[1].values())):
        linhas.append(f"| `{z}` | {len(arquivos)} | {sum(arquivos.values())} |")
    linhas.append("")
    return linhas


# ---------------------------------------------------------------- 6. dependências


def pacotes_do_workspace(raiz: Path, arquivos_pkg: list[str]) -> dict[str, str]:
    """nome do pacote → pasta (relativa à raiz), para pacotes internos do monorepo."""
    pacotes = {}
    for caminho in arquivos_pkg:
        pasta = PurePosixPath(caminho).parent.as_posix()
        if pasta == ".":
            continue
        try:
            dados = json.loads((raiz / caminho).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        nome = dados.get("name")
        if isinstance(nome, str):
            pacotes[nome] = pasta
    return pacotes


def resolver_import(raiz: Path, origem: str, especificador: str, pacotes: dict[str, str]):
    if especificador.startswith("."):
        base = PurePosixPath(origem).parent / especificador
        alvo = os.path.normpath(base.as_posix()).replace("\\", "/")
    else:
        partes = especificador.split("/")
        nome = "/".join(partes[:2]) if especificador.startswith("@") else partes[0]
        if nome not in pacotes:
            return None  # dependência externa
        resto = especificador[len(nome):].lstrip("/")
        pasta = pacotes[nome]
        alvo = f"{pasta}/{resto}" if resto else pasta
        if resto and not (raiz / alvo).exists():
            sem_ext = re.sub(r"\.(js|mjs|cjs|jsx)$", "", resto)
            for candidato in (f"{pasta}/src/{resto}", f"{pasta}/src/{sem_ext}.ts", f"{pasta}/src/{sem_ext}.tsx"):
                if (raiz / candidato).exists():
                    alvo = candidato
                    break
    return alvo


def pacote_de(caminho: str, pastas_pacote: list[str]) -> str:
    melhor = "."
    for pasta in pastas_pacote:
        if (caminho == pasta or caminho.startswith(pasta + "/")) and len(pasta) > len(melhor):
            melhor = pasta
    return melhor


def secao_dependencias(raiz, conteudo, pacotes, args):
    pastas_pacote = sorted(set(pacotes.values()))
    entre_pacotes = defaultdict(lambda: defaultdict(set))
    entrada_para_entrada = []
    for caminho, texto in conteudo.items():
        if PurePosixPath(caminho).suffix.lower() not in EXT_JS or eh_teste(caminho):
            continue
        fonte = "\n".join(texto)
        pkg_origem = pacote_de(caminho, pastas_pacote)
        pasta_origem = PurePosixPath(caminho).parent
        for casamento in RE_IMPORT_JS.finditer(fonte):
            especificador = next(g for g in casamento.groups() if g)
            alvo = resolver_import(raiz, caminho, especificador, pacotes)
            if alvo is None:
                continue
            pkg_alvo = pacote_de(alvo, pastas_pacote)
            if pkg_alvo != pkg_origem:
                entre_pacotes[(pkg_origem, pkg_alvo)][zona(alvo, 4)].add(caminho)
            pasta_alvo = PurePosixPath(alvo).parent
            if (
                pasta_alvo == pasta_origem
                and pasta_origem.name in PASTAS_ENTRADA
                and not especificador.endswith((".css", ".scss"))
            ):
                entrada_para_entrada.append((caminho, especificador))

    linhas = ["## 6. Dependências\n"]
    linhas.append("### 6a. Entre pacotes do monorepo\n")
    if pastas_pacote:
        linhas.append("Pacotes encontrados: " + ", ".join(f"`{n}` ({p})" for n, p in sorted(pacotes.items())) + ".\n")
    if not entre_pacotes:
        linhas.append("Nenhum import entre pacotes internos.\n")
    else:
        linhas.append(
            "Confira cada linha contra a subseção \"Pacotes, pastas e fronteiras\" do SDD.md. "
            "Aplicação importando o pacote de outra aplicação é sinal de pacote compartilhado faltando.\n"
        )
        linhas.append("| De | Para | Pasta importada | Arquivos que importam |")
        linhas.append("|---|---|---|---|")
        for (de, para), destinos in sorted(entre_pacotes.items()):
            for destino, origens in sorted(destinos.items()):
                linhas.append(f"| `{de}` | `{para}` | `{destino}` | {len(origens)} |")
    linhas.append("")
    linhas.append("### 6b. Ponto de entrada importando ponto de entrada\n")
    linhas.append(f"Pastas consideradas de entrada: {', '.join(sorted(PASTAS_ENTRADA))}.\n")
    if not entrada_para_entrada:
        linhas.append("Nenhum caso.\n")
    else:
        linhas.append("| Arquivo | Importa |")
        linhas.append("|---|---|")
        for caminho, especificador in entrada_para_entrada[: args.top * 2]:
            linhas.append(f"| `{caminho}` | `{especificador}` |")
    linhas.append("")
    return linhas


# ---------------------------------------------------------------- 7. casts


def secao_casts(conteudo, args):
    achados = []
    for caminho, texto in conteudo.items():
        if eh_teste(caminho):
            continue
        for numero, linha in enumerate(texto, start=1):
            if RE_CAST_FORCADO.search(linha):
                achados.append(f"`{caminho}:{numero}`")
    linhas = ["## 7. Conversões forçadas (`as unknown as`, fora de testes)\n"]
    linhas.append(f"{len(achados)} ocorrência(s).\n")
    if achados:
        linhas.append(", ".join(achados[: args.top * 2]))
        linhas.append("")
    return linhas


# ---------------------------------------------------------------- main


def raiz_padrao() -> Path:
    try:
        saida = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"], capture_output=True, check=True, text=True
        ).stdout.strip()
        return Path(saida)
    except (OSError, subprocess.CalledProcessError):
        return Path.cwd()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Relatório de saúde estrutural do código.")
    parser.add_argument("--raiz", type=Path, default=None)
    parser.add_argument("--saida", type=Path, default=None, help="grava o relatório neste arquivo")
    parser.add_argument("--top", type=int, default=15)
    parser.add_argument("--limite-codigo", type=int, default=300)
    parser.add_argument("--limite-componente", type=int, default=200)
    parser.add_argument("--limite-teste", type=int, default=400)
    parser.add_argument("--janela", type=int, default=8)
    parser.add_argument("--incluir-testes", action="store_true")
    args = parser.parse_args()

    raiz = (args.raiz or raiz_padrao()).resolve()
    arquivos = listar_arquivos(raiz)
    conteudo = {c: ler(raiz, c) for c in arquivos}

    try:
        todos = subprocess.run(
            ["git", "ls-files", "-z", "*package.json"], cwd=raiz, capture_output=True, check=True
        ).stdout.decode("utf-8", "replace").split("\0")
    except (OSError, subprocess.CalledProcessError):
        todos = [
            Path(p, "package.json").relative_to(raiz).as_posix()
            for p, subs, nomes in os.walk(raiz)
            if "package.json" in nomes and not any(x in PASTAS_IGNORADAS for x in Path(p).parts)
        ]
    arquivos_pkg = [
        a for a in todos
        if a.endswith("package.json") and not any(p in PASTAS_IGNORADAS for p in PurePosixPath(a).parts)
    ]
    pacotes = pacotes_do_workspace(raiz, arquivos_pkg)

    total_linhas = sum(len(t) for t in conteudo.values())
    relatorio = [
        "# Saúde estrutural do código\n",
        f"Raiz: `{raiz.as_posix()}` · {len(arquivos)} arquivo(s) de código/estilo · {total_linhas} linhas.\n",
    ]
    relatorio += secao_tamanho(conteudo, args)
    relatorio += secao_duplicacao(conteudo, args)
    relatorio += secao_ids_tarefa(conteudo, args)
    relatorio += secao_comentarios_copia(conteudo, args)
    relatorio += secao_acesso_dados(conteudo, args)
    relatorio += secao_dependencias(raiz, conteudo, pacotes, args)
    relatorio += secao_casts(conteudo, args)

    texto = "\n".join(relatorio).rstrip() + "\n"
    if args.saida:
        args.saida.parent.mkdir(parents=True, exist_ok=True)
        args.saida.write_text(texto, encoding="utf-8")
        print(f"Relatório gravado em {args.saida.as_posix()}")
    else:
        print(texto)
    return 0


if __name__ == "__main__":
    sys.exit(main())
