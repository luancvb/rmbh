/**
 * Progresso compartilhado — Filiados da Grande BH
 *
 * Este script transforma uma planilha do Google no "caderno" onde a equipe
 * inteira anota quem já foi contatado. A página do GitHub lê e escreve aqui,
 * então todo mundo vê o mesmo progresso, em qualquer celular.
 *
 * COMO INSTALAR (leva uns 5 minutos, uma vez só):
 *
 *  1. Crie uma planilha nova em https://sheets.new e dê um nome a ela
 *     (por exemplo "Progresso — Filiados Grande BH").
 *  2. No menu, vá em Extensões > Apps Script.
 *  3. Apague o que estiver escrito e cole TODO o conteúdo deste arquivo.
 *  4. Salve (ícone de disquete).
 *  5. Na lista de funções, no topo, escolha "configurar" e clique em Executar.
 *     O Google vai pedir autorização: aceite (em "Avançado" > "Acessar projeto
 *     sem título", se aparecer o aviso de app não verificado).
 *  6. Clique em Implantar > Nova implantação > engrenagem > Aplicativo da Web.
 *       - Executar como: Eu
 *       - Quem pode acessar: QUALQUER PESSOA
 *     Clique em Implantar e copie o endereço que termina em /exec.
 *  7. Abra o arquivo dados/config.js do site e cole esse endereço em apiUrl.
 *     Dê commit e pronto: a página passa a sincronizar sozinha.
 *
 * SE PRECISAR MUDAR ALGO NO SCRIPT DEPOIS: edite, salve e vá em
 * Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar.
 * O endereço continua o mesmo.
 *
 * ATENÇÃO: "Qualquer pessoa" significa que quem tiver o endereço pode marcar e
 * desmarcar contatos. Ele não expõe a planilha nem sua conta, mas não publique
 * esse endereço fora da equipe.
 */

var ABA = 'Progresso';
var CABECALHO = ['Telefone', 'Nome', 'Cidade', 'Status', 'Quem marcou', 'Data/hora'];

/** Cria a aba e o cabeçalho. Rode uma vez, pelo editor. */
function configurar() {
  var aba = pegarAba();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Tudo pronto. Agora implante como aplicativo da Web.', 'Progresso', 8);
  return aba.getName();
}

function pegarAba() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(ABA);
  if (!aba) {
    aba = planilha.insertSheet(ABA);
  }
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  // telefone sempre como texto, para não virar notação científica
  aba.getRange(1, 1, aba.getMaxRows(), 1).setNumberFormat('@');
  return aba;
}

function somenteDigitos(valor) {
  return String(valor == null ? '' : valor).replace(/\D/g, '');
}

function linhasPorTelefone(aba) {
  var indice = {};
  var ultima = aba.getLastRow();
  if (ultima < 2) return indice;
  var valores = aba.getRange(2, 1, ultima - 1, 1).getDisplayValues();
  for (var i = 0; i < valores.length; i++) {
    var tel = somenteDigitos(valores[i][0]);
    if (tel) indice[tel] = i + 2;
  }
  return indice;
}

function listaEnviados() {
  var aba = pegarAba();
  var ultima = aba.getLastRow();
  if (ultima < 2) return [];
  var valores = aba.getRange(2, 1, ultima - 1, 4).getDisplayValues();
  var saida = [];
  for (var i = 0; i < valores.length; i++) {
    var tel = somenteDigitos(valores[i][0]);
    if (tel && String(valores[i][3]).toUpperCase() === 'ENVIADO') saida.push(tel);
  }
  return saida;
}

function aplicar(aba, indice, op) {
  var tel = somenteDigitos(op && op.telefone);
  if (!tel) return;

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var operador = String(op.operador || '').slice(0, 60);
  var status = op.acao === 'desmarcar' ? '' : 'ENVIADO';
  var linha = indice[tel];

  if (!linha) {
    if (status === '') return; // nada a desmarcar
    linha = aba.getLastRow() + 1;
    indice[tel] = linha;
    aba.getRange(linha, 1, 1, 6).setValues([[
      tel, String(op.nome || ''), String(op.cidade || ''), status, operador, agora
    ]]);
    aba.getRange(linha, 1).setNumberFormat('@');
    return;
  }

  aba.getRange(linha, 4, 1, 3).setValues([[status, status ? operador : '', agora]]);
  if (op.nome) aba.getRange(linha, 2).setValue(String(op.nome));
  if (op.cidade) aba.getRange(linha, 3).setValue(String(op.cidade));
}

function resposta(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    return resposta({ ok: true, enviados: listaEnviados() });
  } catch (erro) {
    return resposta({ ok: false, erro: String(erro) });
  }
}

function doPost(e) {
  var trava = LockService.getScriptLock();
  try {
    var corpo = JSON.parse(e.postData.contents);
    var ops = corpo.ops || [];
    trava.waitLock(25000);
    var aba = pegarAba();
    var indice = linhasPorTelefone(aba);
    for (var i = 0; i < ops.length; i++) aplicar(aba, indice, ops[i]);
    SpreadsheetApp.flush();
    return resposta({ ok: true, enviados: listaEnviados() });
  } catch (erro) {
    return resposta({ ok: false, erro: String(erro) });
  } finally {
    try { trava.releaseLock(); } catch (ignorado) {}
  }
}
