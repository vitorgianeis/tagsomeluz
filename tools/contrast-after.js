function hex(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function over(fg,bg,a){return fg.map((c,i)=>Math.round(a*c+(1-a)*bg[i]));}
function lum(rgb){const s=rgb.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}
function ratio(a,b){const[l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x);return (l1+0.05)/(l2+0.05);}

const DARK=hex('#1A1A1A'),FOOT=hex('#111'),LIGHT=hex('#F5F5F5'),WHITE=hex('#FFFFFF');
// tokens definidos no style.css
const PURPLE_DARK=hex('#b06ef5');   // --primary-on-dark
const PURPLE_LIGHT=hex('#6a0dad');  // --primary-color
const MUTED_DARK=hex('#a3a3a3');    // --muted-on-dark
const MUTED_LIGHT=hex('#666666');   // --text-light
const WA=hex('#25d366'),WA_H=hex('#1eb85a'),WA_T=hex('#04240f');

const cases=[
 ['Título "Serviços" span roxo / fundo escuro',PURPLE_DARK,DARK,true], ['Título "Contato" span roxo / fundo escuro',PURPLE_DARK,DARK,true],
 ['Subtítulo seção Contato',MUTED_DARK,DARK,false],
 ['Subtítulo seção Serviços',MUTED_DARK,DARK,false],
 ['Subtítulo seção Sobre (fundo claro)',MUTED_LIGHT,LIGHT,false],
 ['Subtítulo seção Portfólio (fundo claro)',MUTED_LIGHT,LIGHT,false],
 ['Ícone serviço SVG / fundo escuro',PURPLE_DARK,DARK,true],
 ['Título card serviço (branco)',WHITE,DARK,true],
 ['Texto card serviço rgba(.7)',over(WHITE,DARK,0.7),DARK,false],
 ['CTA "Ver vídeos" texto branco',WHITE,over(PURPLE_LIGHT,DARK,0.3),false],
 ['CTA "Ver vídeos" borda',PURPLE_DARK,over(PURPLE_LIGHT,DARK,0.3),false],
 ['Link nav hover/ativo',PURPLE_DARK,DARK,false],
 ['Item de dropdown em hover',PURPLE_DARK,over(PURPLE_LIGHT,DARK,0.2),false],
 ['Rodapé h4',PURPLE_DARK,FOOT,true],
 ['Rodapé link em hover',PURPLE_DARK,FOOT,false],
 ['Rodapé link normal rgba(.7)',over(WHITE,FOOT,0.7),FOOT,false],
 ['Rodapé .footer-bottom rgba(.5)',over(WHITE,FOOT,0.5),FOOT,false],
 ['BTN WhatsApp texto (verde da marca)',WA_T,WA,false],
 ['BTN WhatsApp hover texto',WA_T,WA_H,false],
 ['BTN flutuante WhatsApp ícone',WA_T,WA,false],
 ['Hero span roxo sobre preto',PURPLE_DARK,hex('#000000'),true],
 ['Botão outline branco sobre hero',WHITE,hex('#000000'),false],
 ['Stat número (fundo claro)',PURPLE_LIGHT,LIGHT,true],
 ['Título span seção clara',PURPLE_LIGHT,LIGHT,true],
 ['Link nav normal (branco)',WHITE,DARK,false],
 ['Modal subtítulo rgba(.7)',over(WHITE,DARK,0.7),DARK,false],
 ['Voltar ao topo: branco sobre roxo',WHITE,PURPLE_LIGHT,true],
 ['Foco/outline sobre escuro',PURPLE_DARK,DARK,false],
 ['Foco/outline sobre claro',PURPLE_LIGHT,LIGHT,false],
 ['Título seção clara #333',hex('#333333'),LIGHT,true],
];

const AA=4.5,AAA_LARGE=3.0;
let fail=0;
console.log('Estado    Ratio     Regra      O que');
console.log('─'.repeat(90));
for(const[d,fg,bg,large]of cases){
  const r=ratio(fg,bg),need=large?AAA_LARGE:AA,pass=r>=need;
  if(!pass)fail++;
  console.log(`${pass?'  PASS  ':'  FAIL  '}${r.toFixed(2).padStart(6)}:1  `+
    `>=${need} ${large?'(grande) ':'(normal) '} ${pass?'      ':'FALHA  '}${d}`);
}
console.log('─'.repeat(90));
console.log(`${cases.length-fail}/${cases.length} passam · ${fail} reprovados`);
process.exit(fail?1:0);
