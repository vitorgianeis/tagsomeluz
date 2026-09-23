# TAG Som e Luz

Landing page da **TAG Som e Luz** — locação de som, iluminação, painel de LED e vídeo para eventos em São Carlos e região.

Site publicado via **GitHub Pages**: <https://vitorgianeis.github.io/tagsomeluz/>

## Estrutura

```
.
├── index.html      # página única (one page)
├── style.css       # estilos e responsividade
├── script.js       # menu, modal do LED, rolagem suave, contagem da feira
├── robots.txt
├── sitemap.xml
├── package.json    # só verificação (npm test) — o site não tem build
├── tools/          # as 4 rotinas de checagem
└── assets/
    ├── hero.webp        # imagem de fundo do hero (1920×1080, local)
    ├── posters/*.jpg    # capa de cada vídeo do modal (12 arquivos)
    ├── qr-whatsapp.svg  # QR usado na seção da feira
    ├── qr-site.svg      # QR do site — é para material impresso
    ├── videos/*.mp4     # painel de LED
    └── *.jpg|*.webp     # logo e fotos do portfólio
```

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

> Os caminhos são relativos (`style.css`, `assets/...`), então a página funciona
> tanto na raiz do domínio quanto em `/tagsomeluz/`.

## Onde editar o conteúdo

| O quê | Onde |
| --- | --- |
| Textos e seções | `index.html` |
| Cores da marca | `style.css` → bloco `:root` (`--primary-color`, etc.) |
| Número do WhatsApp | `index.html` e `script.js` → `5516981719596` |
| Fotos do portfólio | `assets/*.jpg` (mantenha o nome do arquivo) |
| Vídeos do modal | `assets/videos/video1..12.mp4` |
| Capa dos vídeos | `assets/posters/*.jpg` (uma por vídeo) |
| Imagem do hero | `assets/hero.webp` (+ `<link rel="preload">` no `<head>`) |
| Data/hora da feira | `index.html` → `id="countdown"` → `data-deadline` |

> As capas dos vídeos saem dos próprios `.mp4` com ffmpeg:
> `ffmpeg -ss <segundos> -i assets/videos/video1.mp4 -frames:v 1 -vf scale=640:-2 -q:v 4 assets/posters/video1.jpg`

## ⚠ Dados pendentes

O HTML traz **marcadores amarelos** (`.tbd`) nos campos que dependem do
cliente. Enquanto estiverem lá, **não publique** — o `validate.js` acusa isso
na seção `PENDÊNCIAS`.

Falta informar:

- Razão social
- CNPJ
- Número do endereço
- CEP

Para preencher, procure o texto amarelo em `index.html` e troque
`<span class="tbd">TEXTO</span>` pelo valor real. Quando não sobrar nenhum
`.tbd`, remova a regra `.tbd` de `style.css` (é opcional — não atrapalha).
O `npm run test:static` confirma quando zerar.

## QR Code

`assets/qr-site.svg` aponta para `https://vitorgianeis.github.io/tagsomeluz/`.
Se o site passar para `tagsomeluz.com.br`, regenere antes de mandar imprimir:

```bash
npx qrcode -t svg -o assets/qr-site.svg https://tagsomeluz.com.br
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
| `npm run test:contrast:feira` | Contraste da seção da feira e blocos novos (17 pares) |
| `npm run test:static` | HTML/CSS/JS sem executar nada (39 checagens) |
| `npm run test:runtime` | Comportamento real em jsdom (56 checagens) |

O `test:static` imprime uma seção `PENDÊNCIAS` com os `.tbd` ainda em
aberto. Isso é aviso, não reprova — mas é o sinal de que **ainda não dá para
publicar**.

`test:runtime` simula o relógio na data da feira para conferir a contagem
regressiva, então ele continua passando com o tempo.

## Licença

Todo o conteúdo (textos, fotos e vídeos) pertence à TAG Som e Luz.
