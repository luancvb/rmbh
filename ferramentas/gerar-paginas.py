# -*- coding: utf-8 -*-
"""
Recria o index.html e as páginas de blocos/ a partir de dados/contatos.json.

Só é preciso rodar quando a quantidade de filiados muda (a divisão de 25 em 25
muda junto). Se você só corrigiu um nome ou um número, basta editar
dados/contatos.js e dar commit.

    python ferramentas/gerar-paginas.py
"""

import json
import math
import os

TAM_BLOCO = 25

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJETO = os.path.dirname(AQUI)

CABECA = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{descricao}">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2226%22 font-size=%2226%22>&#128227;</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Public+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="{raiz}assets/css/estilo.css">
</head>
<body>
<div class="wrap">
'''

PAINEL = '''    <section class="painel" aria-label="Progresso">
      <div class="painel-topo">
        <div class="metrica"><span class="n verde" id="m-feitos">0</span><span class="rot">Enviados</span></div>
        <div class="metrica"><span class="n" id="m-faltam">0</span><span class="rot">Faltam</span></div>
        <div class="barra-geral">
          <div class="barra"><i id="barra-geral" style="width:0%"></i></div>
          <div class="barra-legenda" id="legenda-geral"></div>
        </div>
      </div>
      <div class="controles">
{controles}        <button class="btn-txt" id="btn-zerar" type="button">{rotulo_zerar}</button>
      </div>
      <div class="sincronia" id="sincronia">
        <span class="sync" id="sync">&nbsp;</span>
        <label class="operador">Quem est&aacute; usando
          <input id="operador" type="text" placeholder="seu nome" autocomplete="name" maxlength="60">
        </label>
      </div>
    </section>

    <details class="msg" id="painel-msg">
      <summary>
        Mensagem enviada
        <span class="tag" id="tag-saudacao" hidden>boa noite</span>
        <svg class="seta" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>
      </summary>
      <div class="msg-corpo">
        <textarea id="txt-msg" spellcheck="false" aria-label="Texto da mensagem"></textarea>
        <p class="msg-nota"><code>{{contagem}}</code> vira a frase da contagem regressiva
          (&ldquo;Faltam s&oacute; 16 dias para a elei&ccedil;&atilde;o.&rdquo;), calculada at&eacute; 03/10 na hora do clique;
          <code>{{dias}}</code> traz s&oacute; o n&uacute;mero e <code>{{saudacao}}</code> vira
          <strong>bom dia</strong>, <strong>boa tarde</strong> ou <strong>boa noite</strong> conforme o hor&aacute;rio.</p>
        <div class="msg-acoes">
          <button class="btn-txt" id="btn-restaurar" type="button">Restaurar texto original</button>
        </div>
      </div>
    </details>
'''

CONTROLES = '''        <div class="chips" role="group" aria-label="Filtrar filiados">
          <button class="chip" id="f-todos" data-filtro="todos" aria-pressed="true" type="button">Todos</button>
          <button class="chip" id="f-pendentes" data-filtro="pendentes" aria-pressed="false" type="button">Pendentes</button>
          <button class="chip" id="f-enviados" data-filtro="enviados" aria-pressed="false" type="button">Enviados</button>
        </div>
        <label class="busca">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          <input id="busca" type="search" placeholder="Buscar nome, cidade ou n&uacute;mero" autocomplete="off">
        </label>
'''

FIM = '''  <main class="blocos" id="blocos"></main>
  <div class="vazio" id="vazio" hidden>Nenhum filiado com esse filtro.</div>

  <footer>{rodape}</footer>
</div>

