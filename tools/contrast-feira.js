function hex(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function over(fg,bg,a){return fg.map((c,i)=>Math.round(a*c+(1-a)*bg[i]));}
function lum(r){const s=r.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}
function ratio(a,b){const[l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x);return (l1+0.05)/(l2+0.05);}

const DARK=hex('#1A1A1A'),GRAD=hex('#2A1140'),FOOT=hex('#111'),WHITE=hex('#FFFFFF');
const PUR=hex('#b06ef5'),MUT=hex('#a3a3a3');

// composições reais do CSS
const CARD = over(WHITE,GRAD,0.06);      // .fair-card  rgba(255,255,255,.06) sobre o gradiente
const BOX  = over(hex('#000000'),GRAD,0.35); // caixa da contagem rgba(0,0,0,.35)
const EYE  = over(PUR,DARK,0.08);        // .fair-eyebrow

const cases=[
 ['Feira: título span roxo / gradiente #2A1140',PUR,GRAD,true],
 ['Feira: subtítulo #a3a3a3 / gradiente',MUT,GRAD,false],
 ['Feira: eyebrow roxo / fundo rgba(.15)',PUR,EYE,false],
 ['Feira: eyebrow ícone (UI 3:1)',PUR,EYE,false],
 ['Feira: card rótulo #a3a3a3',MUT,CARD,false],
 ['Feira: card strong branco',WHITE,CARD,false],
 ['Feira: card nota #a3a3a3',MUT,CARD,false],
 ['Feira: ícone do card (UI 3:1)',PUR,CARD,true],
 ['Contagem: número roxo / caixa escura',PUR,BOX,true],
 ['Contagem: "dias/horas" #a3a3a3',MUT,BOX,false],
 ['Contagem: título #a3a3a3 / gradiente',MUT,GRAD,false],
 ['Feira: nota do CTA #a3a3a3',MUT,GRAD,false],
 ['QR legenda: #1A1A1A sobre branco',hex('#1A1A1A'),WHITE,false],
 ['Endereço no Contato #a3a3a3',MUT,DARK,false],
 ['Bloco legal rodapé rgba(.7)',over(WHITE,FOOT,0.7),FOOT,false],
 ['Bloco legal strong branco',WHITE,FOOT,false],
];

let fail=0;
console.log('Estado   Ratio     Regra       O que');
console.log('─'.repeat(92));
for(const[d,fg,bg,large]of cases){
  const r=ratio(fg,bg),need=large?3.0:4.5,pass=r>=need;
  if(!pass)fail++;
  console.log(`${pass?'  PASS  ':'  FAIL  '}${r.toFixed(2).padStart(6)}:1  `+
    `>=${need} ${large?'(grande)':'(normal) '} ${pass?'       ':'FALHA  '}${d}`);
}
console.log('─'.repeat(92));
console.log(`${cases.length-fail}/${cases.length} passam · ${fail} reprovados`);
process.exit(fail?1:0);
