/* Filiados da Grande BH — lógica da página
 *
 * Depende de:
 *   window.CONTATOS  -> definido em dados/contatos.js
 *   window.PAGINA    -> definido em cada página:
 *                       { modo: "indice"|"lista"|"spa", bloco: null|1..N, raiz: "./"|"../" }
 *                       "indice" -> só os cartões dos blocos (a página inicial do site).
 *                       "lista"  -> os filiados; bloco = null mostra todos, 1..N só aquele.
 *                       "spa"    -> página única: começa nos cartões e, ao clicar em um
 *                                   bloco, mostra só aquele bloco (navegação por #bloco-N).
 *
 * Nada aqui usa fetch, então as páginas funcionam abertas direto do arquivo
 * (clique duplo no index.html) e também publicadas no GitHub Pages.
 */
(function () {
  "use strict";

  var CONTATOS = window.CONTATOS || [];
  var CFG = window.PAGINA || { modo: "lista", bloco: null, raiz: "./" };
  var TAM_BLOCO = 25;
  var K_FEITOS = "mrt.enviados.v1";
  var K_MSG = "mrt.mensagem.v1";
  var K_FILA = "mrt.fila.v1";
  var K_OPERADOR = "mrt.operador.v1";

  /* Endereço da planilha do Google que guarda o progresso de todo mundo.
     Vazio = cada pessoa vê só o próprio progresso. Veja dados/config.js. */
  var API = (window.CONFIG && window.CONFIG.apiUrl) || "";
  var INTERVALO_SYNC = 20000;

  /* Data que a contagem regressiva mira. Para mudar, troque só esta linha. */
  var DATA_ALVO = "2026-10-03";

  var MSG_PADRAO =
    "Opa. Tudo certo? Você já está fazendo campanha para os nossos candidatos? " +
    "Agora é a hora da guerra, precisamos de todos os filiados de Minas!\n\n" +
    "{contagem} Agora é reta final!\n\n" +
    "Neste domingo tem panfletaço do Renan em Belo Horizonte!\n\n" +
    "📍 Feira Hippie – Av. Afonso Pena, 705, Centro\n" +
    "🗓️ Domingo, 20 de setembro\n" +
    "⏰ 11h\n\n" +
    "Você consegue ir? Confirme sua presença:\n" +
    "https://forms.gle/rp3hgNbaAYwFcPAz5";

  var TOTAL = CONTATOS.length;
  var N_BLOCOS = Math.ceil(TOTAL / TAM_BLOCO);
  var EH_SPA = CFG.modo === "spa";

  /* ---------- armazenamento tolerante a falha ---------- */
  function ler(chave, alt) {
    try {
      var v = localStorage.getItem(chave);
      return v === null ? alt : JSON.parse(v);
    } catch (e) {
      return alt;
    }
  }
  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) {}
  }

  var feitos = {};
  (function () {
    var guardados = ler(K_FEITOS, []);
    if (Array.isArray(guardados)) {
      for (var i = 0; i < guardados.length; i++) feitos[guardados[i]] = 1;
    }
  })();
  function salvarFeitos() {
    gravar(K_FEITOS, Object.keys(feitos));
  }

  /* ---------- progresso compartilhado (planilha do Google) ---------- */
  var elSync, elOperador;

  function temApi() {
    return !!API;
  }
  function operador() {
    return (ler(K_OPERADOR, "") || "").toString().slice(0, 60);
  }
  function fila() {
    var f = ler(K_FILA, []);
    return Array.isArray(f) ? f : [];
  }
  function status(estado, detalhe) {
    if (!elSync) return;
    elSync.className = "sync sync-" + estado;
    elSync.textContent =
      estado === "off" ? "só neste aparelho"
      : estado === "ok" ? "progresso compartilhado" + (detalhe ? " · " + detalhe : "")
      : estado === "enviando" ? "salvando…"
      : "sem conexão — tentando de novo";
  }
  function agoraHM() {
    var d = new Date();
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function assinatura(obj) {
    return Object.keys(obj).sort().join(",");
  }

  function aplicarServidor(enviados) {
    var novo = {};
    for (var i = 0; i < enviados.length; i++) novo[String(enviados[i])] = 1;
    var pendentes = fila();
    for (var j = 0; j < pendentes.length; j++) {
      if (pendentes[j].acao === "desmarcar") delete novo[pendentes[j].telefone];
      else novo[pendentes[j].telefone] = 1;
    }
    if (assinatura(novo) === assinatura(feitos)) return false;
    feitos = novo;
    salvarFeitos();
    return true;
  }

  function puxar() {
    if (!temApi()) return;
    fetch(API + "?acao=lista&t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.enviados) throw new Error("resposta inválida");
        var mudou = aplicarServidor(d.enviados);
        status("ok", agoraHM());
        if (mudou) render();
      })
      .catch(function () { status("erro"); });
  }

  function enviarFila() {
    if (!temApi()) return;
    var pendentes = fila();
    if (!pendentes.length) return;
    status("enviando");
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ops: pendentes })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error("falhou");
        gravar(K_FILA, []);
        var mudou = aplicarServidor(d.enviados || []);
        status("ok", agoraHM());
        if (mudou) render();
      })
      .catch(function () { status("erro"); });
  }

  function anotar(contato, acao) {
    if (!temApi()) return;
    var pendentes = fila();
    pendentes.push({
      acao: acao,
      telefone: contato.p,
      nome: contato.n,
      cidade: contato.c || "",
      operador: operador()
    });
    gravar(K_FILA, pendentes);
    enviarFila();
  }

  function acharContato(telefone) {
    for (var i = 0; i < TOTAL; i++) if (CONTATOS[i].p === telefone) return CONTATOS[i];
    return { p: telefone, n: "", c: "" };
  }

  /* ---------- qual bloco está aberto ---------- */
  function blocoDoHash() {
    var m = /^#bloco-(\d+)$/.exec(window.location.hash || "");
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return n >= 1 && n <= N_BLOCOS ? n : null;
  }
  function blocoAtual() {
    return EH_SPA ? blocoDoHash() : CFG.bloco || null;
  }
  function mostrandoIndice() {
    return CFG.modo === "indice" || (EH_SPA && blocoAtual() === null);
  }
  function faixaDoBloco(b) {
    var ini = b * TAM_BLOCO;
    return { ini: ini, lote: CONTATOS.slice(ini, ini + TAM_BLOCO) };
  }
  function enderecoDoBloco(n) {
    return EH_SPA ? "#bloco-" + n : CFG.raiz + "blocos/bloco-" + n + ".html";
  }

  /* ---------- mensagem ---------- */
  var txtMsg = document.getElementById("txt-msg");
  if (txtMsg) txtMsg.value = ler(K_MSG, MSG_PADRAO) || MSG_PADRAO;

  function saudacao() {
    var h = new Date().getHours();
    if (h < 12) return "bom dia";
    if (h < 18) return "boa tarde";
    return "boa noite";
  }
  function diasRestantes() {
    var p = DATA_ALVO.split("-");
    var alvo = new Date(+p[0], +p[1] - 1, +p[2]);
    var agora = new Date();
    var hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    return Math.round((alvo - hoje) / 86400000);
  }
  function contagem() {
    var d = diasRestantes();
    if (d > 1) return "Faltam só " + d + " dias para a eleição.";
    if (d === 1) return "Falta só 1 dia para a eleição.";
    if (d === 0) return "A eleição é hoje!";
    return "A eleição já passou.";
  }
  function textoFinal() {
    var base = txtMsg ? txtMsg.value : MSG_PADRAO;
    return base
      .replace(/\{saudacao\}/g, saudacao())
      .replace(/\{contagem\}/g, contagem())
      .replace(/\{dias\}/g, String(Math.max(0, diasRestantes())));
  }
  function link(fone) {
    return "https://wa.me/" + fone + "?text=" + encodeURIComponent(textoFinal());
  }

  /* ---------- números ---------- */
  function aviso(fone) {
    if (fone.indexOf("55") === 0) return fone.length === 13 ? "" : "conferir";
    return "exterior";
  }
  function formatar(fone) {
    if (fone.indexOf("55") === 0 && fone.length === 13) {
      return "+55 " + fone.slice(2, 4) + " " + fone.slice(4, 9) + "-" + fone.slice(9);
    }
    return "+" + fone;
  }
  function escapar(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- ícones ---------- */
  var SVG_CHECK = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"></path></svg>';
  var SVG_CHECK_MINI = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"></path></svg>';
  var SVG_CIRC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle></svg>';
  var SVG_ZAP = '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.9.53 3.68 1.45 5.2L2 22l5.1-1.6a9.8 9.8 0 004.94 1.33h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.48 2 12.04 2zm5.72 13.9c-.24.68-1.4 1.3-1.94 1.34-.5.05-.95.23-3.2-.67-2.7-1.06-4.4-3.8-4.53-3.98-.13-.18-1.08-1.43-1.08-2.73s.68-1.94.92-2.2a.97.97 0 01.7-.33h.5c.16 0 .38-.06.59.45.24.57.8 1.98.87 2.12.07.14.12.3.02.48-.1.18-.15.3-.29.46-.14.16-.3.36-.43.48-.14.14-.29.3-.13.58.16.28.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.17-.2.7-.81.88-1.09.18-.28.36-.23.61-.14.25.09 1.6.75 1.87.89.28.14.46.21.53.32.07.12.07.66-.17 1.34z"></path></svg>';
  var SVG_SETA = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>';

  /* ---------- estado de tela ---------- */
  var filtro = "todos";
  var termo = "";
  var alvo = document.getElementById("blocos");
  var vazio = document.getElementById("vazio");

  /* ---------- menu: só os cartões dos blocos ---------- */
  function renderIndice() {
    var grade = document.createElement("div");
    grade.className = "cartoes";

    for (var b = 0; b < N_BLOCOS; b++) {
      var f = faixaDoBloco(b);
      var lote = f.lote;
      var n = 0;
      for (var i = 0; i < lote.length; i++) if (feitos[lote[i].p]) n++;
      var pct = Math.round((n / lote.length) * 100);
      var completo = n === lote.length;

      var a = document.createElement("a");
      a.className = "cartao" + (completo ? " cartao-completo" : "");
      a.href = enderecoDoBloco(b + 1);
      a.innerHTML =
        '<span class="cartao-faixa">filiados ' + (f.ini + 1) + "&ndash;" + (f.ini + lote.length) + "</span>" +
        '<span class="cartao-n">Bloco ' + (b + 1) + "</span>" +
        '<span class="barra"><i style="width:' + pct + '%"></i></span>' +
        '<span class="cartao-prog">' +
          (completo ? SVG_CHECK_MINI + " bloco conclu&iacute;do" : n + " de " + lote.length + " enviados") +
        "</span>" +
        '<span class="cartao-cta">Abrir Bloco ' + (b + 1) + SVG_SETA + "</span>";
      grade.appendChild(a);
    }

    alvo.innerHTML = "";
    alvo.appendChild(grade);
    if (vazio) vazio.hidden = true;
  }

  /* ---------- lista de filiados ---------- */
  function renderLista() {
    var atual = blocoAtual();
    var primeiro = atual ? atual - 1 : 0;
    var ultimo = atual ? atual - 1 : N_BLOCOS - 1;
    var frag = document.createDocumentFragment();
    var visiveis = 0;
    var t = termo.trim().toLowerCase();
    var digitos = t.replace(/\D/g, "");

    for (var b = primeiro; b <= ultimo; b++) {
      var f = faixaDoBloco(b);
      var lote = f.lote;
      var feitosBloco = 0;
      var itens = [];

      for (var i = 0; i < lote.length; i++) {
        var c = lote[i];
        var ok = !!feitos[c.p];
        if (ok) feitosBloco++;
        if (filtro === "pendentes" && ok) continue;
        if (filtro === "enviados" && !ok) continue;
        if (t) {
          var casaNome = c.n.toLowerCase().indexOf(t) !== -1;
          var casaCidade = c.c && c.c.toLowerCase().indexOf(t) !== -1;
          var casaFone = digitos && c.p.indexOf(digitos) !== -1;
          if (!casaNome && !casaCidade && !casaFone) continue;
        }
        itens.push({ c: c, ok: ok, idx: f.ini + i + 1 });
      }

      if (!itens.length) continue;
      visiveis += itens.length;

      var sec = document.createElement("section");
      sec.className = "bloco" + (feitosBloco === lote.length ? " bloco-completo" : "");

      var pct = Math.round((feitosBloco / lote.length) * 100);
      var cab = document.createElement("div");
      cab.className = "bloco-cab";
      cab.innerHTML =
        '<span class="bloco-n">Bloco ' + (b + 1) + "</span>" +
        '<span class="bloco-faixa">filiados ' + (f.ini + 1) + "&ndash;" + (f.ini + lote.length) + "</span>" +
        '<span class="bloco-prog"><span class="barra"><i style="width:' + pct + '%"></i></span>' +
        feitosBloco + " de " + lote.length + " enviados</span>" +
        (atual || CFG.paginasDeBloco === false
          ? ""
          : '<a class="btn-bloco" href="' + enderecoDoBloco(b + 1) + '">' +
            "Abrir Bloco " + (b + 1) + SVG_SETA + "</a>");
      sec.appendChild(cab);

      var grade = document.createElement("div");
      grade.className = "grade";
      for (var j = 0; j < itens.length; j++) {
        var it = itens[j];
        var av = aviso(it.c.p);
        var nome = escapar(it.c.n);
        var cidade = it.c.c ? escapar(it.c.c) : "";
        var fone = formatar(it.c.p);
        var div = document.createElement("div");
        div.className = "item" + (it.ok ? " feito" : "");
        div.innerHTML =
          '<button class="marcar" type="button" data-fone="' + it.c.p + '" aria-pressed="' + it.ok + '" ' +
            'title="' + (it.ok ? "Desmarcar" : "Marcar como enviado") + '" ' +
            'aria-label="' + (it.ok ? "Desmarcar" : "Marcar como enviado") + " " + nome + '">' +
            (it.ok ? SVG_CHECK : SVG_CIRC) + "</button>" +
          '<a class="abrir" href="' + link(it.c.p) + '" target="_blank" rel="noopener" ' +
            'data-fone="' + it.c.p + '" title="' + nome + (cidade ? " · " + cidade : "") + " · " + fone + '">' +
            '<span class="idx">' + it.idx + "</span>" +
            '<span class="quem"><span class="nome">' + nome + "</span>" +
              (cidade ? '<span class="cidade">' + cidade + "</span>" : "") + "</span>" +
            (av ? '<span class="alerta">' + av + "</span>" : "") +
            '<span class="zap">' + SVG_ZAP + "</span>" +
          "</a>";
        grade.appendChild(div);
      }
      sec.appendChild(grade);
      frag.appendChild(sec);
    }

    alvo.innerHTML = "";
    alvo.appendChild(frag);
    if (vazio) vazio.hidden = visiveis > 0;
  }

  function render() {
    if (!alvo) return;
    if (mostrandoIndice()) renderIndice();
    else renderLista();
    atualizarCromo();
    atualizarTopo();
  }

  /* ---------- cabeçalho, navegação e filtros (só na página única) ---------- */
  function atualizarCromo() {
    if (!EH_SPA) return;
    var atual = blocoAtual();
    var nav = document.getElementById("nav-topo");
    var filtros = document.getElementById("filtros");
    var titulo = document.getElementById("titulo");
    var sub = document.getElementById("sub");
    var ebA = document.getElementById("eyebrow-total");
    var ebB = document.getElementById("eyebrow-blocos");
    var zerar = document.getElementById("btn-zerar");

    if (atual) {
      var f = faixaDoBloco(atual - 1);
      var fim = f.ini + f.lote.length;
      if (titulo) titulo.textContent = "Bloco " + atual;
      if (sub) {
        sub.textContent = f.lote.length + " filiados. Cada botão abre a conversa no WhatsApp já " +
          "com a mensagem escrita e marca o filiado como enviado.";
      }
      if (ebA) ebA.textContent = "Bloco " + atual + " de " + N_BLOCOS;
      if (ebB) ebB.textContent = "filiados " + (f.ini + 1) + "–" + fim;
      if (zerar) zerar.textContent = "Zerar este bloco";
      if (filtros) filtros.hidden = false;
      if (nav) {
        nav.hidden = false;
        var ant = document.getElementById("nav-ant");
        var prox = document.getElementById("nav-prox");
        if (ant) {
          ant.hidden = atual <= 1;
          ant.href = "#bloco-" + (atual - 1);
          ant.textContent = "Bloco " + (atual - 1);
        }
        if (prox) {
          prox.hidden = atual >= N_BLOCOS;
          prox.href = "#bloco-" + (atual + 1);
          prox.textContent = "Bloco " + (atual + 1);
        }
      }
    } else {
      if (titulo) titulo.textContent = "Filiados da Grande BH";
      if (sub) {
        sub.textContent = "Escolha um bloco para abrir a lista de filiados dele. Dentro do bloco, " +
          "cada botão abre a conversa no WhatsApp já com a mensagem escrita.";
      }
      if (ebA) ebA.textContent = TOTAL + " filiados";
      if (ebB) ebB.textContent = N_BLOCOS + " blocos de até " + TAM_BLOCO;
      if (zerar) zerar.textContent = "Zerar marcações";
      if (filtros) filtros.hidden = true;
      if (nav) nav.hidden = true;
    }
  }

  function atualizarTopo() {
    var atual = blocoAtual();
    var lista = atual ? faixaDoBloco(atual - 1).lote : CONTATOS;
    var n = 0;
    for (var i = 0; i < lista.length; i++) if (feitos[lista[i].p]) n++;
    var pct = lista.length ? Math.round((n / lista.length) * 100) : 0;

    var el;
    if ((el = document.getElementById("m-feitos"))) el.textContent = n;
    if ((el = document.getElementById("m-faltam"))) el.textContent = lista.length - n;
    if ((el = document.getElementById("barra-geral"))) el.style.width = pct + "%";
    if ((el = document.getElementById("legenda-geral")))
      el.textContent = pct + "% " + (atual ? "do bloco" : "da lista") + " · " + n + " de " + lista.length;
    if ((el = document.getElementById("tag-saudacao"))) {
      var texto = txtMsg ? txtMsg.value : "";
      var usaContagem = texto.indexOf("{contagem}") !== -1 || texto.indexOf("{dias}") !== -1;
      var usaSaudacao = texto.indexOf("{saudacao}") !== -1;
      el.hidden = !(usaContagem || usaSaudacao);
      if (usaContagem) {
        var d = diasRestantes();
        el.textContent = d > 1 ? "faltam " + d + " dias"
          : d === 1 ? "falta 1 dia"
          : d === 0 ? "é hoje" : "já passou";
      } else {
        el.textContent = saudacao();
      }
    }
  }

  /* ---------- interações ---------- */
  if (alvo) {
    // a saudação é recalculada no instante do clique
    alvo.addEventListener("pointerdown", function (e) {
      var a = e.target.closest ? e.target.closest("a.abrir") : null;
      if (a) a.href = link(a.getAttribute("data-fone"));
    });

    alvo.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button.marcar") : null;
      if (btn) {
        var f = btn.getAttribute("data-fone");
        var marcando = !feitos[f];
        if (marcando) feitos[f] = 1;
        else delete feitos[f];
        salvarFeitos();
        anotar(acharContato(f), marcando ? "marcar" : "desmarcar");
        render();
        return;
      }
      var a = e.target.closest ? e.target.closest("a.abrir") : null;
      if (a) {
        var fone = a.getAttribute("data-fone");
        a.href = link(fone);
        if (!feitos[fone]) {
          feitos[fone] = 1;
          salvarFeitos();
          anotar(acharContato(fone), "marcar");
          setTimeout(render, 60);
        }
      }
    });
  }

  if (EH_SPA) {
    window.addEventListener("hashchange", function () {
      termo = "";
      filtro = "todos";
      var b = document.getElementById("busca");
      if (b) b.value = "";
      Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (o) {
        o.setAttribute("aria-pressed", String(o.getAttribute("data-filtro") === "todos"));
      });
      render();
      window.scrollTo(0, 0);
    });
  }

  var chips = document.querySelectorAll(".chip");
  Array.prototype.forEach.call(chips, function (ch) {
    ch.addEventListener("click", function () {
      filtro = ch.getAttribute("data-filtro");
      Array.prototype.forEach.call(chips, function (o) {
        o.setAttribute("aria-pressed", String(o === ch));
      });
      render();
    });
  });

  var busca = document.getElementById("busca");
  if (busca) {
    var tBusca;
    busca.addEventListener("input", function (e) {
      termo = e.target.value;
      clearTimeout(tBusca);
      tBusca = setTimeout(render, 120);
    });
  }

  var btnZerar = document.getElementById("btn-zerar");
  if (btnZerar) {
    btnZerar.addEventListener("click", function () {
      var atual = blocoAtual();
      var lista = atual ? faixaDoBloco(atual - 1).lote : CONTATOS;
      var mudou = false;
      for (var i = 0; i < lista.length; i++) {
        if (feitos[lista[i].p]) {
          delete feitos[lista[i].p];
          anotar(lista[i], "desmarcar");
          mudou = true;
        }
      }
      if (!mudou) return;
      salvarFeitos();
      render();
    });
  }

  if (txtMsg) {
    txtMsg.addEventListener("input", function () {
      gravar(K_MSG, txtMsg.value);
      atualizarTopo();
      Array.prototype.forEach.call(document.querySelectorAll("a.abrir"), function (a) {
        a.href = link(a.getAttribute("data-fone"));
      });
    });
  }

  var btnRestaurar = document.getElementById("btn-restaurar");
  if (btnRestaurar && txtMsg) {
    btnRestaurar.addEventListener("click", function () {
      txtMsg.value = MSG_PADRAO;
      gravar(K_MSG, MSG_PADRAO);
      render();
    });
  }

  /* ---------- textos fixos do cabeçalho (páginas do site) ---------- */
  if (!EH_SPA) {
    var elTotal = document.getElementById("eyebrow-total");
    if (elTotal) elTotal.textContent = TOTAL + " filiados";
    var elBlocos = document.getElementById("eyebrow-blocos");
    if (elBlocos) elBlocos.textContent = N_BLOCOS + " blocos de até " + TAM_BLOCO;
  }

  /* ---------- sincronização ---------- */
  elSync = document.getElementById("sync");
  elOperador = document.getElementById("operador");
  var barraSync = document.getElementById("sincronia");

  if (elOperador) {
    elOperador.value = operador();
    elOperador.addEventListener("input", function () {
      gravar(K_OPERADOR, elOperador.value.slice(0, 60));
    });
  }

  if (temApi()) {
    status("ok", "");
    enviarFila();
    puxar();
    setInterval(function () {
      if (document.hidden) return;
      enviarFila();
      puxar();
    }, INTERVALO_SYNC);
  } else {
    status("off");
    if (barraSync && elOperador) elOperador.parentNode.hidden = true;
  }

  setInterval(atualizarTopo, 60000);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    atualizarTopo();
    if (temApi()) { enviarFila(); puxar(); }
  });

  render();
})();
