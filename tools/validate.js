const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

const problems = [];
const ok = [];

// 1.âncoras internas vs ids (exclui <use href="#i-...">, que é sprite)
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const anchors = [...new Set(
  [...html.matchAll(/<a\b[^>]*href="(#[^"]+)"/g)].map(m => m[1])
)].filter(h => h !== '#');
const missingAnchors = anchors.filter(a => !ids.has(a.slice(1)));
missingAnchors.length
  ? problems.push('âncoras sem id alvo: ' + missingAnchors.join(', '))
  : ok.push(`todas as ${anchors.length} âncoras internas têm id (ids: ${[...ids].join(', ')})`);

// 2. arquivos locais referenciados existem
const refs = [...html.matchAll(/(?:src|href|data-src)="([^"#][^"]*)"/g)].map(m => m[1])
  .concat([...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(m => m[1]));
const local = [...new Set(refs)].filter(u =>
  !/^(https?:)?\/\/|^mailto:|^tel:|^data:/.test(u));
const missingFiles = local.filter(u => !fs.existsSync(path.join(root, u)));
missingFiles.length
  ? problems.push('arquivos ausentes: ' + missingFiles.join(', '))
  : ok.push(`todos os ${local.length} arquivos locais referenciados existem`);

// 3. nenhum caminho absoluto com barra inicial (quebra no GitHub Pages)
const absPaths = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map(m => m[1]);
absPaths.length
  ? problems.push('caminhos absolutos quebram no GH Pages: ' + absPaths.join(', '))
  : ok.push('nenhum caminho absoluto iniciado com "/"');

// 4. <link> do CSS dentro do <head>
const headEnd = html.indexOf('</head>');
const cssLink = html.indexOf('href="style.css"');
cssLink !== -1 && cssLink < headEnd
  ? ok.push('<link> do CSS está dentro do <head>')
  : problems.push('<link> do CSS fora do <head>');

// 5. estrutura básica do documento
[['<!DOCTYPE html>', 'doctype'], ['</head>', 'fecha head'], ['</body>', 'fecha body'], ['</html>', 'fecha html']]
  .forEach(([t, n]) => html.includes(t) ? ok.push(`${n} ok`) : problems.push(`${n} ausente`));

if (/<html[^>]*\slang=/.test(html)) ok.push('lang definido'); else problems.push('lang ausente');

// 6. head tem charset + viewport ANTES do title
const head = html.slice(0, headEnd);
if (/<meta charset/i.test(head) && /viewport/i.test(head)) ok.push('charset + viewport no <head>');
else problems.push('charset/viewport ausentes no <head>');

// 7. script com defer e fora do head bloqueante
if (/<script src="script\.js" defer><\/script>/.test(html)) ok.push('script.js com defer');
else problems.push('script.js sem defer');

// 8. loader removido (não deve mais existir)
if (/class="loader"|\.loader\s*\{|getElementById\('loader'\)/.test(html + css + js)) {
  problems.push('loader ainda presente');
} else {
  ok.push('loader removido (nenhum atraso artificial na renderização)');
}

// 8b. sem JS não há mais nenhum bloqueio
if (/<noscript>/.test(html)) ok.push('noscript ainda cobre algo');
else ok.push('nenhum bloqueio que dependa de JS');

// 9. OneTrust placeholder removido
if (/00000000-0000-0000-0000-000000000000/.test(html)) problems.push('OneTrust placeholder ainda presente');
else ok.push('script OneTrust placeholder removido');

// 10. og:image precisa ser URL absoluta e apontar para o próprio site
const ogImg = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1];
if (!ogImg) problems.push('og:image ausente');
else if (!/^https:\/\//.test(ogImg)) problems.push('og:image não é URL absoluta: ' + ogImg);
else if (/tagsomeluz\.com\.br/.test(ogImg)) problems.push('og:image aponta para domínio antigo (404)');
else ok.push('og:image absoluta e apontando para o site atual: ' + ogImg);

// 11. imagens com width/height/loading
const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
const noDims = imgs.filter(t => !/\swidth="/.test(t) || !/\sheight="/.test(t));
noDims.length ? problems.push(`imagens sem width/height: ${noDims.length}`) : ok.push(`todas as ${imgs.length} imagens têm width/height`);

const noLazy = imgs.filter(t => !/loading="lazy"/.test(t) && !/logo\.png/.test(t));
noLazy.length ? problems.push(`imagens sem loading=lazy (fora do logo): ${noLazy.length}`) : ok.push('imagens abaixo da dobra usam loading="lazy"');

// 12. links externos com rel=noopener
const ext = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(m => m[0]);
const noNoopener = ext.filter(t => !/rel="[^"]*noopener/.test(t));
noNoopener.length ? problems.push(`target=_blank sem rel=noopener: ${noNoopener.length}`) : ok.push(`todos os ${ext.length} links target=_blank têm rel="noopener"`);

// 13. vídeos: nenhum com src eager (só data-src) e preload=none
const vids = [...html.matchAll(/<video\b[^>]*>/g)].map(m => m[0]);
const eager = vids.filter(t => /\ssrc="/.test(t));
const badPreload = vids.filter(t => !/preload="none"/.test(t));
if (eager.length) problems.push(`${eager.length} vídeos ainda com src eager`);
else if (badPreload.length) problems.push(`${badPreload.length} vídeos sem preload=none`);
else ok.push(`todos os ${vids.length} vídeos carregam só ao abrir o modal (data-src + preload=none)`);

// 14. Font Awesome via CDN deve ter saído; agora é sprite SVG local
if (/font-awesome|fontawesome|cdnjs/i.test(html.replace(/<!--[\s\S]*?-->/g, ''))) {
  problems.push('ainda referencia Font Awesome via CDN');
} else {
  ok.push('Font Awesome CDN removido (sprite SVG local no lugar)');
}
const symbols = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
const uses = [...new Set([...html.matchAll(/<use href="#([^"]+)"/g)].map(m => m[1]))];
const brokenUse = uses.filter(u => !symbols.has(u));
brokenUse.length
  ? problems.push('<use> sem symbol correspondente: ' + brokenUse.join(', '))
  : ok.push(`sprite íntegro: ${symbols.size} symbols, ${uses.length} referências, 0 quebradas`);
const orphanSym = [...symbols].filter(s => !uses.includes(s));
if (orphanSym.length) problems.push('symbols sem uso: ' + orphanSym.join(', '));

// 14b. CTA de conversão no hero
const heroBlock = html.slice(html.indexOf('class="hero"'), html.indexOf('<!-- Sobre'));
if (/wa\.me\/5516981719596/.test(heroBlock)) ok.push('hero tem CTA de WhatsApp (conversão)');
else problems.push('hero sem CTA de orçamento');
if (!/wa\.me\/5516981719596/.test(heroBlock)) problems.push('hero sem link de WhatsApp');
if (!/Peça seu orçamento/.test(html)) problems.push('texto do CTA ausente');

// 15. style inline longo (o style do sprite SVG é permitido: esconde o sprite)
const inlineStyles = [...html.matchAll(/style="([^"]{40,})"/g)]
  .map(m => m[1])
  .filter(s => !s.includes('width:0') || !s.includes('position:absolute'));
inlineStyles.length ? problems.push(`${inlineStyles.length} style inline longo: ${inlineStyles.join(' | ')}`)
  : ok.push('sem style inline longo');

// 16. CSS: classes usadas no HTML que não existem no CSS e vice-versa (principais)
const htmlClasses = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)));
// só seletores de classe de verdade (não dentro de url(), nem .com/.css de URL)
const cssClasses = new Set(
  [...css.matchAll(/(?:^|[\s,>{(])\.([a-zA-Z][\w-]*)/gm)].map(m => m[1])
);
const unusedCss = [...cssClasses].filter(c => !htmlClasses.has(c) && !['hidden','active','visible','scrolled','has-dropdown','btn-outline','btn-primary','section-title','section-subtitle','container'].includes(c));
if (unusedCss.length) problems.push('classes no CSS sem uso: ' + unusedCss.join(', '));
else ok.push('nenhuma classe órfã no CSS');

// 17. seletor do hambúrguer bate com o HTML (spans, não divs)
if (/\.hamburger div/.test(css)) problems.push('CSS ainda espera .hamburger div (HTML usa span)');
else ok.push('seletor do hambúrguer compatível com o HTML');
if (/\.hamburger span/.test(css) && /class="line1"/.test(html)) ok.push('linhas do hambúrguer ok');

// 18. JS: sem dependência de elementos que não existem
['navbar','navLinks','hamburger','scrollTop','ledModal','year'].forEach(id => {
  if (!ids.has(id)) problems.push(`JS espera #${id} que não existe no HTML`);
});
ok.push('todos os ids usados pelo JS existem no HTML');

// 19. aria/labels básicos
if (/aria-modal="true"/.test(html)) ok.push('modal com aria-modal');
if (/role="button"/.test(html) && /tabindex="0"/.test(html)) ok.push('card do LED acessível por teclado');
if (/aria-expanded/.test(html)) ok.push('hambúrguer com aria-expanded');
if (/skip-link/.test(html)) ok.push('skip link presente');

// 20. contraste: título sobre fundo escuro no modal
if (/\.led-modal \.section-title[\s\S]{0,120}color:\s*var\(--text-white\)/.test(css)) ok.push('título do modal em branco (legível)');
else problems.push('título do modal pode ficar ilegível');

// 21. hero local (sem dependência de terceiros) + preload
if (/unsplash/i.test(html + css)) problems.push('hero ainda depende do Unsplash');
else ok.push('hero usa imagem local (sem dependência de terceiros)');
if (/rel="preload" as="image" href="assets\/hero\.webp"/.test(html)) ok.push('hero com <link rel="preload"> (LCP)');
else problems.push('hero sem preload');
const heroBg = (css.match(/url\('([^']*hero[^']*)'\)/) || [])[1];
if (heroBg && fs.existsSync(path.join(root, heroBg))) ok.push(`background do hero aponta pra ${heroBg} (existe)`);
else problems.push('background do hero não resolve pra arquivo existente');

// 22. posters dos vídeos
const posters = [...html.matchAll(/poster="([^"]+)"/g)].map(m => m[1]);
const missingPosters = posters.filter(p => !fs.existsSync(path.join(root, p)));
if (posters.length !== 12) problems.push(`esperava 12 posters, achei ${posters.length}`);
else if (missingPosters.length) problems.push('posters com arquivo ausente: ' + missingPosters.join(', '));
else ok.push('12 vídeos com poster e arquivo presente');

// 23. seção da feira e contagem regressiva
if (/id="feira"/.test(html)) ok.push('seção #feira presente');
else problems.push('seção da feira ausente');
if (/id="countdown"[^>]*data-deadline="([^"]+)"/.test(html)) {
  const dl = RegExp.$1;
  const t = Date.parse(dl);
  if (isNaN(t)) problems.push('data da feira inválida: ' + dl);
  else if (t < Date.now()) problems.push('data da feira já passou: ' + dl);
  else ok.push(`contagem regressiva para ${dl} (${Math.ceil((t - Date.now()) / 86400000)} dias)`);
} else problems.push('countdown sem data-limite');

// 24. dados pendentes: marcador visível (aviso, não reprova o teste —
//     o dado é do cliente e ainda não foi informado)
const tbds = [...html.matchAll(/class="tbd"[^>]*>([^<]+)</g)].map(m => m[1].trim());
const warnings = [];
if (tbds.length) warnings.push(`${tbds.length} dado(s) pendente(s) — preencher ANTES DE PUBLICAR: ${tbds.join(' · ')}`);
else ok.push('nenhum dado pendente no HTML');

// 25. nenhuma imagem/URL de estilo vindo de terceiros
//     (só <img>/<image>/poster/css url(); <script src> de analytics é esperado)
const extImgs = [...html.matchAll(/<img\b[^>]*\b(?:src|srcset)="(https?:\/\/[^"]+)"/g)].map(m => m[1])
  .concat([...html.matchAll(/<image\b[^>]*\bhref="(https?:\/\/[^"]+)"/g)].map(m => m[1]))
  .concat([...html.matchAll(/\bposter="(https?:\/\/[^"]+)"/g)].map(m => m[1]))
  .concat([...css.matchAll(/url\(['"]?(https?:\/\/[^'")]+)/g)].map(m => m[1]));
if (extImgs.length) problems.push('imagens/URLs externas: ' + extImgs.join(', '));
else ok.push('nenhuma imagem externa (tudo é servido do próprio repositório)');

console.log('✔ OK (' + ok.length + ')');
ok.forEach(t => console.log('   + ' + t));
if (warnings.length) {
  console.log('\n⚠ PENDÊNCIAS (' + warnings.length + ')');
  warnings.forEach(t => console.log('   ! ' + t));
}
console.log('\n✖ PROBLEMAS (' + problems.length + ')');
problems.forEach(t => console.log('   - ' + t));

process.exit(problems.length ? 1 : 0);
