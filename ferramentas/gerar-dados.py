# -*- coding: utf-8 -*-
"""
Regenera a base de filiados a partir da planilha .xlsx.

A planilha tem uma aba por cidade (abas que começam com "Resumo" são ignoradas),
e cada aba tem as colunas, com cabeçalho na primeira linha:
    Nome | Telefone | Link WhatsApp

O nome da aba vira a cidade do filiado.

Como usar (a partir da pasta do projeto):

    pip install openpyxl
    python ferramentas/gerar-dados.py dados/filiados-origem.xlsx

Ele reescreve dados/contatos.json e dados/contatos.js. Depois é só dar commit nos
dois arquivos — as páginas leem o .js e se atualizam sozinhas.

Se entrar ou sair gente, rode também:
    python ferramentas/gerar-paginas.py
para recriar as páginas de bloco (a divisão de 25 em 25 muda).
"""

import json
import os
import re
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("Falta a biblioteca openpyxl. Rode: pip install openpyxl")

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJETO = os.path.dirname(AQUI)
DADOS = os.path.join(PROJETO, "dados")


def main():
    if len(sys.argv) < 2:
        sys.exit("Uso: python ferramentas/gerar-dados.py caminho/da/planilha.xlsx")

    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)

    filiados = []
    vistos = set()
    repetidos = 0
    sem_ninguem = []

    for ws in wb.worksheets:
        cidade = ws.title.strip()
        if cidade.lower().startswith("resumo"):
            continue

        antes = len(filiados)
        for linha in ws.iter_rows(min_row=2, values_only=True):
            if not linha or len(linha) < 2 or linha[1] is None:
                continue
            nome = str(linha[0]).strip().title() if linha[0] else "Sem nome"
            fone = re.sub(r"\D", "", str(linha[1]))
            if not fone:
                continue
            if fone in vistos:
                repetidos += 1
                continue
            vistos.add(fone)
            filiados.append({"n": nome, "p": fone, "c": cidade})

        if len(filiados) == antes:
            sem_ninguem.append(cidade)

    os.makedirs(DADOS, exist_ok=True)

    with open(os.path.join(DADOS, "contatos.json"), "w", encoding="utf-8") as f:
        json.dump(filiados, f, ensure_ascii=False, indent=1)

    linhas = ",\n  ".join(
        json.dumps(c, ensure_ascii=False, separators=(",", ":")) for c in filiados
    )
    with open(os.path.join(DADOS, "contatos.js"), "w", encoding="utf-8") as f:
        f.write(
            "/* Base de filiados — gerada por ferramentas/gerar-dados.py\n"
            "   n = nome, p = telefone com DDI (só dígitos), c = cidade.\n"
            "   Para alterar a lista, edite este arquivo ou rode o script novamente. */\n"
            "window.CONTATOS = [\n  " + linhas + "\n];\n"
        )

    cidades = sorted(set(c["c"] for c in filiados))
    suspeitos = [c for c in filiados if not (c["p"].startswith("55") and len(c["p"]) == 13)]

    print("%d filiados de %d cidades (%d repetidos descartados)."
          % (len(filiados), len(cidades), repetidos))
    if sem_ninguem:
        print("Cidades sem nenhum filiado: " + ", ".join(sem_ninguem))
    if suspeitos:
        print("Confira estes números, estão fora do padrão brasileiro:")
        for c in suspeitos:
            print("   %-12s %-22s +%s" % (c["n"], c["c"], c["p"]))


if __name__ == "__main__":
    main()