<script>window.PAGINA = {{ modo: "{modo}", bloco: {bloco}, raiz: "{raiz}" }};</script>
<script src="{raiz}dados/config.js"></script>
<script src="{raiz}dados/contatos.js"></script>
<script src="{raiz}assets/js/app.js"></script>
</body>
</html>
'''


def main():
    caminho = os.path.join(PROJETO, "dados", "contatos.json")
    with open(caminho, encoding="utf-8") as f:
        contatos = json.load(f)

    total = len(contatos)
    n_cidades = len(set(c.get("c", "") for c in contatos if c.get("c")))
    n_blocos = int(math.ceil(total / float(TAM_BLOCO)))
    os.makedirs(os.path.join(PROJETO, "blocos"), exist_ok=True)

    # ---------------- index ----------------
    pag = CABECA.format(
        titulo="Filiados da Grande BH",
        descricao="Chamada por WhatsApp para os filiados da Regi&atilde;o Metropolitana de BH, em blocos de 25.",
        raiz="./",
    )
    pag += '''  <header class="topo">
    <div class="eyebrow">
      <span class="dot"></span> Regi&atilde;o Metropolitana de BH
      <span>/</span><span id="eyebrow-total"></span>
      <span>/</span><span id="eyebrow-blocos"></span>
    </div>
    <h1>Filiados da Grande BH</h1>
    <p class="sub">Escolha um bloco para abrir a lista de filiados dele. Dentro do bloco, cada bot&atilde;o abre
      a conversa no WhatsApp j&aacute; com a mensagem escrita. Mande o link de um bloco para cada pessoa da equipe.</p>

'''
    pag += PAINEL.format(controles="", rotulo_zerar="Zerar marca&ccedil;&otilde;es") + "  </header>\n\n"
    pag += FIM.format(
        rodape="%d filiados de %d cidades, sem repeti&ccedil;&otilde;es, divididos em %d blocos de at&eacute; %d. "
               "O estado da sincroniza&ccedil;&atilde;o aparece na faixa embaixo do painel."
               % (total, n_cidades, n_blocos, TAM_BLOCO),
        modo="indice",
        bloco="null",
        raiz="./",
    )
    with open(os.path.join(PROJETO, "index.html"), "w", encoding="utf-8") as f:
        f.write(pag)

    # ---------------- blocos ----------------
    seta_esq = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                '<path d="M15 5l-7 7 7 7"></path></svg>')

    for b in range(n_blocos):
        ini = b * TAM_BLOCO
        lote = contatos[ini:ini + TAM_BLOCO]
        fim = ini + len(lote)
        num = b + 1

        nav = ['<a class="voltar" href="../index.html">%sTodos os blocos</a>' % seta_esq,
               '<span class="espaco"></span>']
        if num > 1:
            nav.append('<a class="voltar" href="bloco-%d.html">Bloco %d</a>' % (num - 1, num - 1))
        if num < n_blocos:
            nav.append('<a class="voltar" href="bloco-%d.html">Bloco %d</a>' % (num + 1, num + 1))

        pag = CABECA.format(
            titulo="Bloco %d &middot; Filiados da Grande BH" % num,
            descricao="Filiados %d a %d da lista da Grande BH." % (ini + 1, fim),
            raiz="../",
        )
        pag += "  <div class=\"nav-topo\">\n    " + "\n    ".join(nav) + "\n  </div>\n\n"
        pag += '''  <header class="topo">
    <div class="eyebrow">
      <span class="dot"></span> Regi&atilde;o Metropolitana de BH
      <span>/</span><span>Bloco %d de %d</span>
      <span>/</span><span>filiados %d&ndash;%d</span>
    </div>
    <h1>Bloco %d</h1>
    <p class="sub">%d filiados. Cada bot&atilde;o abre a conversa no WhatsApp j&aacute; com a mensagem escrita e marca
      o filiado como enviado.</p>

''' % (num, n_blocos, ini + 1, fim, num, len(lote))
        pag += PAINEL.format(controles=CONTROLES, rotulo_zerar="Zerar este bloco") + "  </header>\n\n"
        pag += FIM.format(
            rodape="Bloco %d de %d &middot; filiados %d a %d de %d. "
                   "O estado da sincroniza&ccedil;&atilde;o aparece na faixa embaixo do painel."
                   % (num, n_blocos, ini + 1, fim, total),
            modo="lista",
            bloco=str(num),
            raiz="../",
        )
        with open(os.path.join(PROJETO, "blocos", "bloco-%d.html" % num), "w", encoding="utf-8") as f:
            f.write(pag)

    print("index.html + %d páginas de bloco gerados (%d filiados)." % (n_blocos, total))


if __name__ == "__main__":
    main()
