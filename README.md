# Filiados da Grande BH

Página de chamada por WhatsApp para os filiados da Região Metropolitana de Belo Horizonte.
Cada filiado é um botão que abre a conversa no WhatsApp já com a mensagem escrita — a
pessoa só confere e envia.

São **599 filiados de 27 cidades**, sem números repetidos, divididos em **24 blocos de até
25**. A página inicial é só o menu dos blocos; os filiados ficam dentro da página de cada
bloco (`blocos/bloco-1.html` até `blocos/bloco-24.html`), então dá para mandar um link por
pessoa da equipe.

Os blocos seguem a ordem da planilha, ou seja, cidade por cidade. Belo Horizonte ocupa os
blocos 1 a 14, Contagem entra no 14, Betim no 15 e assim por diante — na prática, quem
recebe um bloco quase sempre fala com gente de uma cidade só. A cidade aparece embaixo do
nome em cada botão, e a busca também procura por cidade.

Distribuição por cidade:

| Cidade | Filiados | | Cidade | Filiados |
|:---|---:|---|:---|---:|
| Belo Horizonte | 349 | | Igarapé | 3 |
| Contagem | 63 | | Sarzedo | 3 |
| Betim | 47 | | Florestal | 2 |
| Santa Luzia | 23 | | Itaguara | 2 |
| Ribeirão das Neves | 22 | | Mateus Leme | 2 |
| Nova Lima | 14 | | Matozinhos | 2 |
| Ibirité | 9 | | Nova União | 2 |
| Sabará | 8 | | Raposos | 2 |
| São Joaquim de Bicas | 7 | | São José da Lapa | 2 |
| Brumadinho | 6 | | Mário Campos | 1 |
| Caeté | 6 | | Rio Manso | 1 |
| Vespasiano | 6 | | | |
| Lagoa Santa | 5 | | | |
| Esmeraldas | 4 | | | |
| Juatuba | 4 | | | |
| Pedro Leopoldo | 4 | | | |

Sete cidades da planilha não têm nenhum filiado e por isso não aparecem na página: Baldim,
Capim Branco, Confins, Itatiaiuçu, Jaboticatubas, Rio Acima e Taquaraçu de Minas.

---

## Como funciona

- **Controle de envio.** Ao clicar no botão, o filiado é marcado como enviado. Também dá
  para marcar e desmarcar na mão, pelo círculo à esquerda do nome.
- **As marcações são de cada navegador.** Ficam salvas no aparelho de quem está usando e
  não são compartilhadas — o que é bom quando cada pessoa cuida de um bloco, mas significa
  que trocar de celular ou limpar o histórico do navegador zera o controle.
- **Texto editável.** No painel *Mensagem enviada* dá para mudar a mensagem a qualquer
  momento, sem mexer no código. A alteração vale só para aquele navegador; para mudar o
  texto para todo mundo, edite `MSG_PADRAO` em `assets/js/app.js`.
- **Saudação automática (opcional).** Se você escrever `{saudacao}` no texto, ali entra
  *bom dia*, *boa tarde* ou *boa noite* conforme a hora do clique. A mensagem atual não usa.
- **Mensagem atual.** Chama para o panfletaço de domingo, 20/09, na Feira Hippie em Belo
  Horizonte, às 11h, e pede confirmação de presença. Passado o dia 20, lembre de trocar o
  texto em `MSG_PADRAO` (`assets/js/app.js`).
- **Etiquetas de aviso.** Números fora do padrão brasileiro aparecem marcados como
  `conferir` (parecem incompletos) ou `exterior` (DDI de outro país). São 12 no total —
  o script `gerar-dados.py` lista todos no terminal quando roda.

## Estrutura da pasta

```
.
├── index.html                  menu: os 24 blocos, com o progresso de cada um
├── blocos/
│   ├── bloco-1.html            uma página por bloco de 25 filiados
│   └── ... até bloco-24.html
├── assets/
│   ├── css/estilo.css          toda a aparência (tema claro e escuro)
│   └── js/app.js               lógica: mensagem, links, marcação de enviados
├── dados/
│   ├── contatos.js             a base que as páginas leem
│   ├── contatos.json           a mesma base, para consulta e para os scripts
│   └── filiados-origem.xlsx    a planilha original, uma aba por cidade
├── ferramentas/
│   ├── gerar-dados.py          planilha .xlsx  ->  contatos.js + contatos.json
│   └── gerar-paginas.py        contatos.json   ->  index.html + páginas de bloco
└── README.md
```

Não há build, framework nem dependência: é HTML, CSS e JavaScript puro. Dá para abrir o
`index.html` com dois cliques direto da pasta que já funciona.

## Subir para o GitHub

**Pelo site**, sem instalar nada:

1. Em <https://github.com/new>, crie o repositório (por exemplo `filiados-grande-bh`).
   Se quiser publicar como site, ele precisa ser **Public**.
2. Na tela seguinte, clique em **uploading an existing file**.
3. Arraste para lá **o conteúdo de dentro** desta pasta (não a pasta em si), para o
   `index.html` ficar na raiz do repositório.
4. Escreva algo em *Commit changes* e confirme.

**Pelo terminal**, se preferir:

```bash
cd filiados-grande-bh
git init
git add .
git commit -m "Página de chamada — filiados da Grande BH"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/filiados-grande-bh.git
git push -u origin main
```

## Publicar o link para a equipe

**Settings → Pages → Source: Deploy from a branch → Branch: `main` / `root` → Save**. Em um
ou dois minutos o site fica em `https://SEU-USUARIO.github.io/filiados-grande-bh/`, e cada
bloco em `.../blocos/bloco-15.html` — é esse link de bloco que vai para cada pessoa.

> **Atenção:** repositório público significa que os 599 nomes e telefones ficam visíveis
> para qualquer pessoa na internet, e o GitHub Pages só funciona em repositório público na
> conta gratuita. Se preferir manter a lista fechada, deixe o repositório **Private** e
> peça para a equipe baixar a pasta (**Code → Download ZIP**) e abrir o `index.html` no
> próprio computador — funciona igual, sem depender de internet.

## Atualizar a lista

**Mudou um nome ou um número:** edite direto o `dados/contatos.js` e dê commit.

**Entrou ou saiu gente:** troque a planilha e rode os dois scripts, porque a divisão de 25
em 25 muda junto.

```bash
pip install openpyxl
python ferramentas/gerar-dados.py dados/filiados-origem.xlsx
python ferramentas/gerar-paginas.py
```

O primeiro script lê uma aba por cidade (ignora a aba *Resumo*), descarta números repetidos
e avisa quais estão fora do padrão. O segundo recria o `index.html` e as páginas de bloco.
