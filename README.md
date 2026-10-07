# TAG Som e Luz

Landing page da **TAG Som e Luz** — locação de som, iluminação, painel de LED e vídeo para eventos em São Carlos e região.

Site publicado via **GitHub Pages**: <https://vitorgianeis.github.io/tagsomeluz/>

## Estrutura

```
.
├── index.html      # página única (one page)
├── css/
│   └── style.css   # estilos e responsividade
├── js/
│   └── script.js   # menu, modal dos serviços, rolagem suave, contagem da feira
├── assets/
│   ├── img/        # fotos do portfólio, equipe e o logo
│   ├── poster/     # capa de cada vídeo do modal (12 arquivos)
│   ├── qr/         # qr-whatsapp.svg (usado na página) e qr-site.svg (impresso)
│   └── video/      # painel de LED (12 mp4)
├── robots.txt
├── sitemap.xml     # precisa ficar na raiz do domínio
├── package.json    # só verificação (npm test) — o site não tem build
└── tools/          # as 4 rotinas de checagem
```

`index.html`, `robots.txt` e `sitemap.xml` ficam na raiz de propósito: o
GitHub Pages serve da raiz e o `robots.txt`/`sitemap.xml` só são lidos lá.

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

> Os caminhos são relativos (`css/style.css`, `assets/...`), então a página
> funciona tanto na raiz do domínio quanto em `/tagsomeluz/`.

## Onde editar o conteúdo

| O quê | Onde |
| --- | --- |
| Textos e seções | `index.html` |
| Cores da marca | `css/style.css` → bloco `:root` (`--primary-color`, etc.) |
| Número do WhatsApp | `index.html` e `js/script.js` → `5516981719596` |
| Fotos do portfólio | `assets/img/*.jpg` (mantenha o nome do arquivo) |
| Vídeos do modal | `assets/video/video1..12.mp4` |
| Capa dos vídeos | `assets/poster/*.jpg` (uma por vídeo) |
| Fotos/vídeos de cada serviço | `index.html` → `<!-- Modal de Serviços -->` → painel do serviço → troque o `data-src` da imagem |
| Texto dos tipos de equipamento | `index.html` → `<ul class="svc-list">` do painel correspondente |
| Imagem do hero | `assets/img/hero.webp` (+ `<link rel="preload">` no `<head>`) |
| Data/hora da feira | `index.html` → `id="countdown"` → `data-deadline` |

> As capas dos vídeos saem dos próprios `.mp4` com ffmpeg:
> `ffmpeg -ss <segundos> -i assets/video/video1.mp4 -frames:v 1 -vf scale=640:-2 -q:v 4 assets/poster/video1.jpg`

## Dados do cliente

Todos os campos que dependiam do cliente já foram preenchidos e conferidos
no HTML: razão social, CNPJ, número do endereço e CEP (rodapé e seção de
contato).

Se algum dado voltar a ficar pendente, marque com
`<span class="tbd">TEXTO</span>` — o `validate.js` avisa na seção
`PENDÊNCIAS` e o `test:runtime` reprova enquanto houver pendência. Nesse
caso, crie a regra `.tbd` de novo (fundo amarelo `#FFD54F`, borda tracejada)
para o marcador ficar visível na página.

## Modal de serviços

Os 6 cards de serviço (`Som`, `Iluminação`, `LED`, `Vídeo`, `DJ`,
`Estrutura`) são clicáveis e abrem **um mesmo modal** com painéis
independentes. Cada painel tem:

```html
<section class="svc-panel" data-panel="som" hidden>
  <h2 class="svc-title" id="svc-panel-som-title">Som Profissional <span>o que levamos</span></h2>
  <p class="svc-subtitle">…</p>
  <ul class="svc-list">…tipos de equipamento…</ul>
  <div class="svc-grid">…galeria…</div>
  <div class="svc-cta">…botão de WhatsApp…</div>
</section>
```

Regras:

- **Só o painel aberto carrega a mídia.** Tudo usa `data-src` (nunca `src`),
  então nada é baixado antes do clique — e ao fechar o `src` é removido,
  liberando memória.
- **Foto**: `<img data-src="assets/img/x.jpg" alt="…" width="…" height="…"
  loading="lazy" decoding="async">`
- **Vídeo**: `<video controls playsinline preload="none"
  poster="assets/poster/x.jpg" data-src="assets/video/x.mp4"></video>`
- A `data-panel` do painel precisa bater com o `data-open-service` do card e
  com o `id` do card (`som`, `iluminacao`, `led`, `video`, `dj`, `estrutura`)
  — o `validate.js` reprova se saírem de sincronia.
- Links no menu/rodapé para esses ids abrem o modal em vez de rolar.

Hoje as fotos de `som`, `iluminação`, `vídeo`, `DJ` e `estrutura` são
**provisórias** (reaproveitam as do portfólio). Para trocar pelas reais:
coloque o arquivo em `assets/img/`, troque o `data-src` e o `alt`, e ajuste
`width`/`height` com as medidas novas.



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
| `npm run test:contrast` | Contraste WCAG AA da página base (30 pares) |
| `npm run test:contrast:feira` | Contraste da seção da feira e blocos novos (16 pares) |
| `npm run test:static` | HTML/CSS/JS sem executar nada (46 checagens) |
| `npm run test:runtime` | Comportamento real em jsdom (105 checagens) |

O `test:static` imprime uma seção `PENDÊNCIAS` se aparecer algum marcador
`.tbd` de dado pendente. Hoje não há nenhum — mas é o sinal de que **não dá
para publicar** enquanto existir.

`test:runtime` simula o relógio na data da feira para conferir a contagem
regressiva, então ele continua passando com o tempo.

## Licença

Todo o conteúdo (textos, fotos e vídeos) pertence à TAG Som e Luz.
