// @ts-nocheck
/* Silnik grafiki izometrycznej Velorie (voxel + UI 2D).
   Przeniesiony 1:1 z projektu źródłowego — hero i miniatury produktów renderują się identycznie.
   Działa wyłącznie w przeglądarce (canvas). */
const colCache={};
function rgb(h){if(colCache[h])return colCache[h];const n=parseInt(h.slice(1),16);return colCache[h]=[n>>16&255,n>>8&255,n&255]}
function h3(x,y,z){let h=(x*374761393+y*668265263+z*2147483647)|0;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)}
function rng(seed){let s=seed>>>0||1;return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
class Vox{
  constructor(){this.m=new Map()}
  k(x,y,z){return (x+512)*1048576+(y+512)*1024+(z+512)}
  set(x,y,z,c,e){if(!c){return}this.m.set(this.k(x,y,z),{x,y,z,c,e:!!e})}
  del(x,y,z){this.m.delete(this.k(x,y,z))}
  has(x,y,z){return this.m.has(this.k(x,y,z))}
  box(x0,y0,z0,w,d,h,f){for(let x=x0;x<x0+w;x++)for(let y=y0;y<y0+d;y++)for(let z=z0;z<z0+h;z++){const r=typeof f==='function'?f(x-x0,y-y0,z-z0,x,y,z):f;if(!r)continue;if(typeof r==='string')this.set(x,y,z,r);else this.set(x,y,z,r.c,r.e)}}
}
const E=c=>({c,e:true});
function renderVox(g,S,W,H,o={}){
  const vox=[...S.m.values()];if(!vox.length)return;
  const A=.8660254,pad=o.pad??24;
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const v of vox){const a=(v.x-v.y)*A,b=(v.x+v.y)*.5-v.z;if(a-A<x0)x0=a-A;if(a+A>x1)x1=a+A;if(b-1<y0)y0=b-1;if(b+1>y1)y1=b+1}
  let s=Math.min((W-pad*2)/(x1-x0),(H-pad*2)/(y1-y0));if(o.maxS)s=Math.min(s,o.maxS);
  const ox=W/2-(x0+x1)/2*s+(o.dx||0),oy=H/2-(y0+y1)/2*s+(o.dy||0);
  const P=(x,y,z)=>[ox+(x-y)*A*s,oy+((x+y)*.5-z)*s];
  vox.sort((a,b)=>(a.x+a.y+a.z)-(b.x+b.y+b.z)||a.z-b.z);
  // ground shadow
  if(o.shadow!==false){const cx=(x0+x1)/2*s+ox,by=oy+y1*s-s*2;const gr=g.createRadialGradient(cx,by,0,cx,by,(x1-x0)*s*.5);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.save();g.translate(cx,by);g.scale(1,.28);g.translate(-cx,-by);g.fillStyle=gr;g.beginPath();g.arc(cx,by,(x1-x0)*s*.5,0,7);g.fill();g.restore()}
  const lw=Math.max(.6,s*.08);g.lineJoin='round';
  const face=(pts,c,k)=>{const col=`rgb(${Math.min(255,c[0]*k)|0},${Math.min(255,c[1]*k)|0},${Math.min(255,c[2]*k)|0})`;g.fillStyle=g.strokeStyle=col;g.lineWidth=lw;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<4;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill();g.stroke()};
  const em=[];
  for(const v of vox){
    const {x,y,z}=v,c=rgb(v.c);
    const n=v.e?1:1+((h3(x,y,z)%9)-4)*.014;
    if(!S.has(x,y,z+1)){let k=(v.e?1.12:1)*n;if(!v.e&&(S.has(x-1,y,z+1)||S.has(x,y-1,z+1)))k*=.8;face([P(x,y,z+1),P(x+1,y,z+1),P(x+1,y+1,z+1),P(x,y+1,z+1)],c,k)}
    if(!S.has(x+1,y,z)){let k=(v.e?.98:.78)*n;if(!v.e&&S.has(x+1,y,z+1))k*=.85;face([P(x+1,y,z),P(x+1,y+1,z),P(x+1,y+1,z+1),P(x+1,y,z+1)],c,k)}
    if(!S.has(x,y+1,z)){let k=(v.e?.9:.6)*n;if(!v.e&&S.has(x,y+1,z+1))k*=.85;face([P(x,y+1,z),P(x+1,y+1,z),P(x+1,y+1,z+1),P(x,y+1,z+1)],c,k)}
    if(v.e)em.push(v);
  }
  if(o.glow!==false&&em.length){
    g.save();g.globalCompositeOperation='lighter';
    const step=Math.max(1,Math.floor(em.length/500));
    for(let i=0;i<em.length;i+=step){const v=em[i],c=rgb(v.c),[px,py]=P(v.x+.5,v.y+.5,v.z+.5),r=s*(o.glowR||3.2);const gr=g.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},${(o.glowA||.11)*step})`);gr.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);g.fillStyle=gr;g.fillRect(px-r,py-r,r*2,r*2)}
    g.restore();
  }
  return {s,P};
}

/* ---------- models ---------- */
const FACE=['HHHHHHHH','HHHHHHHH','HSSSSSSH','SSSSSSSS','SWESSEWS','SSSNNSSS','SSMMMMSS','SSSSSSSS'];
function character(S,ox,oy,oz,st){
  const fc={H:st.hair,S:st.skin,W:'#f2f6ff',E:st.eye||'#2f6bff',N:st.skin2,M:st.mouth||'#5b2a2a'};
  // legs
  S.box(ox+2,oy,oz,4,8,12,(lx,ly,lz)=>lz<2?st.shoes:(lz<3&&st.cuff?st.cuff:(ly===3||ly===4)&&lx===3?st.pants2||st.pants:st.pants));
  // body
  S.box(ox+2,oy,oz+12,4,8,12,(lx,ly,lz)=>{
    if(lz===0)return st.belt||st.pants2||st.pants;
    if(lx===3&&st.logo){const L={9:[1,6],8:[2,5],7:[2,5],6:[3,4],5:[3,4]};if(L[lz]&&L[lz].includes(ly))return E(st.logo)}
    if(lx===3&&st.badge&&lz===8&&ly===5)return E(st.badge);
    if(lx===3&&st.zip&&(ly===3||ly===4)&&lz<10)return st.zip;
    if(lz===11&&(ly===3||ly===4)&&lx===3)return st.skin;
    return st.shirt});
  // arms
  for(const ay of [oy-4,oy+8])S.box(ox+2,ay,oz+12,4,4,12,(lx,ly,lz)=>lz<(st.short?7:3)?st.skin:(lz===3&&st.cuffE?E(st.cuffE):st.sleeve||st.shirt));
  // head
  S.box(ox,oy,oz+24,8,8,8,(lx,ly,lz)=>{
    const row=7-lz;
    if(lx===7){const ch=FACE[row][ly];return fc[ch]}
    if(lz>=6)return st.hair;
    if(lx<=2&&lz>=2)return st.hair;
    if((ly===0||ly===7)&&lz>=5)return st.hair;
    return st.skin});
  if(st.cap){S.box(ox,oy,oz+32,8,8,1,st.cap);S.box(ox+8,oy,oz+31,2,8,1,st.cap2||st.cap);if(st.capBadge)S.set(ox+7,oy+3,oz+32,st.capBadge,true),S.set(ox+7,oy+4,oz+32,st.capBadge,true)}
  if(st.phones){for(const y of [oy-1,oy+8])S.box(ox+2,y,oz+26,3,1,4,(lx,ly,lz)=>lz===1||lz===2?E(st.phones):'#141c2e');S.box(ox+3,oy-1,oz+32,1,10,1,'#141c2e');S.box(ox+3,oy-1,oz+30,1,1,2,'#141c2e');S.box(ox+3,oy+8,oz+30,1,1,2,'#141c2e')}
}
function island(S,W,D,seed,o={}){
  const r=rng(seed),cx=W/2,cy=D/2;
  for(let x=0;x<W;x++)for(let y=0;y<D;y++){
    const dx=(x-cx+.5)/(W/2),dy=(y-cy+.5)/(D/2),d=Math.sqrt(dx*dx+dy*dy)+ (r()-.5)*.12;
    if(d>1)continue;
    const depth=Math.max(1,Math.round((1-d)*(o.depth||11)+r()*3));
    const tops=o.top||['#1a2338','#1c263e','#182034','#1f2a44'];
    S.set(x,y,-1,(o.oreTop&&r()<.025)?o.oreTop:tops[(r()*tops.length)|0],o.oreTop&&false);
    for(let z=2;z<=depth;z++){const ore=r()<.035;S.set(x,y,-z,ore?(o.ore||'#38bdf8'):(z<3?'#121a2c':['#0e1524','#101829','#0c1220'][(r()*3)|0]),ore)}
  }
  if(o.oreTop){for(let i=0;i<W*D*.02;i++){const x=(r()*W)|0,y=(r()*D)|0;if(S.has(x,y,-1))S.set(x,y,-1,o.oreTop,true)}}
}
function lamp(S,x,y,z,h,c){S.box(x,y,z,1,1,h,'#1a2236');S.set(x,y,z+h,c||'#8fdcff',true)}
function tower(S,x,y,z,w,d,h,st={}){
  S.box(x,y,z,w,d,h,(lx,ly,lz)=>{
    const edge=(lx===0||lx===w-1)&&(ly===0||ly===d-1);
    if(edge)return st.trim||'#26375c';
    const outer=lx===w-1||ly===d-1;
    if(outer&&lz%3===1&&lz<h-1&&((lx+ly)%2===0))return E(st.win||'#5ab8ff');
    return st.wall||'#141e33'});
  if(st.roof)S.box(x-1,y-1,z+h,w+2,d+2,1,(lx,ly)=>(lx===0||ly===0||lx===w+1||ly===d+1)?st.roof:null);
  if(st.top)S.set(x+(w>>1),y+(d>>1),z+h,st.top,true);
}
function car(S,x,y,z,st={}){
  const L=12,Wd=6;
  S.box(x,y,z+1,L,Wd,3,(lx,ly,lz)=>{
    if(lx===L-1&&(ly===0||ly===Wd-1)&&lz===1)return E('#eaf6ff');
    if(lx===0&&(ly===0||ly===Wd-1)&&lz===1)return E('#ff4d6d');
    if(st.livery&&lz===1&&(ly===0||ly===Wd-1))return st.livery;
    return st.body||'#e9eef8'});
  S.box(x+3,y,z+4,6,Wd,2,(lx,ly,lz)=>(lx===0||lx===5||ly===0||ly===Wd-1)&&lz===0?'#0b1220':(st.roof||st.body||'#e9eef8'));
  for(const [wx,wy] of [[1,-0],[8,0],[1,Wd-1],[8,Wd-1]])S.box(x+wx,y+wy,z,3,1,2,(lx,ly,lz)=>lx===1&&lz===1?'#3b4660':'#0a0e18');
  if(st.bar){S.set(x+5,y+1,z+6,'#2f6bff',true);S.set(x+5,y+2,z+6,'#2f6bff',true);S.set(x+5,y+3,z+6,'#ff3b5c',true);S.set(x+5,y+4,z+6,'#ff3b5c',true);S.set(x+6,y+1,z+6,'#2f6bff',true);S.set(x+6,y+2,z+6,'#2f6bff',true);S.set(x+6,y+3,z+6,'#ff3b5c',true);S.set(x+6,y+4,z+6,'#ff3b5c',true)}
}
function sprite(S,cells,x0,y0,z0,depth=1){for(const [r,c,col,e] of cells)for(let d=0;d<depth;d++)S.set(x0+d,y0+c,z0+(15-r),col,e)}
function swordCells(blade='#5aa2ff',edge='#c9ecff',guard='#38bdf8'){
  const out=[];
  for(let i=0;i<10;i++){out.push([i,15-i,edge]);out.push([i,14-i,blade]);if(i<9)out.push([i+1,15-i,'#1d4fd8'])}
  for(const [r,c] of [[8,3],[9,4],[10,5],[11,6],[12,7]])out.push([r,c,guard,true]);
  for(const [r,c] of [[11,4],[12,3],[13,2]])out.push([r,c,'#2a2f45']);
  out.push([14,1,guard,true]);out.push([15,0,'#1a2236']);
  return out;
}
function shieldCells(){
  const out=[];
  for(let r=0;r<15;r++){const w=r<8?12:Math.max(2,12-(r-7)*2),s=Math.floor((16-w)/2);for(let c=s;c<s+w;c++){const border=c===s||c===s+w-1||r===0||(r>=8&&(c===s||c===s+w-1))||r===14;out.push([r,c,border?'#8fdcff':(((r+c)%2)?'#1d4fd8':'#2457e6'),border])}}
  for(const [r,c] of [[7,5],[8,6],[9,7],[8,8],[7,9],[6,10],[5,11]])out.push([r,c,'#eaf6ff',true]);
  return out;
}
function keyCells(){
  const out=[];
  for(let r=0;r<6;r++)for(let c=0;c<6;c++){const d=Math.hypot(r-2.5,c-2.5);if(d>1.4&&d<3.1)out.push([r,c,'#38bdf8',true])}
  for(let i=0;i<8;i++)out.push([4+i,4+i,'#7cc8ff',true]);
  out.push([9,11,'#7cc8ff',true]);out.push([10,10,'#7cc8ff',true]);out.push([11,13,'#7cc8ff',true]);out.push([12,12,'#7cc8ff',true]);
  return out;
}
const MODELS={
  hero(){const S=new Vox();island(S,34,42,7,{depth:13,oreTop:'#38bdf8'});
    character(S,13,14,0,{skin:'#e8b98f',skin2:'#d69f76',hair:'#2a1d18',shirt:'#0f1a33',sleeve:'#0f1a33',cuffE:'#38bdf8',logo:'#4f86ff',pants:'#121826',pants2:'#0d121d',shoes:'#e9eef8',eye:'#2f6bff'});
    character(S,6,27,0,{skin:'#c98e66',skin2:'#b57b56',hair:'#111111',shirt:'#1b3b8f',sleeve:'#1b3b8f',short:true,badge:'#fbbf24',pants:'#0e1730',pants2:'#0b1226',shoes:'#0a0d14',belt:'#0a0d14',cap:'#0e1a3a',cap2:'#0b142c',capBadge:'#fbbf24',eye:'#3a2a1a'});
    character(S,8,1,0,{skin:'#f0c7a2',skin2:'#e0b089',hair:'#cfe3ff',shirt:'#dfe8f8',sleeve:'#dfe8f8',zip:'#9fb0cc',pants:'#1a2338',pants2:'#141b2c',shoes:'#2f6bff',eye:'#38bdf8',phones:'#38bdf8'});
    S.box(17,6,13,3,3,3,()=>E('#5fd0ff'));
    lamp(S,2,6,0,6);lamp(S,3,36,0,6);lamp(S,26,38,0,4);lamp(S,27,3,0,4);
    for(const [x,y,z] of [[24,30,30],[3,18,36],[28,10,24],[0,30,22]])S.set(x,y,z,'#8fdcff',true);
    S.box(25,30,0,4,4,3,(lx,ly,lz)=>lz===2&&lx>0&&lx<3&&ly>0&&ly<3?E('#38bdf8'):'#1f2b48');
    return S},
  mcTile(){const S=new Vox();island(S,26,26,3,{depth:9,oreTop:'#38bdf8'});tower(S,4,4,0,6,6,14,{roof:'#2f6bff',top:'#8fdcff'});tower(S,14,4,0,5,5,9,{});
    character(S,12,13,0,{skin:'#e8b98f',skin2:'#d69f76',hair:'#2a1d18',shirt:'#0f1a33',cuffE:'#38bdf8',logo:'#4f86ff',pants:'#121826',shoes:'#e9eef8'});lamp(S,22,3,0,5);lamp(S,4,21,0,5);return S},
  fivemTile(){return MODELS.city(true)},
  sword(){const S=new Vox();sprite(S,swordCells(),0,0,3,2);sprite(S,shieldCells(),-6,9,0,2);S.box(-8,-2,-3,12,22,2,(lx,ly,lz)=>lz===1&&(lx+ly)%5===0?E('#2f6bff'):'#141d31');return S},
  swords(){const S=new Vox();sprite(S,swordCells(),0,0,2,1);sprite(S,swordCells('#7c8cff','#e0e6ff','#a5b4fc'),-5,6,0,1);sprite(S,swordCells('#38bdf8','#e0f7ff','#8fdcff'),-10,12,-2,1);return S},
  shield(){const S=new Vox();sprite(S,shieldCells(),0,0,0,3);return S},
  chest(){const S=new Vox();S.box(0,0,0,14,14,11,(lx,ly,lz)=>{
      const edge=(lx===0||lx===13)&&(ly===0||ly===13)||lz===0||lz===10&&(lx===0||lx===13||ly===0||ly===13);
      if(lz===7)return '#0a0f1c';
      if(lx===13&&ly>=5&&ly<=8&&lz>=5&&lz<=8)return E(ly===5||ly===8||lz===5||lz===8?'#38bdf8':'#c9ecff');
      return edge?'#2f4a86':'#152242'});
    sprite(S,keyCells(),6,14,12,1);
    S.box(-3,-3,-2,20,20,2,(lx,ly,lz)=>lz===1&&(lx===0||ly===0||lx===19||ly===19)?E('#2f6bff'):'#0f1626');return S},
  lobby(){const S=new Vox();island(S,30,30,11,{depth:10,oreTop:'#38bdf8'});
    tower(S,3,3,0,7,7,18,{top:'#8fdcff',win:'#5ab8ff'});tower(S,19,4,0,6,6,12,{});tower(S,4,19,0,6,6,13,{});
    S.box(17,17,0,9,9,1,(lx,ly)=>((lx+ly)%2?'#1f2b48':'#26375c'));
    for(let i=0;i<7;i++){S.set(21,15+i,1,'#38bdf8',true);S.set(21,15+i,9,'#38bdf8',true)}for(let z=1;z<10;z++){S.set(21,15,z,'#38bdf8',true);S.set(21,21,z,'#38bdf8',true)}
    for(let z=2;z<9;z++)for(let y=16;y<21;y++)S.set(21,y,z,'#1d4fd8',true);
    for(let i=0;i<5;i++)S.box(12+i*2,11,i*2,2,2,1,'#2f6bff');
    lamp(S,27,14,0,5);lamp(S,14,27,0,5);return S},
  medieval(){const S=new Vox();island(S,30,30,21,{depth:9,top:['#1c2436','#202a40','#1a2232']});
    S.box(8,8,0,14,14,1,(lx,ly)=>((lx+ly)%2?'#2a3550':'#232d45'));
    tower(S,12,12,1,5,5,20,{wall:'#2a3550',trim:'#3b4c74',roof:'#1d4fd8',win:'#fbbf24',top:'#fbbf24'});
    for(const [x,y] of [[3,3],[24,3],[3,24],[24,24]])tower(S,x,y,0,3,3,8,{wall:'#2a3550',trim:'#3b4c74',win:'#fbbf24'});
    for(let i=6;i<24;i++){if(i%2)S.box(i,3,0,1,1,4,'#232d45');else S.box(i,3,0,1,1,5,'#2a3550');if(i%2)S.box(3,i,0,1,1,4,'#232d45');else S.box(3,i,0,1,1,5,'#2a3550')}
    lamp(S,20,24,0,4,'#fbbf24');lamp(S,24,20,0,4,'#fbbf24');return S},
  setup(){const S=new Vox();island(S,28,28,31,{depth:10,oreTop:'#38bdf8'});
    S.box(9,9,0,10,10,1,'#26375c');S.box(11,11,1,6,6,1,'#38bdf8');for(let x=11;x<17;x++)for(let y=11;y<17;y++)S.set(x,y,1,'#38bdf8',true);
    for(let z=2;z<40;z++)S.set(14,14,z,z%2?'#8fdcff':'#5fd0ff',true);
    tower(S,2,3,0,6,5,10,{});tower(S,20,2,0,5,6,8,{});tower(S,3,20,0,5,5,7,{});
    character(S,19,16,0,{skin:'#e8b98f',skin2:'#d69f76',hair:'#2a1d18',shirt:'#0f1a33',cuffE:'#38bdf8',logo:'#4f86ff',pants:'#121826',shoes:'#e9eef8'});return S},
  room(theme){const S=new Vox();const N=20;
    S.box(0,0,0,N,N,1,(lx,ly)=>theme==='club'?E((lx+ly)%2?'#1d4fd8':((lx*ly)%3?'#38bdf8':'#0b1630')):theme==='hospital'?((lx+ly)%2?'#d9e2f2':'#c8d3e8'):((lx+ly)%2?'#1c263e':'#18213a'));
    const wall=theme==='hospital'?'#e6edf8':theme==='club'?'#0b1020':'#1a2440';
    S.box(0,0,1,1,N,11,(lx,ly,lz)=>lz===9&&theme!=='hospital'?E(theme==='police'?'#2f6bff':'#38bdf8'):(lz===0?'#2a3550':wall));
    S.box(1,0,1,N-1,1,11,(lx,ly,lz)=>lz===9&&theme!=='hospital'?E(theme==='police'?'#2f6bff':'#38bdf8'):(lz===0?'#2a3550':wall));
    if(theme==='police'){
      for(const [x,y] of [[4,4],[4,11],[11,4],[11,11]]){S.box(x,y,1,4,6,2,(lx,ly,lz)=>lz===1?'#2b3a5e':'#1b2540');S.box(x+1,y+2,3,1,2,2,(lx,ly,lz)=>E('#5ab8ff'));S.box(x+5,y+2,1,2,2,2,'#0e1426')}
      for(let y=2;y<18;y+=3)S.box(1,y,1,2,2,6,(lx,ly,lz)=>lz===5?'#2a3550':'#3a4a70');
      S.box(2,1,5,1,6,3,(lx,ly,lz)=>E(lz===1?'#ffffff':'#2f6bff'));
      S.box(16,14,1,3,4,3,'#0e1426');}
    if(theme==='hospital'){
      for(const y of [3,10]){S.box(5,y,1,8,4,2,(lx,ly,lz)=>lz===1?(lx<2?'#ffffff':'#2f6bff'):'#9aa8c0');S.box(4,y+1,1,1,2,4,'#9aa8c0');S.box(4,y+1,5,1,2,2,E('#34d399'))}
      S.box(14,3,1,4,4,1,'#c8d3e8');S.box(15,4,2,2,2,5,'#e6edf8');for(let y=1;y<19;y+=1)if(y%4===0)S.set(1,y,7,'#38bdf8',true);
      S.box(2,15,1,1,4,8,(lx,ly,lz)=>'#7cc8ff');}
    if(theme==='club'){
      S.box(2,2,1,3,14,4,(lx,ly,lz)=>lz===3?E('#38bdf8'):'#141d31');
      for(const [x,y] of [[14,2],[2,16]])S.box(x,y,1,3,3,7,(lx,ly,lz)=>lz%2?'#0a0f1c':'#1a2440');
      for(let i=0;i<10;i++)S.set(10+(i%3),6+i,1+(i%4)*2+3,'#8fdcff',true);
      S.box(13,13,1,5,5,1,'#26375c');}
    if(theme==='garage'){
      car(S,6,4,1,{body:'#2f6bff',roof:'#1d4fd8'});car(S,6,12,1,{body:'#e9eef8'});
      for(let x=2;x<19;x++){S.set(x,10,1,'#fbbf24',x%2===0);}
      S.box(1,1,1,2,6,5,'#26375c');S.box(1,2,6,1,4,1,E('#38bdf8'));}
    if(theme==='vault'){
      for(let y=0;y<N;y++)for(let z=0;z<11;z++){}
      const cy=10,cz=6;for(let y=3;y<18;y++)for(let z=1;z<12;z++){const d=Math.hypot(y-cy,z-cz);if(d<5.6){S.set(1,y,z,d>4.4?'#3b4c74':(Math.abs(y-cy)<.6||Math.abs(z-cz)<.6?'#8fdcff':'#26375c'),d>4.4||(Math.abs(y-cy)<.6||Math.abs(z-cz)<.6))}}
      S.box(2,cy,cz,1,1,1,E('#c9ecff'));
      for(let i=0;i<4;i++){for(let x=3;x<19;x++)S.set(x,4+i*4,2+i,'#ff3b5c',true)}
      for(const [x,y] of [[12,13],[15,6],[8,15]])S.box(x,y,1,3,3,2,(lx,ly,lz)=>lz===1?'#fbbf24':'#c08a14');}
    return S},
  police(){return MODELS.room('police')},hospital(){return MODELS.room('hospital')},club(){return MODELS.room('club')},garage(){return MODELS.room('garage')},vault(){return MODELS.room('vault')},
  city(tile){const S=new Vox();const N=30;
    S.box(0,0,-1,N,N,1,(lx,ly)=>{const road=lx%10>=7||ly%10>=7;if(road){if((lx%10===8&&ly%3===0&&!(ly%10>=7))||(ly%10===8&&lx%3===0&&!(lx%10>=7)))return '#c9d6ee';return '#0d121e'}return '#1a2338'});
    const r=rng(tile?9:44);
    for(let bx=0;bx<3;bx++)for(let by=0;by<3;by++){
      const x=bx*10,y=by*10,h=4+Math.floor(r()*16)+(bx===1&&by===1?10:0);
      tower(S,x+1,y+1,0,5,5,h,{win:r()>.5?'#5ab8ff':'#8fdcff',top:r()>.6?'#38bdf8':null,wall:['#141e33','#18233b','#111a2c'][(r()*3)|0]});
    }
    car(S,22,7,-0,{body:'#e9eef8',livery:'#2f6bff',bar:true});
    for(const [x,y] of [[7,2],[17,24],[2,17],[27,27]])lamp(S,x,y,0,4);
    return S},
  race(){const S=new Vox();island(S,34,34,77,{depth:8,top:['#1a2338','#1c263e']});
    for(let x=0;x<34;x++)for(let y=0;y<34;y++){const d=Math.hypot((x-17)/14,(y-17)/11);if(d>.72&&d<1){S.set(x,y,-1,(Math.atan2(y-17,x-17)*8|0)%2&&d>.95?'#e9eef8':'#0d121e')}}
    car(S,26,12,0,{body:'#2f6bff',roof:'#1d4fd8'});car(S,10,26,0,{body:'#e9eef8',livery:'#38bdf8'});
    S.box(12,13,0,10,3,4,(lx,ly,lz)=>lz===3?'#2f6bff':(ly===0?'#26375c':'#1a2440'));
    for(let y=13;y<16;y++)for(let x=12;x<22;x+=2)S.set(x,y,4,'#38bdf8',true);return S},
  car(){const S=new Vox();S.box(-3,-3,-1,18,12,1,(lx,ly)=>(lx+ly)%2?'#141d31':'#111a2c');car(S,0,0,0,{body:'#e9eef8',livery:'#2f6bff',bar:true});return S},
  logo(){const S=new Vox();
    const V=['X.......X','X.......X','.X.....X.','.X.....X.','..X...X..','..X...X..','...X.X...','...X.X...','....X....'];
    V.forEach((row,r)=>[...row].forEach((ch,c)=>{if(ch==='X'){for(let d=0;d<3;d++)for(let t=0;t<2;t++)S.set(d,c*2+t,(8-r)*2+1,d===2?'#8fdcff':'#2f6bff',d===2);for(let d=0;d<3;d++)for(let t=0;t<2;t++)S.set(d,c*2+t,(8-r)*2,d===2?'#5ab8ff':'#1d4fd8',d===2)}}));
    S.box(-4,-3,-3,12,24,2,(lx,ly,lz)=>lz===1&&(lx+ly)%4===0?E('#2f6bff'):'#111a2c');
    for(const [x,y,z] of [[6,-2,14],[3,20,10],[8,18,20],[2,-4,6]])S.set(x,y,z,'#8fdcff',true);return S},
};

/* ---------- 2D UI art ---------- */
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const FONT=w=>`${w} 15px "Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif`;
function txt(g,t,x,y,size,col,w=700,mono){g.font=`${w} ${size}px ${mono?'"JetBrains Mono Variable", "JetBrains Mono", monospace':'"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'}`;g.fillStyle=col;g.fillText(t,x,y)}
const UI={
  tablet(g,W,H){
    g.save();g.translate(W/2,H/2);g.rotate(-.06);g.translate(-W/2,-H/2);
    const x=W*.1,y=H*.12,w=W*.8,h=H*.76;
    g.shadowColor='rgba(47,107,255,.5)';g.shadowBlur=60;rr(g,x,y,w,h,28);g.fillStyle='#070b15';g.fill();g.shadowBlur=0;
    g.lineWidth=3;g.strokeStyle='#26375c';g.stroke();
    const sx=x+16,sy=y+16,sw=w-32,sh=h-32;rr(g,sx,sy,sw,sh,16);g.fillStyle='#0b1222';g.fill();
    rr(g,sx,sy,sw*.2,sh,16);g.fillStyle='#0e1730';g.fill();
    txt(g,'LSPD',sx+20,sy+38,20,'#eef2ff',800);txt(g,'MDT 2.4',sx+20,sy+58,11,'#38bdf8',500,true);
    ['Kartoteka','Dispatch','Mandaty','BOLO','Kamery'].forEach((t,i)=>{if(i===1){rr(g,sx+10,sy+80+i*36,sw*.2-20,28,8);g.fillStyle='#1d3a7a';g.fill()}txt(g,t,sx+22,sy+99+i*36,13,i===1?'#fff':'#8590ad',600)});
    const cx=sx+sw*.2+20;txt(g,'Zgłoszenia na żywo',cx,sy+40,18,'#eef2ff',800);
    rr(g,cx+sw*.42,sy+20,120,28,8);g.fillStyle='rgba(52,211,153,.12)';g.fill();txt(g,'● 14 jednostek',cx+sw*.42+12,sy+39,12,'#34d399',600);
    const rows=[['10-31','Napad · Vinewood Blvd','#fb7185'],['10-50','Kolizja · Route 68','#fbbf24'],['10-16','Pościg · Del Perro','#fb7185'],['10-11','Kontrola · Legion Sq.','#38bdf8']];
    rows.forEach((r,i)=>{const ry=sy+64+i*52;rr(g,cx,ry,sw*.44,44,10);g.fillStyle='#101a2e';g.fill();rr(g,cx+10,ry+10,48,24,6);g.fillStyle=r[2]+'33';g.fill();txt(g,r[0],cx+16,ry+27,12,r[2],600,true);txt(g,r[1],cx+70,ry+27,13,'#c3cce4',600)});
    const mx=cx+sw*.46,my=sy+64,mw=sw*.3,mh=sh-84;rr(g,mx,my,mw,mh,12);g.fillStyle='#09101e';g.fill();g.save();rr(g,mx,my,mw,mh,12);g.clip();
    g.strokeStyle='#1d3a7a';g.lineWidth=5;for(let i=0;i<6;i++){g.beginPath();g.moveTo(mx-20+i*45,my);g.lineTo(mx+20+i*30,my+mh);g.stroke()}g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(mx,my+20+i*50);g.lineTo(mx+mw,my+40+i*40);g.stroke()}
    for(const [px,py,c] of [[.3,.3,'#fb7185'],[.7,.55,'#fbbf24'],[.45,.75,'#38bdf8']]){const gx=mx+mw*px,gy=my+mh*py;const gr=g.createRadialGradient(gx,gy,0,gx,gy,26);gr.addColorStop(0,c+'88');gr.addColorStop(1,c+'00');g.fillStyle=gr;g.fillRect(gx-26,gy-26,52,52);g.fillStyle=c;g.beginPath();g.arc(gx,gy,5,0,7);g.fill()}
    g.restore();g.restore()},
  hud(g,W,H){
    const cx=W*.62,cy=H*.56,R=H*.3;
    g.lineCap='round';g.lineWidth=18;g.strokeStyle='#121b30';g.beginPath();g.arc(cx,cy,R,Math.PI*.75,Math.PI*2.25);g.stroke();
    const gr=g.createLinearGradient(cx-R,0,cx+R,0);gr.addColorStop(0,'#2f6bff');gr.addColorStop(1,'#8fdcff');g.strokeStyle=gr;g.shadowColor='#38bdf8';g.shadowBlur=24;g.beginPath();g.arc(cx,cy,R,Math.PI*.75,Math.PI*(.75+1.5*.64));g.stroke();g.shadowBlur=0;
    g.lineWidth=2;g.strokeStyle='#26375c';for(let i=0;i<=12;i++){const a=Math.PI*.75+i/12*Math.PI*1.5;g.beginPath();g.moveTo(cx+Math.cos(a)*(R-26),cy+Math.sin(a)*(R-26));g.lineTo(cx+Math.cos(a)*(R-36),cy+Math.sin(a)*(R-36));g.stroke()}
    g.textAlign='center';txt(g,'128',cx,cy+14,64,'#eef2ff',800);txt(g,'KM/H',cx,cy+42,13,'#8590ad',500,true);txt(g,'D4',cx,cy+R*.75,16,'#38bdf8',700,true);g.textAlign='left';
    const st=[['#fb7185',.86],['#38bdf8',.62],['#fbbf24',.74],['#34d399',.45]];
    st.forEach(([c,v],i)=>{const x=W*.12,y=H*.3+i*58;g.lineWidth=6;g.strokeStyle='#121b30';g.beginPath();g.arc(x+22,y,20,0,7);g.stroke();g.strokeStyle=c;g.beginPath();g.arc(x+22,y,20,-Math.PI/2,-Math.PI/2+v*Math.PI*2);g.stroke();rr(g,x+56,y-6,110,12,6);g.fillStyle='#121b30';g.fill();rr(g,x+56,y-6,110*v,12,6);g.fillStyle=c;g.fill()});
    rr(g,W*.1,H*.12,170,34,10);g.fillStyle='rgba(16,26,46,.9)';g.fill();txt(g,'Vinewood Blvd · 14:32',W*.1+14,H*.12+22,12.5,'#c3cce4',600)},
  chat(g,W,H){
    const x=W*.08,y=H*.1,w=W*.84,h=H*.8;rr(g,x,y,w,h,18);g.fillStyle='#0b1120';g.fill();g.strokeStyle='#1c2944';g.lineWidth=2;g.stroke();
    rr(g,x,y,w*.24,h,18);g.fillStyle='#0e1628';g.fill();
    txt(g,'VELORIE RP',x+18,y+34,13,'#eef2ff',800);['# ogłoszenia','# tickety','# support','# logi-zakupów'].forEach((t,i)=>{if(i===1){rr(g,x+10,y+52+i*32,w*.24-20,26,7);g.fillStyle='#1b2a4c';g.fill()}txt(g,t,x+20,y+70+i*32,12.5,i===1?'#fff':'#8590ad',600)});
    const cx=x+w*.24+24;
    g.fillStyle='#2f6bff';g.beginPath();g.arc(cx+18,y+46,18,0,7);g.fill();txt(g,'V',cx+12,y+52,16,'#fff',800);
    txt(g,'Velorie Tickets',cx+46,y+42,14,'#eef2ff',800);rr(g,cx+168,y+30,32,16,4);g.fillStyle='#2f6bff';g.fill();txt(g,'BOT',cx+172,y+42,10,'#fff',700);
    const ex=cx+46,ey=y+58,ew=w*.62,eh=h*.6;rr(g,ex,ey,ew,eh,8);g.fillStyle='#101a2e';g.fill();g.fillStyle='#38bdf8';g.fillRect(ex,ey,4,eh);
    txt(g,'Ticket #0342 utworzony',ex+20,ey+32,16,'#eef2ff',800);txt(g,'Kategoria: Zakupy i licencje',ex+20,ey+56,12.5,'#8590ad',500);
    [['Użytkownik','@kacper'],['Priorytet','wysoki'],['Czas odpowiedzi','~ 4 min']].forEach(([a,b],i)=>{txt(g,a,ex+20+i*(ew/3-6),ey+92,11,'#56617f',600,true);txt(g,b,ex+20+i*(ew/3-6),ey+112,13,'#c3cce4',700)});
    rr(g,ex+20,ey+eh-50,110,34,8);g.fillStyle='#2f6bff';g.fill();txt(g,'Przejmij',ex+44,ey+eh-28,13,'#fff',700);
    rr(g,ex+140,ey+eh-50,110,34,8);g.fillStyle='#1c2944';g.fill();txt(g,'Zamknij',ex+168,ey+eh-28,13,'#c3cce4',700)},
  browser(g,W,H){
    const x=W*.08,y=H*.1,w=W*.84,h=H*.82;g.shadowColor='rgba(47,107,255,.4)';g.shadowBlur=50;rr(g,x,y,w,h,16);g.fillStyle='#070b15';g.fill();g.shadowBlur=0;g.strokeStyle='#1c2944';g.lineWidth=2;g.stroke();
    ['#fb7185','#fbbf24','#34d399'].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.arc(x+20+i*16,y+20,5,0,7);g.fill()});
    rr(g,x+w*.3,y+10,w*.4,22,7);g.fillStyle='#101a2e';g.fill();txt(g,'velorie.gg',x+w*.3+14,y+25,11.5,'#8590ad',500,true);
    const py=y+44;g.save();rr(g,x+1,py,w-2,h-45,0);g.clip();
    const gr=g.createRadialGradient(x+w*.7,py,10,x+w*.7,py,w*.6);gr.addColorStop(0,'rgba(47,107,255,.45)');gr.addColorStop(1,'rgba(47,107,255,0)');g.fillStyle=gr;g.fillRect(x,py,w,h);
    txt(g,'VELORIE',x+30,py+34,14,'#eef2ff',800);['Start','Sklep','Rankingi','Regulamin'].forEach((t,i)=>txt(g,t,x+w*.45+i*70,py+34,12,'#8590ad',600));
    txt(g,'Najlepszy serwer',x+30,py+100,32,'#eef2ff',800);txt(g,'BoxPvP w Polsce',x+30,py+138,32,'#5ab8ff',800);
    rr(g,x+30,py+160,150,26,13);g.fillStyle='rgba(52,211,153,.12)';g.fill();txt(g,'● 1 248 graczy online',x+42,py+178,12,'#34d399',600);
    rr(g,x+30,py+200,130,40,10);g.fillStyle='#2f6bff';g.fill();txt(g,'Dołącz teraz',x+52,py+225,13,'#fff',700);
    for(let i=0;i<3;i++){rr(g,x+w*.56+i*0,py+80+i*58,w*.36,48,10);g.fillStyle='#101a2e';g.fill();rr(g,x+w*.56+12,py+92+i*58,24,24,6);g.fillStyle=['#fbbf24','#c3cce4','#c08a14'][i];g.fill();txt(g,['Kacper_PvP','xMira','Oskar77'][i],x+w*.56+48,py+109+i*58,13,'#eef2ff',700);txt(g,[ '2 418 pkt','2 102 pkt','1 987 pkt'][i],x+w*.56+w*.36-80,py+109+i*58,12,'#8590ad',500,true)}
    g.restore()},
};

