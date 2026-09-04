/* 現実的な ゆがみ（回転・たてよこの のび・大きさ・場所）で かたち判定を はかる */
const fs=require('fs'),path=require('path'),vm=require('vm');
const APP=process.argv[2]||'.';   // 使い方: node tools/measure-shape.js .
global.window=global;
global.localStorage={_d:{},getItem(k){return k in this._d?this._d[k]:null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}};
function fakeEl(){return{style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){},addEventListener(){},getContext(){return{fillRect(){},getImageData(){return{data:new Uint8ClampedArray(4)}},putImageData(){},createImageData(){return{data:new Uint8ClampedArray(4)}}}},toDataURL(){return'data:,'},children:[],width:0,height:0}}
global.document={createElement(){return fakeEl()},addEventListener(){},querySelectorAll(){return[]},getElementById(){return null},documentElement:fakeEl()};
['js/core/util.js','js/core/blocks.js','js/content/monsterart.js','js/content/monstergen.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(APP,f),'utf8'),{filename:f}));
const G=MQ.monsterGen, KINDS=Object.keys(G.bodies);
let seed=1; function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}

function deform(kind,N,opt){
  const g=G.kindMask(kind); if(!g) return null;
  const th=(rnd()-0.5)*2*opt.rot*Math.PI/180;          // 回転
  const ax=1+(rnd()-0.5)*2*opt.agl;                     // よこの のび
  const ay=1+(rnd()-0.5)*2*opt.agl;                     // たての のび
  const sc=(N/48)*(0.6+rnd()*0.3);
  const cx=N/2+(rnd()-0.5)*N*0.08, cy=N/2+(rnd()-0.5)*N*0.08;
  const co=Math.cos(-th), si=Math.sin(-th);
  const out=new Uint8Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    let dx=(x-cx)/sc, dy=(y-cy)/sc;
    let rx=dx*co-dy*si, ry=dx*si+dy*co;
    rx/=ax; ry/=ay;
    const sx=Math.round(rx+24), sy=Math.round(ry+24);
    if(sx<0||sy<0||sx>47||sy>47) continue;
    if(g[sy*48+sx]) out[y*N+x]=1;
  }
  let m=out;
  if(opt.line){                                         // りんかくだけ（線で かいた 絵）
    const o=new Uint8Array(N*N);
    for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){
      if(!out[y*N+x])continue;
      if(!out[(y-1)*N+x]||!out[(y+1)*N+x]||!out[y*N+x-1]||!out[y*N+x+1]) { o[y*N+x]=1;
        // 線の 太さ 2
        o[(y-1)*N+x]=o[(y+1)*N+x]=o[y*N+x-1]=o[y*N+x+1]=1; }
    }
    for(let x=0;x<N;x++){ if(out[x])o[x]=1; if(out[(N-1)*N+x])o[(N-1)*N+x]=1; }
    m=o;
  }
  for(let k=0;k<N*N;k++){ if(m[k]&&rnd()<opt.drop)m[k]=0; else if(!m[k]&&rnd()<opt.salt)m[k]=1; }
  const cells=new Array(N*N).fill(null);
  for(let k=0;k<N*N;k++) if(m[k]) cells[k]={ink:true,c:[40,40,48]};
  return cells;
}
function run(name,N,opt,reps){
  let n=0,t1=0,t3=0,t5=0,t12=0; const bad={};
  for(let r=0;r<reps;r++) KINDS.forEach(k=>{
    const c=deform(k,N,opt); if(!c) return;
    const res=G.matchKinds(c,N); const at=res.findIndex(x=>x.kind===k)+1;
    n++; if(at===1)t1++; if(at&&at<=3)t3++; if(at&&at<=5)t5++; if(at&&at<=12)t12++;
    if(!at||at>12) bad[k]=(bad[k]||0)+1;
  });
  const p=v=>Math.round(v/n*100)+'%';
  console.log(name+'  1番:'+p(t1)+' 3番まで:'+p(t3)+' 5番まで:'+p(t5)+' 12番まで:'+p(t12));
  const worst=Object.keys(bad).sort((a,b)=>bad[b]-bad[a]).slice(0,10);
  if(worst.length) console.log('   よく はずれる: '+worst.map(k=>k+'×'+bad[k]).join(' '));
}
const soft={rot:8,agl:0.12,drop:0.02,salt:0.001,line:false};
const hard={rot:15,agl:0.25,drop:0.05,salt:0.004,line:false};
const softline={rot:8,agl:0.12,drop:0.02,salt:0.001,line:true};
seed=11; run('ゆがみ 小・ぬり  ',64,soft,3);
seed=22; run('ゆがみ 大・ぬり  ',64,hard,3);
seed=33; run('ゆがみ 小・線だけ',64,softline,3);
