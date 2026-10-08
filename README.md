# TAG Som e Luz

Landing page da **TAG Som e Luz** — locação de som, iluminação, painel de LED e vídeo para eventos em São Carlos e região.

Site publicado via **GitHub Pages**: <https://vitorgianeis.github.io/tagsomeluz/>

## Estrutura

```
.
├── index.html        # página única (one page) — visual atual
├── index1.html       # BACKUP do site original (visual antigo)
├── css/
│   ├── site.css      # estilos e responsividade do site atual
│   └── style.css     # estilos do site original (só o index1.html usa)
├── js/
│   ├── site.js       # menu, acordeão dos serviços, slider, contagem da feira
│   └── script.js     # idem, versão original (só o index1.html usa)
├── assets/
│   ├── img/          # fotos do portfólio, equipamentos e o logo
│   ├── poster/       # capa de cada vídeo do LED (12 arquivos)
│   ├── qr/           # qr-whatsapp.svg (usado na página) e qr-site.svg (impresso)
│   └── video/        # painel de LED (12 mp4)
├── robots.txt
├── sitemap.xml       # precisa ficar na raiz do domínio
├── package.json      # só verificação (npm test) — o site não tem build
└── tools/            # as 4 rotinas de checagem
```

`index.html`, `robots.txt` e `sitemap.xml` ficam na raiz de propósito: o
GitHub Pages serve da raiz e o `robots.txt`/`sitemap.xml` só são lidos lá.

## Voltar ao site original

O visual antigo está preservado **sem nenhuma alteração**. Para usá-lo de
novo, é só renomear dois arquivos (o que estiver `index.html` sai do caminho):

```bash
mv index.html index-novo.html
mv index1.html index.html
```

Os arquivos dele (`css/style.css` e `js/script.js`) continuam intactos, então
o visual antigo volta a funcionar sem mais nada. Para voltar pro atual, é o
caminho inverso.

## Como rodar localmente

Não precisa de build. Basta servir a pasta:

```bash
python3 -m http.server 8000
```

Depois abra <http://localhost:8000>.

## Como publicar

1. Ative em **Settings → Pages**:
   - *Source*: `Deploy from a branch`
   - *Branch*: `main` / `(root)`
2. Toda alteração enviada para `main` atualiza o site automaticamente.

> Os caminhos são relativos (`css/site.css`, `assets/...`), então a página
> funciona tanto na raiz do domínio quanto em `/tagsomeluz/`.

## Onde editar o conteúdo

| O quê | Onde |
| --- | --- |
| Textos e seções | `index.html` |
| Cores da marca | `css/site.css` → bloco `:root` (`--roxo`, `--fundo`, etc.) |
| Número do WhatsApp | `index.html` e `js/site.js` → `5516981719596` |
| Fotos do portfólio | `assets/img/*.jpg` (mantenha o nome do arquivo) |
| Vídeos do painel de LED | `assets/video/video1..12.mp4` |
| Capa dos vídeos | `assets/poster/*.jpg` (uma por vídeo) |
| Fotos de cada serviço | `index.html` → painel do serviço → troque o `src` da imagem |
| Texto dos tipos de equipamento | `index.html` → `<ul class="lista">` do painel correspondente |
| Imagem do hero | `css/site.css` → `.slide-1` (+ `<link rel="preload">` no `<head>`) |
| Data/hora da feira | `index.html` → `id="countdown"` → `data-deadline` |

> As capas dos vídeos saem dos próprios `.mp4` com ffmpeg:
> `ffmpeg -ss <segundos> -i assets/video/video1.mp4 -frames:v 1 -vf scale=640:-2 -q:v 4 assets/poster/video1.jpg`

## Dados do cliente

Todos os campos que dependiam do cliente já foram preenchidos e conferidos
no HTML: razão social, CNPJ, número do endereço e CEP.

Se algum dado voltar a ficar pendente, marque com
`<span class="tbd">TEXTO</span>` — o `validate.js` avisa na seção
`PENDÊNCIAS` e o `test:runtime` reprova enquanto houver pendência.

## Serviços (acordeão)

Os 6 serviços (`Som`, `Iluminação`, `LED`, `Vídeo`, `DJ`, `Estrutura`) são
**linhas que abrem na própria página** (sem modal). Cada um tem:

```html
<div class="svc-item" id="som">
  <div class="svc-btn" role="button" tabindex="0"
       aria-expanded="false" aria-controls="p-som">…título…</div>
  <div class="svc-painel" id="p-som">
    <div class="svc-box"><div class="svc-conteudo">
      <div><h4>o que levamos</h4><ul class="lista">…equipamentos…</ul>
           <a class="link-zap" href="https://wa.me/…">…</a></div>
      <div class="svc-fotos">…galeria…</div>
    </div></div>
  </div>
</div>
```

Regras:

- **Só o painel aberto carrega os vídeos.** Cada `<video>` usa `data-src`
  (nunca `src`) com `preload="none"` — nada é baixado antes do clique, e ao
  fechar o `src` é removido, liberando a memória dos 12 arquivos.
- **Foto**: `<img src="assets/img/x.jpg" alt="…" width="…" height="…"
  loading="lazy" decoding="async">`
- **Vídeo**: `<video controls playsinline preload="none"
  poster="assets/poster/x.jpg" data-src="assets/video/x.mp4"></video>`
- O `aria-controls` precisa apontar pra um `id` que exista; o `validate.js`
  reprova se sair de sincronia.
- Links no menu/rodapé com `#som`, `#led`, … **abrem o serviço** e rolam até
  ele.

Hoje as fotos de `som`, `iluminação`, `vídeo`, `DJ` e `estrutura` são
**provisórias** (reaproveitam as do portfólio). Para trocar pelas reais:
coloque o arquivo em `assets/img/`, troque o `src` e o `alt`, e ajuste
`width`/`height` com as medidas novas.

## QR Code impresso

`assets/qr/qr-site.svg` aponta para `https://vitorgianeis.github.io/tagsomeluz/`.
Se o site passar para `tagsomeluz.com.br`, regenere antes de mandar imprimir:

```bash
npx qrcode -t svg -o assets/qr/qr-site.svg https://tagsomeluz.com.br
```

## Verificação

Não há bundler nem etapa de build. `npm install` só baixa o `jsdom`, usado
pelo teste de comportamento:

```bash
npm install   # uma vez
npm test      # roda as quatro checagens
```

| Script | O que checa |
| --- | --- |
| `npm run test:contrast` | Contraste WCAG AA lendo os tokens de `css/site.css` (22 pares) |
| `npm run test:contrast:feira` | Contraste da seção da feira, sobre composição com alpha (13 pares) |
| `npm run test:static` | HTML/CSS/JS sem executar nada (50 checagens) |
| `npm run test:runtime` | Comportamento real em jsdom (70 checagens) |

Os testes **seguem o que o `index.html` referencia**: se o `<link>` apontar
pra outro arquivo CSS, o `validate.js` passa a ler aquele.

O `test:static` imprime uma seção `PENDÊNCIAS` se aparecer algum marcador
`.tbd` de dado pendente. Hoje não há nenhum — mas é o sinal de que **não dá
para publicar** enquanto existir.

`test:runtime` simula o relógio na data da feira para conferir a contagem
regressiva, então ele continua passando com o tempo.

## Licença

Todo o conteúdo (textos, fotos e vídeos) pertence à TAG Som e Luz.