/* ---------- art composer ---------- */
const artCache={};
const PLAT_HUE={minecraft:'#2f6bff',fivem:'#38bdf8',other:'#5a7cff'};
function bg(g,W,H,accent,seed){
  const lg=g.createLinearGradient(0,0,W,H);lg.addColorStop(0,'#0a1020');lg.addColorStop(1,'#05080f');g.fillStyle=lg;g.fillRect(0,0,W,H);
  const r=rng(seed);const gx=W*(.35+r()*.3),gy=H*(.35+r()*.2);
  const rg=g.createRadialGradient(gx,gy,0,gx,gy,W*.55);rg.addColorStop(0,accent+'55');rg.addColorStop(.5,accent+'18');rg.addColorStop(1,accent+'00');g.fillStyle=rg;g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(143,220,255,.05)';g.lineWidth=1;
  for(let i=-20;i<40;i++){g.beginPath();g.moveTo(i*44,H);g.lineTo(i*44+H*1.15,0);g.stroke();g.beginPath();g.moveTo(i*44,H);g.lineTo(i*44-H*1.15,0);g.stroke()}
  g.fillStyle='rgba(143,220,255,.5)';for(let i=0;i<26;i++){const s=r()*1.6+.4;g.globalAlpha=r()*.6;g.fillRect(r()*W,r()*H,s,s)}g.globalAlpha=1;
}

