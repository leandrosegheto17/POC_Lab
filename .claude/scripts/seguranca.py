#!/usr/bin/env python3
"""Roda as ferramentas da auditoria de segurança de release e consolida a evidência.

Usado pela skill `security-release-audit` (comando `/deploy`, Seções 2b e 4a, e
`/deploy --auditar`). Não corrige nada: executa, guarda a saída bruta e resume.
Quem interpreta, confirma e classifica os achados é o Validador (chapéu DevSecOps).

Modos:

  Fase A (padrão) — dependências, segredos no histórico git e SAST:
    python .claude/scripts/seguranca.py [--saida DIR] [--semgrep-config p/typescript,...]

  Fase C — teste ativo (DAST) contra a aplicação rodando:
    python .claude/scripts/seguranca.py --dast URL --sondas .md/.seguranca/sondas.json
        [--sem-zap] [--saida DIR]

  --estrito: termina com código 1 se houver ferramenta não executada/falha, achado
  alto/crítico ou sonda reprovada (útil no CI).

Ferramentas (todas gratuitas). Cada uma é procurada no PATH; se faltar e o Docker
estiver disponível, roda pela imagem oficial. Se nenhuma das duas der, o item sai
como NÃO EXECUTADO — nunca é pulado em silêncio.
  - dependências: pnpm audit --prod | npm audit --omit=dev | pip-audit; osv-scanner
  - segredos:     gitleaks (histórico git inteiro)
  - SAST:         semgrep
  - DAST:         sondas deste script (urllib) + OWASP ZAP baseline (Docker)

Formato de sondas.json:
{
  "cabecalhos_esperados": {"Content-Security-Policy": null, "X-Content-Type-Options": "nosniff"},
  "cors_aberto_proibido": true,
  "sondas": [
    {"nome": "injecao SQL no codigo", "metodo": "GET",
     "caminho": "/api/v1/pedidos/%27%20OR%201%3D1%20--/linha-do-tempo",
     "status_esperado": [400, 404], "nao_contem": ["SELECT"], "contem": []},
    {"nome": "POST em rota de leitura", "metodo": "POST", "caminho": "/api/v1/resumo",
     "corpo": "{}", "cabecalhos": {"Content-Type": "application/json"},
     "status_esperado": [405]}
  ]
}
`cabecalhos_esperados`: valor null = só exige que exista; texto = exige que contenha.
Toda resposta também é checada contra padrões de vazamento (stack trace, SQL, caminho).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TEMPO_LIMITE_FERRAMENTA = 900
TEMPO_LIMITE_SONDA = 20
SEMGREP_PADRAO = "p/default,p/secrets,p/owasp-top-ten"

PADROES_VAZAMENTO = [
    (r"at \S+ \(?[^\s()]+:\d+:\d+\)?", "stack trace JS"),
    (r"Traceback \(most recent call last\)", "stack trace Python"),
    (r"\b(?:SQLITE_|SQLSTATE|syntax error at or near|near \".*\": syntax error)", "erro de SQL"),
    (r"\bSELECT\s+.+\s+FROM\s+\w+", "SQL na resposta"),
    (r"node_modules[/\\]", "caminho interno"),
    (r"[A-Z]:\\\\(?:Users|Projetos|src)", "caminho de arquivo Windows"),
    (r"/(?:home|usr|var|app|src)/[\w./-]+\.(?:js|ts|py)", "caminho de arquivo"),
]


# ---------------------------------------------------------------- utilitários


def raiz_padrao() -> Path:
    try:
        saida = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"], capture_output=True, check=True, text=True
        ).stdout.strip()
        return Path(saida)
    except (OSError, subprocess.CalledProcessError):
        return Path.cwd()


def docker_disponivel() -> bool:
    caminho = shutil.which("docker")
    if not caminho:
        return False
    try:
        return subprocess.run([caminho, "info"], capture_output=True, timeout=30).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def rodar(argv: list[str], cwd: Path, arquivo_saida: Path | None = None) -> dict:
    """Executa e devolve {codigo, stdout, stderr, erro}. Grava stdout em arquivo_saida se pedido."""
    try:
        r = subprocess.run(
            argv, cwd=cwd, capture_output=True, timeout=TEMPO_LIMITE_FERRAMENTA,
            text=True, encoding="utf-8", errors="replace",
        )
    except FileNotFoundError as e:
        return {"codigo": None, "stdout": "", "stderr": "", "erro": f"não encontrado: {e}"}
    except subprocess.TimeoutExpired:
        return {"codigo": None, "stdout": "", "stderr": "", "erro": f"tempo esgotado ({TEMPO_LIMITE_FERRAMENTA}s)"}
    if arquivo_saida is not None and r.stdout:
        arquivo_saida.write_text(r.stdout, encoding="utf-8")
    return {"codigo": r.returncode, "stdout": r.stdout, "stderr": r.stderr, "erro": None}


def versao(argv: list[str], cwd: Path) -> str:
    r = rodar(argv, cwd)
    texto = (r["stdout"] or r["stderr"] or "").strip().splitlines()
    return texto[0][:80] if texto else "?"


def carregar_json(texto: str):
    try:
        return json.loads(texto)
    except ValueError:
        # algumas ferramentas imprimem linhas antes do JSON
        inicio = min((i for i in (texto.find("{"), texto.find("[")) if i >= 0), default=-1)
        if inicio < 0:
            return None
        try:
            return json.loads(texto[inicio:])
        except ValueError:
            return None


def item(nome, status, comando="", versao_ferramenta="", resumo="", arquivo="", contagem=None):
    return {
        "nome": nome, "status": status, "comando": comando, "versao": versao_ferramenta,
        "resumo": resumo, "arquivo": arquivo, "contagem": contagem or {},
    }


# ---------------------------------------------------------------- fase A


def auditoria_dependencias(raiz: Path, saida: Path, docker: bool) -> list[dict]:
    itens = []
    if (raiz / "package.json").exists():
        if (raiz / "pnpm-lock.yaml").exists() and shutil.which("pnpm"):
            argv = [shutil.which("pnpm"), "audit", "--prod", "--json"]
            nome_cmd, vers = "pnpm audit --prod --json", versao([shutil.which("pnpm"), "--version"], raiz)
        elif shutil.which("npm"):
            argv = [shutil.which("npm"), "audit", "--omit=dev", "--json"]
            nome_cmd, vers = "npm audit --omit=dev --json", versao([shutil.which("npm"), "--version"], raiz)
        else:
            argv = None
        if argv is None:
            itens.append(item("Dependências (Node)", "NÃO EXECUTADO", resumo="pnpm/npm não encontrado"))
        else:
            arq = saida / "dependencias-node.json"
            r = rodar(argv, raiz, arq)
            dados = carregar_json(r["stdout"])
            if r["erro"] or not isinstance(dados, dict):
                itens.append(item("Dependências (Node)", "FALHOU", nome_cmd, vers,
                                  r["erro"] or (r["stderr"] or "saída não é JSON")[:200], arq.name))
            else:
                vul = (dados.get("metadata") or {}).get("vulnerabilities") or {}
                cont = {k: int(vul.get(k, 0) or 0) for k in ("critical", "high", "moderate", "low")}
                status = "ACHADOS" if any(cont.values()) else "OK"
                itens.append(item("Dependências (Node)", status, nome_cmd, vers,
                                  ", ".join(f"{k}: {v}" for k, v in cont.items()), arq.name, cont))

    if any((raiz / f).exists() for f in ("requirements.txt", "pyproject.toml", "Pipfile.lock")):
        if shutil.which("pip-audit"):
            arq = saida / "dependencias-python.json"
            r = rodar([shutil.which("pip-audit"), "-f", "json"], raiz, arq)
            dados = carregar_json(r["stdout"])
            if r["erro"] or dados is None:
                itens.append(item("Dependências (Python)", "FALHOU", "pip-audit -f json", "",
                                  r["erro"] or r["stderr"][:200], arq.name))
            else:
                deps = dados.get("dependencies", dados) if isinstance(dados, dict) else dados
                n = sum(len(d.get("vulns", [])) for d in deps if isinstance(d, dict))
                itens.append(item("Dependências (Python)", "ACHADOS" if n else "OK", "pip-audit -f json",
                                  versao([shutil.which("pip-audit"), "--version"], raiz),
                                  f"{n} vulnerabilidade(s)", arq.name, {"sem_severidade": n}))
        else:
            itens.append(item("Dependências (Python)", "NÃO EXECUTADO", resumo="pip-audit não encontrado"))

    # osv-scanner: lê todos os lockfiles do repositório
    arq = saida / "osv-scanner.json"
    if shutil.which("osv-scanner"):
        exe = shutil.which("osv-scanner")
        r = rodar([exe, "scan", "source", "-r", "--format", "json", "."], raiz, arq)
        if r["codigo"] not in (0, 1) or not r["stdout"]:  # versões antigas sem subcomando "scan"
            r = rodar([exe, "--format", "json", "-r", "."], raiz, arq)
        vers = versao([exe, "--version"], raiz)
        cmd = "osv-scanner scan source -r --format json ."
    elif docker:
        r = rodar(["docker", "run", "--rm", "-v", f"{raiz}:/src", "ghcr.io/google/osv-scanner:latest",
                   "scan", "source", "-r", "--format", "json", "/src"], raiz, arq)
        vers, cmd = "imagem ghcr.io/google/osv-scanner:latest", "docker run ... osv-scanner scan source -r /src"
    else:
        itens.append(item("Dependências (OSV, todos os lockfiles)", "NÃO EXECUTADO",
                          resumo="osv-scanner e Docker indisponíveis"))
        return itens
    dados = carregar_json(r["stdout"])
    if r["erro"] or not isinstance(dados, dict):
        itens.append(item("Dependências (OSV, todos os lockfiles)", "FALHOU", cmd, vers,
                          r["erro"] or (r["stderr"] or "saída não é JSON")[:200], arq.name))
    else:
        n = sum(
            len(p.get("vulnerabilities", []))
            for res in dados.get("results", []) for p in res.get("packages", [])
        )
        itens.append(item("Dependências (OSV, todos os lockfiles)", "ACHADOS" if n else "OK", cmd, vers,
                          f"{n} vulnerabilidade(s) (severidade no arquivo bruto)", arq.name, {"sem_severidade": n}))
    return itens


def auditoria_segredos(raiz: Path, saida: Path, docker: bool) -> dict:
    arq = saida / "gitleaks.json"
    if shutil.which("gitleaks"):
        exe = shutil.which("gitleaks")
        vers = versao([exe, "version"], raiz)
        r = rodar([exe, "git", "--report-format", "json", "--report-path", str(arq), "--no-banner", "."], raiz)
        if r["codigo"] not in (0, 1):  # versões < 8.19 não têm o subcomando "git"
            r = rodar([exe, "detect", "--source", ".", "--report-format", "json",
                       "--report-path", str(arq), "--no-banner"], raiz)
        cmd = "gitleaks git --report-format json . (histórico inteiro)"
    elif docker:
        vers = "imagem zricethezav/gitleaks:latest"
        r = rodar(["docker", "run", "--rm", "-v", f"{raiz}:/repo", "-v", f"{saida}:/saida",
                   "zricethezav/gitleaks:latest", "git", "--report-format", "json",
                   "--report-path", "/saida/gitleaks.json", "--no-banner", "/repo"], raiz)
        cmd = "docker run ... gitleaks git /repo (histórico inteiro)"
    else:
        return item("Segredos (histórico git)", "NÃO EXECUTADO", resumo="gitleaks e Docker indisponíveis")
    if r["erro"] or r["codigo"] not in (0, 1):
        return item("Segredos (histórico git)", "FALHOU", cmd, vers, r["erro"] or r["stderr"][:200], arq.name)
    dados = carregar_json(arq.read_text(encoding="utf-8")) if arq.exists() else []
    n = len(dados) if isinstance(dados, list) else 0
    return item("Segredos (histórico git)", "ACHADOS" if n else "OK", cmd, vers,
                f"{n} segredo(s) — todo achado confirmado é Alto/Crítico", arq.name, {"critical": n})


def auditoria_sast(raiz: Path, saida: Path, docker: bool, configs: str) -> dict:
    arq = saida / "semgrep.json"
    args_cfg = []
    for c in configs.split(","):
        if c.strip():
            args_cfg += ["--config", c.strip()]
    if shutil.which("semgrep"):
        exe = shutil.which("semgrep")
        vers = versao([exe, "--version"], raiz)
        r = rodar([exe, "scan", *args_cfg, "--json", "--metrics=off", "--output", str(arq)], raiz)
        cmd = f"semgrep scan {' '.join(args_cfg)} --json"
    elif docker:
        vers = "imagem semgrep/semgrep:latest"
        r = rodar(["docker", "run", "--rm", "-v", f"{raiz}:/src", "-v", f"{saida}:/saida",
                   "semgrep/semgrep:latest", "semgrep", "scan", *args_cfg, "--json", "--metrics=off",
                   "--output", "/saida/semgrep.json", "/src"], raiz)
        cmd = f"docker run ... semgrep scan {' '.join(args_cfg)} --json /src"
    else:
        return item("SAST (semgrep)", "NÃO EXECUTADO", resumo="semgrep e Docker indisponíveis")
    if r["erro"] or not arq.exists():
        return item("SAST (semgrep)", "FALHOU", cmd, vers, r["erro"] or r["stderr"][:200], arq.name)
    dados = carregar_json(arq.read_text(encoding="utf-8")) or {}
    cont = {"ERROR": 0, "WARNING": 0, "INFO": 0}
    for res in dados.get("results", []):
        sev = (res.get("extra") or {}).get("severity", "INFO")
        cont[sev] = cont.get(sev, 0) + 1
    status = "ACHADOS" if any(cont.values()) else "OK"
    return item("SAST (semgrep)", status, cmd, vers,
                f"ERROR: {cont['ERROR']}, WARNING: {cont['WARNING']}, INFO: {cont['INFO']}", arq.name,
                {"high": cont["ERROR"], "moderate": cont["WARNING"], "low": cont["INFO"]})


# ---------------------------------------------------------------- fase C (DAST)


def requisitar(url: str, metodo: str, corpo, cabecalhos: dict):
    dados = corpo.encode("utf-8") if isinstance(corpo, str) else None
    req = urllib.request.Request(url, data=dados, method=metodo.upper(), headers=cabecalhos or {})
    try:
        with urllib.request.urlopen(req, timeout=TEMPO_LIMITE_SONDA) as resp:
            return resp.status, dict(resp.headers.items()), resp.read(200_000).decode("utf-8", "replace"), None
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers.items()), e.read(200_000).decode("utf-8", "replace"), None
    except (urllib.error.URLError, OSError) as e:
        return None, {}, "", str(e)


def rodar_sondas(base: str, arquivo: Path, saida: Path) -> tuple[list[dict], list[str]]:
    config = json.loads(arquivo.read_text(encoding="utf-8"))
    esperados = config.get("cabecalhos_esperados", {})
    cors_proibido = config.get("cors_aberto_proibido", True)
    resultados, problemas_gerais = [], []
    cabecalhos_faltando = set()
    for sonda in config.get("sondas", []):
        url = urllib.parse.urljoin(base.rstrip("/") + "/", sonda["caminho"].lstrip("/"))
        status, cab, corpo, erro = requisitar(url, sonda.get("metodo", "GET"),
                                              sonda.get("corpo"), sonda.get("cabecalhos", {}))
        falhas = []
        if erro:
            falhas.append(f"sem resposta: {erro}")
        else:
            esp = sonda.get("status_esperado")
            if esp and status not in esp:
                falhas.append(f"status {status}, esperado {esp}")
            for t in sonda.get("nao_contem", []):
                if t.lower() in corpo.lower():
                    falhas.append(f"resposta contém '{t}'")
            for t in sonda.get("contem", []):
                if t.lower() not in corpo.lower():
                    falhas.append(f"resposta não contém '{t}'")
            for padrao, rotulo in PADROES_VAZAMENTO:
                if re.search(padrao, corpo):
                    falhas.append(f"vazamento: {rotulo}")
            cab_min = {k.lower(): v for k, v in cab.items()}
            for nome, valor in esperados.items():
                atual = cab_min.get(nome.lower())
                if atual is None or (valor and valor.lower() not in atual.lower()):
                    cabecalhos_faltando.add(nome)
            if cors_proibido and cab_min.get("access-control-allow-origin") == "*":
                falhas.append("CORS aberto (Access-Control-Allow-Origin: *)")
        resultados.append({
            "nome": sonda.get("nome", sonda["caminho"]), "metodo": sonda.get("metodo", "GET"),
            "caminho": sonda["caminho"], "status": status, "falhas": falhas,
        })
    if cabecalhos_faltando:
        problemas_gerais.append("cabeçalhos ausentes/errados em ao menos uma resposta: "
                                + ", ".join(sorted(cabecalhos_faltando)))
    (saida / "dast-sondas.json").write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")
    return resultados, problemas_gerais


def rodar_zap(base: str, saida: Path, docker: bool) -> dict:
    if not docker:
        return item("DAST (OWASP ZAP baseline)", "NÃO EXECUTADO", resumo="Docker indisponível")
    alvo = re.sub(r"//(localhost|127\.0\.0\.1)", "//host.docker.internal", base)
    r = rodar(["docker", "run", "--rm", "--add-host=host.docker.internal:host-gateway",
               "-v", f"{saida}:/zap/wrk:rw", "zaproxy/zap-stable",
               "zap-baseline.py", "-t", alvo, "-J", "zap.json", "-I"], saida)
    arq = saida / "zap.json"
    cmd = f"docker run zaproxy/zap-stable zap-baseline.py -t {alvo} -J zap.json"
    if r["erro"] or not arq.exists():
        return item("DAST (OWASP ZAP baseline)", "FALHOU", cmd, "imagem zaproxy/zap-stable",
                    r["erro"] or (r["stderr"] or r["stdout"])[-300:], arq.name)
    dados = carregar_json(arq.read_text(encoding="utf-8")) or {}
    cont = {"high": 0, "moderate": 0, "low": 0}
    for site in dados.get("site", []):
        for alerta in site.get("alerts", []):
            risco = str(alerta.get("riskcode", "0"))
            chave = {"3": "high", "2": "moderate", "1": "low"}.get(risco)
            if chave:
                cont[chave] += 1
    return item("DAST (OWASP ZAP baseline)", "ACHADOS" if any(cont.values()) else "OK", cmd,
                "imagem zaproxy/zap-stable", ", ".join(f"{k}: {v}" for k, v in cont.items()), arq.name, cont)


# ---------------------------------------------------------------- relatório


def tabela_itens(itens: list[dict]) -> list[str]:
    linhas = ["| Item | Status | Comando | Versão | Resultado | Saída completa |", "|---|---|---|---|---|---|"]
    for i in itens:
        resumo = (i["resumo"] or "").replace("|", "\\|").replace("\n", " ")
        linhas.append(f"| {i['nome']} | **{i['status']}** | `{i['comando'] or '-'}` | {i['versao'] or '-'} | "
                      f"{resumo or '-'} | {i['arquivo'] or '-'} |")
    return linhas


def bloqueia(itens: list[dict]) -> bool:
    for i in itens:
        if i["status"] in ("NÃO EXECUTADO", "FALHOU"):
            return True
        c = i["contagem"]
        if c.get("critical", 0) or c.get("high", 0) or c.get("sem_severidade", 0):
            return True
    return False


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Auditoria de segurança de release (evidência executada).")
    p.add_argument("--raiz", type=Path, default=None)
    p.add_argument("--saida", type=Path, default=None, help="pasta de saída (padrão: .md/.seguranca/<data>)")
    p.add_argument("--semgrep-config", default=SEMGREP_PADRAO)
    p.add_argument("--dast", metavar="URL", default=None, help="roda só a fase C contra esta URL")
    p.add_argument("--sondas", type=Path, default=None)
    p.add_argument("--sem-zap", action="store_true")
    p.add_argument("--estrito", action="store_true")
    args = p.parse_args()

    raiz = (args.raiz or raiz_padrao()).resolve()
    hoje = dt.date.today().isoformat()
    saida = (args.saida or raiz / ".md" / ".seguranca" / hoje).resolve()
    saida.mkdir(parents=True, exist_ok=True)
    docker = docker_disponivel()

    if args.dast:
        if args.sondas is None or not args.sondas.exists():
            print("--dast exige --sondas <arquivo.json> existente (ver formato no cabeçalho do script).")
            return 2
        resultados, gerais = rodar_sondas(args.dast, args.sondas, saida)
        itens = [] if args.sem_zap else [rodar_zap(args.dast, saida, docker)]
        reprovadas = [r for r in resultados if r["falhas"]]
        linhas = [f"# Auditoria de segurança — DAST ({hoje})\n", f"Alvo: `{args.dast}` · Docker: {'sim' if docker else 'não'}\n",
                  f"## Sondas: {len(resultados)} executadas, {len(reprovadas)} reprovadas\n",
                  "| Sonda | Método | Caminho | Status | Falhas |", "|---|---|---|---|---|"]
        for r in resultados:
            falhas = "; ".join(r["falhas"]).replace("|", "\\|") or "—"
            linhas.append(f"| {r['nome']} | {r['metodo']} | `{r['caminho']}` | {r['status']} | {falhas} |")
        if gerais:
            linhas += ["", "## Problemas gerais", *[f"- {g}" for g in gerais]]
        if itens:
            linhas += ["", "## Varredura de base", *tabela_itens(itens)]
        arquivo = saida / "resumo-dast.md"
        arquivo.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        print("\n".join(linhas))
        print(f"\nResumo gravado em {arquivo.as_posix()}")
        falhou = bool(reprovadas or gerais or bloqueia(itens))
        return 1 if (args.estrito and falhou) else 0

    itens = auditoria_dependencias(raiz, saida, docker)
    itens.append(auditoria_segredos(raiz, saida, docker))
    itens.append(auditoria_sast(raiz, saida, docker, args.semgrep_config))
    linhas = [f"# Auditoria de segurança — ferramentas ({hoje})\n",
              f"Raiz: `{raiz.as_posix()}` · Docker: {'sim' if docker else 'não'} · Saídas brutas: `{saida.as_posix()}`\n",
              *tabela_itens(itens), "",
              "Status: OK = rodou sem achado · ACHADOS = confirmar cada um no arquivo bruto · "
              "NÃO EXECUTADO/FALHOU = bloqueia até rodar ou até o usuário aceitar explicitamente."]
    arquivo = saida / "resumo-ferramentas.md"
    arquivo.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print("\n".join(linhas))
    print(f"\nResumo gravado em {arquivo.as_posix()}")
    return 1 if (args.estrito and bloqueia(itens)) else 0


if __name__ == "__main__":
    sys.exit(main())