/**
 * Renderuje grafikę produktu do data URL.
 * p: { id, art, plat, name?, version?, compat?, feats? }
 * v: wariant (0 główny, 1 lustrzany, 2 z opisem, 3 zbliżenie)
 */
export function art(p, v = 0, W = 800, H = 500) {
  const kind = (p && (p.art || p.id)) || 'cube';
  const key = (p.id || kind) + '|' + kind + '|' + v + '|' + W + 'x' + H;
  if (artCache[key]) return artCache[key];
  const plat = p.plat || 'minecraft';
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  bg(g, W, H, v === 1 ? '#5a7cff' : (PLAT_HUE[plat] || '#2f6bff'), h3(String(p.id || kind).length, v, W));
  if (UI[kind]) { UI[kind](g, W, H); }
  else {
    const make = MODELS[kind] || MODELS.shield;
    const S = make();
    const t = document.createElement('canvas'); t.width = W; t.height = H; const tg = t.getContext('2d');
    renderVox(tg, S, W, H, { pad: kind === 'hero' ? 20 : Math.min(W, H) * .13, dy: H * .02 });
    if (v === 1) { g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(t, 0, 0); g.restore(); }
    else if (v === 3) { g.drawImage(t, W * .18, H * .18, W * .64, H * .64, 0, 0, W, H); }
    else g.drawImage(t, 0, 0);
  }
  if (v === 2 && p.name) {
    const x = W * .06, y = H * .08, w = Math.min(300, W * .44), h = 150;
    rr(g, x, y, w, h, 14); g.fillStyle = 'rgba(7,11,21,.82)'; g.fill(); g.strokeStyle = 'rgba(82,135,255,.45)'; g.lineWidth = 1.5; g.stroke();
    txt(g, p.name, x + 18, y + 34, 17, '#eef2ff', 800);
    txt(g, 'v' + (p.version || '1.0') + ' · ' + (p.compat || ''), x + 18, y + 58, 12, '#8fdcff', 500, true);
    (p.feats || []).slice(0, 3).forEach((f, i) => { g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(x + 22, y + 84 + i * 22, 3, 0, 7); g.fill(); txt(g, f.length > 30 ? f.slice(0, 29) + '…' : f, x + 34, y + 88 + i * 22, 12.5, '#c3cce4', 600); });
  }
  const vg = g.createLinearGradient(0, H * .6, 0, H); vg.addColorStop(0, 'rgba(4,6,11,0)'); vg.addColorStop(1, 'rgba(4,6,11,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return artCache[key] = c.toDataURL('image/jpeg', .86);
}

export function clearArtCache() { for (const k in artCache) delete artCache[k]; }

/* Hero — identyczny render jak w oryginale (drawHero). */
let heroCache = null;
export function drawHeroCanvas(cv) {
  if (!cv || !cv.isConnected) return;
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (!W) return;
  if (!heroCache || heroCache.w !== W) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    renderVox(c.getContext('2d'), MODELS.hero(), W, H, { pad: W * .06, dy: H * .02, glowA: .12 });
    heroCache = { w: W, c };
  }
  cv.width = W; cv.height = H; cv.getContext('2d').drawImage(heroCache.c, 0, 0);
}

export const ART_KINDS = [...Object.keys(MODELS).filter(k => !['room', 'hero', 'fivemTile'].includes(k)), ...Object.keys(UI)];
