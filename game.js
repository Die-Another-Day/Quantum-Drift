/* ═══════════════════════════════════════════════════════════════
   QUANTUM DRIFT  //  ARCADE LAB
   A dimensional racing experience — complete game engine
   Pseudo-3D lane runner · Web Audio synth · Quantum state machine
═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
document.getElementById('overload').classList.add('hidden');
document.getElementById('sf').classList.add('hidden');
let W, H, HORIZON_Y, PLAYER_Y, TRACK_HALF;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  HORIZON_Y  = H * 0.40;
  PLAYER_Y   = H * 0.83;
  TRACK_HALF = W * 0.355;
}
window.addEventListener('resize', resize);
resize();

/* ── CONSTANTS ── */
const LANES=3, LANE_LERP=8, TILT_MAX=18, SECTOR_SECS=28;
const BASE_SPD=300, SPD_PER_SECTOR=85, MAX_SPD=1800;
const SHIFT_MS=290, SHIFT_COOL_MS=700, SHIELD_COST=40, SHIELD_MS=3200;
const OVERLOAD_MULTI=10, OVERLOAD_MS=5000;

/* ── QUANTUM STATES ── */
const QS=[
  {name:'ALPHA',col:'#00F5FF',rgb:[0,245,255],  dark:'#001428',tint:'rgba(0,245,255,0.016)'},
  {name:'BETA', col:'#7A5CFF',rgb:[122,92,255], dark:'#0D0A1E',tint:'rgba(122,92,255,0.016)'},
  {name:'GAMMA',col:'#FF2DA6',rgb:[255,45,166], dark:'#1A0510',tint:'rgba(255,45,166,0.016)'},
];
function qr(qi,a){const r=QS[qi].rgb;return `rgba(${r[0]},${r[1]},${r[2]},${a})`;}

/* ── AUDIO ── */
let AC,masterGain,engOsc,engGain,ambOsc,ambGain,audioOK=false;
function initAudio(){
  if(AC)return;
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=AC.createGain();masterGain.gain.value=0.42;masterGain.connect(AC.destination);
    engOsc=AC.createOscillator();engOsc.type='sawtooth';engOsc.frequency.value=55;
    engGain=AC.createGain();engGain.gain.value=0;
    const ef=AC.createBiquadFilter();ef.type='bandpass';ef.frequency.value=280;ef.Q.value=2.5;
    engOsc.connect(ef);ef.connect(engGain);engGain.connect(masterGain);engOsc.start();
    ambOsc=AC.createOscillator();ambOsc.type='sine';ambOsc.frequency.value=48;
    ambGain=AC.createGain();ambGain.gain.value=0.1;
    const af=AC.createBiquadFilter();af.type='lowpass';af.frequency.value=180;
    ambOsc.connect(af);af.connect(ambGain);ambGain.connect(masterGain);ambOsc.start();
    audioOK=true;
  }catch(e){console.warn('Audio unavailable');}
}
function updateAudio(spd){
  if(!audioOK)return;
  const t=spd/MAX_SPD,now=AC.currentTime;
  engOsc.frequency.linearRampToValueAtTime(55+t*190,now+0.1);
  engGain.gain.linearRampToValueAtTime(0.04+t*0.20,now+0.1);
  ambOsc.frequency.linearRampToValueAtTime(48+t*28,now+0.3);
}
function stopEng(){if(!audioOK)return;engGain.gain.linearRampToValueAtTime(0,AC.currentTime+0.9);}
function sfx(type){
  if(!audioOK)return;
  const now=AC.currentTime;
  const o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(masterGain);
  const P={
    shift:   ['sine',    [200,880], 0.24,0.26],
    pickup:  ['sine',    [440,1100],0.16,0.20],
    hit:     ['square',  [160,28],  0.32,0.38],
    nearmiss:['sine',    [360,110], 0.14,0.20],
    shield:  ['triangle',[660,330], 0.22,0.38],
    shieldhit:['square', [800,180], 0.18,0.22],
    sector:  ['sawtooth',[200,660], 0.28,0.55],
    overload:['sawtooth',[330,1760],0.30,0.50],
    gameover:['sawtooth',[440,44],  0.30,1.80],
  };
  const [tp,fr,vol,dur]=P[type]||['sine',[440,440],0.1,0.2];
  o.type=tp;
  o.frequency.setValueAtTime(fr[0],now);
  o.frequency.exponentialRampToValueAtTime(Math.max(1,fr[1]),now+dur);
  g.gain.setValueAtTime(vol,now);
  g.gain.exponentialRampToValueAtTime(0.001,now+dur+0.04);
  o.start(now);o.stop(now+dur+0.08);
  if(type==='sector'||type==='overload'){
    const o2=AC.createOscillator(),g2=AC.createGain();
    o2.connect(g2);g2.connect(masterGain);o2.type='sine';
    o2.frequency.setValueAtTime(fr[0]*1.5,now);
    o2.frequency.exponentialRampToValueAtTime(Math.max(1,fr[1]*1.5),now+dur);
    g2.gain.setValueAtTime(vol*0.5,now);g2.gain.exponentialRampToValueAtTime(0.001,now+dur+0.04);
    o2.start(now);o2.stop(now+dur+0.08);
  }
}

/* ── STARS ── */
let stars=[];
function initStars(){
  stars=Array.from({length:200},()=>({
    x:Math.random(),y:Math.random(),sz:Math.random()*1.8+0.2,
    op:Math.random()*0.65+0.15,tw:Math.random()*Math.PI*2,
    ts:Math.random()*2.5+0.5,px:Math.random()*0.3+0.05,
  }));
}
function drawStars(dt,cv){
  for(const s of stars){
    s.tw+=s.ts*dt;
    const a=s.op*(0.6+0.4*Math.sin(s.tw));
    const sx=((s.x+cv*s.px*0.0018)%1+1)%1;
    ctx.fillStyle=`rgba(200,220,255,${a})`;
    ctx.beginPath();ctx.arc(sx*W,s.y*HORIZON_Y,s.sz,0,Math.PI*2);ctx.fill();
  }
}

/* ── GAME STATE ── */
let STATE='MENU';
let score,highScore,multi,sector,sectorTimer,speed,trackScroll;
let camCurve,camPhase,shakeX,shakeY,shakeMag,flashA,flashCol,obsTimer;
let obstacles,particles,floats,speedLines,nmTrack,player;

function makePlayer(){
  return{lane:1,targetLane:1,screenX:0,tilt:0,qi:0,
    shifting:false,shiftTo:0,shiftMs:0,coolMs:0,
    energy:100,charge:0,shielded:false,shieldMs:0,
    invincible:false,invMs:0,overload:false,olMs:0,
    drifting:false,driftT:0,trail:[]};
}
function resetAll(){
  player=makePlayer();
  score=0;highScore=parseInt(localStorage.getItem('qd_hs')||'0');
  multi=1;sector=1;sectorTimer=0;speed=BASE_SPD;trackScroll=0;
  camCurve=0;camPhase=0;shakeX=shakeY=shakeMag=0;
  flashA=0;flashCol='#00F5FF';obsTimer=0;
  obstacles=[];particles=[];floats=[];speedLines=[];nmTrack=new Set();
}

/* ── INPUT ── */
const K={},KP={};
window.addEventListener('keydown',e=>{K[e.code]=true;});
window.addEventListener('keyup',e=>{K[e.code]=false;});
function jp(c){return K[c]&&!KP[c];}
function syncKP(){Object.assign(KP,K);}
let tSX=null;
canvas.addEventListener('touchstart',e=>{tSX=e.touches[0].clientX;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  if(tSX===null)return;
  const dx=e.changedTouches[0].clientX-tSX;
  if(Math.abs(dx)>32&&player){
    if(dx<0&&player.targetLane>0)player.targetLane--;
    if(dx>0&&player.targetLane<2)player.targetLane++;
  }
  tSX=null;
},{passive:false});

/* ── PROJECTION ── */
function depthY(t){return HORIZON_Y+t*(PLAYER_Y-HORIZON_Y);}
function depthW(t){return t*TRACK_HALF;}
function cvShift(t){return camCurve*(1-t*0.42);}
function laneX(lane,t){
  const f=((lane/(LANES-1))-0.5)*2;
  return W/2+cvShift(t)+f*depthW(t);
}

/* ── BACKGROUND ── */
function drawBg(){
  const qi=player?player.qi:0;
  const g=ctx.createLinearGradient(0,0,0,HORIZON_Y);
  g.addColorStop(0,'#020208');g.addColorStop(0.75,QS[qi].dark);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,HORIZON_Y);
  const hg=ctx.createLinearGradient(0,HORIZON_Y-80,0,HORIZON_Y+25);
  hg.addColorStop(0,'transparent');hg.addColorStop(0.5,qr(qi,0.13));hg.addColorStop(1,'transparent');
  ctx.fillStyle=hg;ctx.fillRect(0,HORIZON_Y-80,W,105);
  ctx.fillStyle='#030314';ctx.fillRect(0,HORIZON_Y,W,14);
}
function drawCity(cv){
  const qi=player?player.qi:0,BY=HORIZON_Y;
  const BLD=[[0.04,0.055,52],[0.10,0.028,36],[0.14,0.06,72],[0.22,0.022,40],
    [0.26,0.068,88],[0.35,0.022,32],[0.60,0.028,46],[0.65,0.068,76],
    [0.73,0.022,58],[0.78,0.048,68],[0.85,0.022,30],[0.88,0.052,52],[0.94,0.048,62]];
  for(const[xf,wf,h]of BLD){
    const bx=xf*W+cv*0.08;
    ctx.fillStyle=qr(qi,0.04);ctx.fillRect(bx,BY-h,wf*W,h);
    ctx.fillStyle=qr(qi,0.09);
    for(let wy=BY-h+5;wy<BY-4;wy+=8)
      for(let wx=bx+3;wx<bx+wf*W-3;wx+=7)
        if(Math.random()<0.35)ctx.fillRect(wx,wy,2,3);
  }
}

/* ── TRACK ── */
function drawTrack(){
  const qi=player?player.qi:0;
  const STRIPS=Math.ceil((PLAYER_Y-HORIZON_Y)/6);
  for(let i=0;i<STRIPS;i++){
    const t1=i/STRIPS,t2=(i+1)/STRIPS;
    const y1=depthY(t1),y2=depthY(t2);
    const w1=depthW(t1),w2=depthW(t2);
    const cx1=W/2+cvShift(t1),cx2=W/2+cvShift(t2);
    const seg=Math.floor((t1+trackScroll*0.28)*11)%2;
    ctx.beginPath();
    ctx.moveTo(cx1-w1,y1);ctx.lineTo(cx1+w1,y1);
    ctx.lineTo(cx2+w2,y2);ctx.lineTo(cx2-w2,y2);ctx.closePath();
    ctx.fillStyle=seg===0?'#04041A':'#07072A';ctx.fill();
    ctx.fillStyle=QS[qi].tint;ctx.fill();
    const cw1=w1*0.075,cw2=w2*0.075;
    const cc=seg===0?qr(qi,0.38):'rgba(255,255,255,0.06)';
    ctx.beginPath();ctx.moveTo(cx1-w1,y1);ctx.lineTo(cx1-w1+cw1,y1);
    ctx.lineTo(cx2-w2+cw2,y2);ctx.lineTo(cx2-w2,y2);ctx.closePath();ctx.fillStyle=cc;ctx.fill();
    ctx.beginPath();ctx.moveTo(cx1+w1-cw1,y1);ctx.lineTo(cx1+w1,y1);
    ctx.lineTo(cx2+w2,y2);ctx.lineTo(cx2+w2-cw2,y2);ctx.closePath();ctx.fill();
  }
  for(let ln=1;ln<LANES;ln++){
    const lf=(ln/LANES-0.5)*2,DASHES=16;
    for(let d=0;d<DASHES;d++){
      const a=(d+trackScroll*1.6)/DASHES%1,b=(d+0.44+trackScroll*1.6)/DASHES%1;
      if(a>=b)continue;
      ctx.strokeStyle=qr(qi,a*0.22+0.05);ctx.lineWidth=0.5+b*2;
      ctx.beginPath();ctx.moveTo(W/2+cvShift(a)+lf*depthW(a),depthY(a));
      ctx.lineTo(W/2+cvShift(b)+lf*depthW(b),depthY(b));ctx.stroke();
    }
  }
  for(const s of[-1,1]){
    const rg=ctx.createLinearGradient(0,HORIZON_Y,0,PLAYER_Y);
    rg.addColorStop(0,qr(qi,0));rg.addColorStop(1,qr(qi,0.55));
    ctx.strokeStyle=rg;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(W/2+camCurve,HORIZON_Y);ctx.lineTo(W/2+s*TRACK_HALF,PLAYER_Y);ctx.stroke();
    ctx.lineWidth=9;ctx.strokeStyle=qr(qi,0.06);
    ctx.beginPath();ctx.moveTo(W/2+camCurve,HORIZON_Y);ctx.lineTo(W/2+s*TRACK_HALF,PLAYER_Y);ctx.stroke();
  }
  ctx.setLineDash([8,14]);
  const cl=ctx.createLinearGradient(0,HORIZON_Y,0,PLAYER_Y);
  cl.addColorStop(0,'transparent');cl.addColorStop(1,qr(qi,0.1));
  ctx.strokeStyle=cl;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W/2+camCurve,HORIZON_Y);ctx.lineTo(W/2,PLAYER_Y);ctx.stroke();
  ctx.setLineDash([]);
}

/* ── OBSTACLE TYPES ── */
const OT=[
  {shape:'gate', qs:0,pk:false,wR:0.30,hR:0.07,pts:0},{shape:'gate', qs:1,pk:false,wR:0.30,hR:0.07,pts:0},
  {shape:'gate', qs:2,pk:false,wR:0.30,hR:0.07,pts:0},{shape:'spike',qs:0,pk:false,wR:0.22,hR:0.10,pts:0},
  {shape:'spike',qs:1,pk:false,wR:0.22,hR:0.10,pts:0},{shape:'spike',qs:2,pk:false,wR:0.22,hR:0.10,pts:0},
  {shape:'cube', qs:-1,pk:false,wR:0.26,hR:0.09,pts:0},
  {shape:'orb',  qs:0,pk:true, wR:0.10,hR:0.10,pts:150},{shape:'orb',qs:1,pk:true,wR:0.10,hR:0.10,pts:150},
  {shape:'orb',  qs:2,pk:true, wR:0.10,hR:0.10,pts:150},
  {shape:'wall', qs:0,pk:false,wR:0.58,hR:0.06,pts:0},{shape:'wall',qs:1,pk:false,wR:0.58,hR:0.06,pts:0},
  {shape:'wall', qs:2,pk:false,wR:0.58,hR:0.06,pts:0},
];
function spawnInterval(){return Math.max(0.32,1.95-(sector-1)*0.16+Math.random()*0.28);}
function spawnWave(){
  const r=Math.random(),qi=player.qi;
  let ti,lane;
  if(r<0.20){ti=7+(Math.random()<0.55?qi:Math.floor(Math.random()*3));lane=Math.floor(Math.random()*LANES);}
  else if(sector>=3&&r<0.28){ti=6;lane=Math.floor(Math.random()*LANES);}
  else if(sector>=5&&r<0.38){ti=10+Math.floor(Math.random()*3);lane=1;}
  else{const qs=Math.floor(Math.random()*3);ti=(r<0.6?0:3)+qs;lane=Math.floor(Math.random()*LANES);}
  const ob={id:Math.random()*1e9|0,ot:OT[ti],lane,z:0.01,passed:false,alive:true,ap:Math.random()*Math.PI*2};
  obstacles.push(ob);
  if(sector>=3&&Math.random()<0.25){
    const el=(lane+1+Math.floor(Math.random()*2))%LANES;
    const eqs=Math.floor(Math.random()*3);
    obstacles.push({id:ob.id+1,ot:OT[7+eqs],lane:el,z:0.01,passed:false,alive:true,ap:Math.random()*Math.PI*2});
  }
}
function isGhost(ob){
  if(player.shielded||player.overload)return true;
  if(ob.ot.qs===-1)return false;
  if(ob.ot.pk)return false;
  if(player.shifting&&player.shiftMs>80)return true;
  return ob.ot.qs!==player.qi;
}
function obX(ob){return laneX(ob.lane,ob.z);}
function obY(ob){return depthY(ob.z);}

function updateObstacles(dt){
  obsTimer-=dt;
  if(obsTimer<=0&&STATE==='PLAYING'){spawnWave();obsTimer=spawnInterval();}
  for(let i=obstacles.length-1;i>=0;i--){
    const ob=obstacles[i];
    if(!ob.alive){obstacles.splice(i,1);continue;}
    ob.z+=dt*speed*0.00088;ob.ap+=dt*(1.8+ob.z*2.2);
    if(ob.z>1.06){
      if(!ob.passed&&!ob.ot.pk&&!nmTrack.has(ob.id)&&Math.abs(ob.lane-player.lane)===1&&!isGhost(ob))doNearMiss(ob);
      obstacles.splice(i,1);continue;
    }
    if(ob.z>0.70&&!ob.passed){
      const ghost=isGhost(ob);
      if(!ghost&&!player.invincible){
        const hit=(ob.lane===player.lane)||(player.lane!==player.targetLane&&ob.lane===player.targetLane&&ob.z>0.80);
        if(hit){doCollision(ob);ob.passed=true;continue;}
      }
      if(ob.ot.pk&&ob.lane===player.lane&&ob.z>0.74){doPickup(ob);ob.alive=false;ob.passed=true;continue;}
      if(!nmTrack.has(ob.id)&&!ghost&&!ob.ot.pk&&ob.z>0.77&&ob.z<0.88&&Math.abs(ob.lane-player.lane)===1){
        doNearMiss(ob);nmTrack.add(ob.id);
      }
      if(ob.z>0.87)ob.passed=true;
    }
  }
}
function doCollision(ob){
  if(player.shielded){sfx('shieldhit');burst(obX(ob),obY(ob),QS[player.qi].col,10);return;}
  player.energy=Math.max(0,player.energy-(20+sector*1.4));
  player.invincible=true;player.invMs=1500;
  multi=1;shakeMag=22;flashA=0.55;flashCol='#FF2020';
  sfx('hit');burst(obX(ob),obY(ob),'#FF4400',20);addFloat('COLLISION!',ob.lane,ob.z,'#FF4444');
  if(player.energy<=0){player.energy=0;setTimeout(doGameOver,350);}
}
function doPickup(ob){
  const same=ob.ot.qs===player.qi;
  const pts=(same?200:75)*Math.round(multi);
  score+=pts;
  if(same){player.energy=Math.min(100,player.energy+10);player.charge=Math.min(100,player.charge+10);multi=Math.min(OVERLOAD_MULTI,multi+0.5);}
  else{player.charge=Math.min(100,player.charge+4);}
  sfx('pickup');pickupBurst(obX(ob),obY(ob),QS[ob.ot.qs>=0?ob.ot.qs:player.qi].col);
  addFloat(`+${pts}`,ob.lane,ob.z,QS[ob.ot.qs>=0?ob.ot.qs:player.qi].col);
  if(multi>=OVERLOAD_MULTI&&!player.overload)triggerOverload();
}
function doNearMiss(ob){
  const bonus=Math.round(80*multi);score+=bonus;multi=Math.min(OVERLOAD_MULTI,multi+0.3);
  player.charge=Math.min(100,player.charge+7);sfx('nearmiss');addFloat('QUANTUM SLIP!',ob.lane,0.83,'#C7FF4D');
}

/* ── OBSTACLE RENDERING ── */
function drawObstacles(){
  const sorted=obstacles.filter(o=>o.z>0.02).sort((a,b)=>a.z-b.z);
  for(const ob of sorted){
    const t=ob.z,sx=laneX(ob.lane,t),sy=depthY(t),sc=0.07+t*0.93;
    const bw=ob.ot.wR*TRACK_HALF*sc,bh=ob.ot.hR*H*sc;
    const ghost=isGhost(ob),qi=ob.ot.qs>=0?ob.ot.qs:-1;
    const col=qi>=0?QS[qi].col:'#FF8800',rgb=qi>=0?QS[qi].rgb:[255,136,0];
    const ra=(a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    ctx.save();ctx.translate(sx,sy);
    if(ghost)ctx.globalAlpha=0.14+0.05*Math.sin(ob.ap*2.4);
    if(ob.ot.shape==='gate'||ob.ot.shape==='wall')rGate(0,0,bw,bh,col,ra,ghost);
    else if(ob.ot.shape==='spike')rSpike(0,0,bw,bh,col,ra,ghost,ob.ap);
    else if(ob.ot.shape==='cube')rCube(0,0,bw,bh,ob.ap);
    else if(ob.ot.shape==='orb')rOrb(0,0,bw*0.52,col,ra,ob.ap);
    ctx.restore();
  }
}
function rGate(x,y,w,h,col,ra,ghost){
  ctx.shadowColor=col;ctx.shadowBlur=ghost?4:20;
  ctx.fillStyle=ra(ghost?0.09:0.42);ctx.fillRect(x-w/2,y-h/2,w,h);
  ctx.strokeStyle=ra(ghost?0.22:0.88);ctx.lineWidth=1.5;ctx.strokeRect(x-w/2,y-h/2,w,h);
  if(!ghost){
    for(let s=0;s<6;s++)if(s%2===0){ctx.fillStyle=ra(0.11);ctx.fillRect(x-w/2+s*w/6,y-h/2,w/6,h);}
    const cl=7,cors=[[-w/2,-h/2],[w/2,-h/2],[-w/2,h/2],[w/2,h/2]];
    ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=1;
    for(const[cx,cy]of cors){
      const sx=Math.sign(cx),sy=Math.sign(cy);
      ctx.beginPath();ctx.moveTo(x+cx,y+cy+sy*cl);ctx.lineTo(x+cx,y+cy);ctx.lineTo(x+cx+sx*cl,y+cy);ctx.stroke();
    }
  }
  ctx.shadowBlur=0;
}
function rSpike(x,y,w,h,col,ra,ghost,ap){
  const pulse=1+(ghost?0:Math.sin(ap*2)*0.09),pw=w*pulse,ph=h*pulse;
  ctx.shadowColor=col;ctx.shadowBlur=ghost?4:22;
  ctx.beginPath();ctx.moveTo(x,y-ph*0.54);ctx.lineTo(x+pw*0.5,y+ph*0.1);
  ctx.lineTo(x+pw*0.24,y+ph*0.54);ctx.lineTo(x-pw*0.24,y+ph*0.54);ctx.lineTo(x-pw*0.5,y+ph*0.1);ctx.closePath();
  const g=ctx.createRadialGradient(x,y,0,x,y,pw*0.5);
  g.addColorStop(0,ghost?ra(0.14):'rgba(255,255,255,0.8)');
  g.addColorStop(0.4,ra(ghost?0.07:0.55));g.addColorStop(1,ra(ghost?0.02:0.12));
  ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=ra(ghost?0.22:0.9);ctx.lineWidth=1.5;ctx.stroke();
  if(!ghost&&sector>=4){
    ctx.strokeStyle=ra(0.28);ctx.lineWidth=1;
    for(let i=0;i<4;i++){const a=i*Math.PI/2+ap*0.55;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*pw*0.72,y+Math.sin(a)*ph*0.72);ctx.stroke();}
  }
  ctx.shadowBlur=0;
}
function rCube(x,y,w,h,ap){
  const col='#FF8800',rgb=[255,136,0],ra=(a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`,d=w*0.26;
  ctx.shadowColor=col;ctx.shadowBlur=24;
  ctx.fillStyle=ra(0.5);ctx.fillRect(x-w/2,y-h/2,w,h);
  ctx.strokeStyle=ra(0.9);ctx.lineWidth=1.5;ctx.strokeRect(x-w/2,y-h/2,w,h);
  ctx.beginPath();ctx.moveTo(x-w/2,y-h/2);ctx.lineTo(x-w/2+d,y-h/2-d*0.5);ctx.lineTo(x+w/2+d,y-h/2-d*0.5);ctx.lineTo(x+w/2,y-h/2);ctx.closePath();
  ctx.fillStyle=ra(0.32);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+w/2,y-h/2);ctx.lineTo(x+w/2+d,y-h/2-d*0.5);ctx.lineTo(x+w/2+d,y+h/2-d*0.5);ctx.lineTo(x+w/2,y+h/2);ctx.closePath();
  ctx.fillStyle=ra(0.20);ctx.fill();ctx.stroke();
  const cr=w*0.14*(1+Math.sin(ap*3)*0.22),cg=ctx.createRadialGradient(x,y,0,x,y,cr);
  cg.addColorStop(0,'white');cg.addColorStop(0.4,ra(0.95));cg.addColorStop(1,'transparent');
  ctx.fillStyle=cg;ctx.beginPath();ctx.arc(x,y,cr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}
function rOrb(x,y,r,col,ra,ap){
  const fy=Math.sin(ap*1.5)*r*0.42,py=y+fy;
  const aura=ctx.createRadialGradient(x,py,0,x,py,r*2.7);
  aura.addColorStop(0,ra(0.32));aura.addColorStop(0.5,ra(0.1));aura.addColorStop(1,'transparent');
  ctx.fillStyle=aura;ctx.beginPath();ctx.arc(x,py,r*2.7,0,Math.PI*2);ctx.fill();
  const core=ctx.createRadialGradient(x-r*0.28,py-r*0.28,0,x,py,r);
  core.addColorStop(0,'white');core.addColorStop(0.25,col);core.addColorStop(1,ra(0.18));
  ctx.fillStyle=core;ctx.shadowColor=col;ctx.shadowBlur=20;
  ctx.beginPath();ctx.arc(x,py,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.save();ctx.translate(x,py);ctx.rotate(ap*1.25);
  ctx.strokeStyle=ra(0.52);ctx.lineWidth=1.2;
  ctx.beginPath();ctx.ellipse(0,0,r*1.55,r*0.48,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}

/* ── PLAYER ── */
function updatePlayer(dt){
  const tx=laneX(player.targetLane,1.0);
  player.screenX+=(tx-player.screenX)*dt*LANE_LERP;
  if(Math.abs(player.screenX-tx)<2)player.lane=player.targetLane;
  const tiltTarget=(player.targetLane-player.lane)*TILT_MAX;
  player.tilt+=(tiltTarget-player.tilt)*dt*7;
  if(player.shiftMs>0){
    player.shiftMs-=dt*1000;
    if(player.shiftMs<=0){player.shifting=false;player.qi=player.shiftTo;flashA=0.38;flashCol=QS[player.qi].col;}
  }
  if(player.coolMs>0)player.coolMs-=dt*1000;
  if(player.shielded){player.shieldMs-=dt*1000;if(player.shieldMs<=0){player.shielded=false;addFloat('SHIELD DOWN',player.lane,0.82,'#FF8800');}}
  if(player.invincible){player.invMs-=dt*1000;if(player.invMs<=0)player.invincible=false;}
  if(player.overload){player.olMs-=dt*1000;if(player.olMs<=0){player.overload=false;multi=Math.max(1,multi*0.5);addFloat('OVERLOAD END',player.lane,0.82,'#FF8800');}}
  if(player.drifting){player.driftT+=dt;if(player.driftT>0.22)player.charge=Math.min(100,player.charge+dt*13);}
  player.trail.push({x:player.screenX,y:PLAYER_Y-H*0.054,t:Date.now(),qi:player.qi});
  if(player.trail.length>50)player.trail.shift();
}
function drawPlayer(){
  const x=player.screenX,y=PLAYER_Y-H*0.054,qi=player.qi,col=QS[qi].col,rgb=QS[qi].rgb;
  const ra=(a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`,sw=TRACK_HALF*0.172,sh=H*0.057,now=Date.now();
  for(const tp of player.trail){
    const age=(now-tp.t)/520;if(age>1)continue;
    const tr=QS[tp.qi].rgb;
    ctx.fillStyle=`rgba(${tr[0]},${tr[1]},${tr[2]},${(1-age)*0.38})`;
    ctx.beginPath();ctx.arc(tp.x,tp.y,sw*0.18*(1-age),0,Math.PI*2);ctx.fill();
  }
  if(player.invincible&&Math.floor(now/88)%2===0)return;
  if(player.shielded){
    const sp=now*0.0026;
    ctx.strokeStyle=ra(0.72);ctx.lineWidth=2;ctx.shadowColor=col;ctx.shadowBlur=28;
    ctx.beginPath();ctx.arc(x,y,sw*1.75+Math.sin(sp)*4,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<3;i++){const a=sp+i*Math.PI*2/3;ctx.fillStyle=ra(0.28);ctx.beginPath();ctx.arc(x+Math.cos(a)*sw*1.75,y+Math.sin(a)*sw*1.75,3,0,Math.PI*2);ctx.fill();}
    ctx.shadowBlur=0;
  }
  if(player.overload){
    const og=ctx.createRadialGradient(x,y,0,x,y,sw*2.6);
    og.addColorStop(0,'rgba(199,255,77,0.22)');og.addColorStop(1,'transparent');
    ctx.fillStyle=og;ctx.beginPath();ctx.arc(x,y,sw*2.6,0,Math.PI*2);ctx.fill();
  }
  if(player.shifting){
    const off=(player.shiftMs/SHIFT_MS)*15;
    ctx.save();ctx.globalAlpha=0.20;
    ctx.fillStyle='#FF0055';drawHull(x-off,y,sw,sh,0);
    ctx.fillStyle='#00FFFF';drawHull(x+off,y,sw,sh,0);ctx.restore();
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(player.tilt*Math.PI/180);
  const fh=sh*(0.38+Math.random()*0.22);
  const fg=ctx.createLinearGradient(0,sh*0.28,0,sh*0.28+fh);
  fg.addColorStop(0,'white');fg.addColorStop(0.3,col);fg.addColorStop(1,'transparent');
  ctx.fillStyle=fg;ctx.beginPath();ctx.ellipse(0,sh*0.28,sw*0.09,fh,0,0,Math.PI*2);ctx.fill();
  for(const xs of[-sw*0.3,sw*0.3]){
    const sfg=ctx.createLinearGradient(0,sh*0.24,0,sh*0.24+fh*0.6);
    sfg.addColorStop(0,col);sfg.addColorStop(1,'transparent');
    ctx.fillStyle=sfg;ctx.beginPath();ctx.ellipse(xs,sh*0.24,sw*0.052,fh*0.6,0,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowColor=col;ctx.shadowBlur=24;
  ctx.beginPath();
  ctx.moveTo(0,-sh*0.57);ctx.lineTo(sw*0.47,sh*0.18);ctx.lineTo(sw*0.22,sh*0.08);
  ctx.lineTo(sw*0.10,sh*0.38);ctx.lineTo(-sw*0.10,sh*0.38);ctx.lineTo(-sw*0.22,sh*0.08);
  ctx.lineTo(-sw*0.47,sh*0.18);ctx.closePath();
  const hg=ctx.createLinearGradient(0,-sh*0.57,0,sh*0.38);
  hg.addColorStop(0,'#FFFFFF');hg.addColorStop(0.22,col);hg.addColorStop(0.7,ra(0.6));hg.addColorStop(1,QS[qi].dark);
  ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle=ra(0.45);ctx.lineWidth=0.8;ctx.stroke();
  ctx.strokeStyle=ra(0.7);ctx.lineWidth=0.8;
  [[0,-sh*0.33,sw*0.38,sh*0.14],[0,-sh*0.33,-sw*0.38,sh*0.14],[0,-sh*0.1,0,sh*0.34]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  });
  ctx.beginPath();ctx.ellipse(0,-sh*0.12,sw*0.11,sh*0.20,0,0,Math.PI*2);
  ctx.fillStyle='rgba(155,230,255,0.45)';ctx.fill();ctx.strokeStyle='rgba(200,245,255,0.8)';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.ellipse(-sw*0.03,-sh*0.17,sw*0.04,sh*0.06,-0.3,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fill();
  ctx.shadowBlur=0;ctx.restore();
}
function drawHull(x,y,sw,sh){
  ctx.save();ctx.translate(x,y);ctx.beginPath();
  ctx.moveTo(0,-sh*0.57);ctx.lineTo(sw*0.47,sh*0.18);ctx.lineTo(sw*0.22,sh*0.08);
  ctx.lineTo(sw*0.10,sh*0.38);ctx.lineTo(-sw*0.10,sh*0.38);ctx.lineTo(-sw*0.22,sh*0.08);
  ctx.lineTo(-sw*0.47,sh*0.18);ctx.closePath();ctx.fill();ctx.restore();
}

/* ── PARTICLES ── */
function burst(x,y,col,n=12){
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,spd=Math.random()*230+55;
    particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:0.45+Math.random()*0.5,max:1,col,sz:Math.random()*5+2});}
}
function pickupBurst(x,y,col){
  for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2;
    particles.push({x,y,vx:Math.cos(a)*105,vy:Math.sin(a)*105,life:0.5,max:0.5,col,sz:3});}
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.vx*=0.97;p.life-=dt;
    if(p.life<=0)particles.splice(i,1);
  }
}
function drawParticles(){
  ctx.save();
  for(const p of particles){
    const a=Math.max(0,p.life/p.max);
    ctx.globalAlpha=a;ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(p.x,p.y,p.sz*a,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();
}

/* ── SPEED LINES ── */
function updateSpeedLines(dt){
  const den=Math.min(45,Math.floor((speed/MAX_SPD)*65));
  while(speedLines.length<den)speedLines.push({angle:Math.random()*Math.PI*2,r:Math.min(W,H)*(0.14+Math.random()*0.46),len:38+Math.random()*125,spd:290+Math.random()*420,life:1});
  for(let i=speedLines.length-1;i>=0;i--){const sl=speedLines[i];sl.r-=sl.spd*dt;sl.life-=dt*1.9;if(sl.r<8||sl.life<=0)speedLines.splice(i,1);}
}
function drawSpeedLines(){
  const t=speed/MAX_SPD;if(t<0.07)return;
  const cx=player.screenX,cy=PLAYER_Y-H*0.054,rgb=QS[player.qi].rgb;
  ctx.save();
  for(const sl of speedLines){
    const x1=cx+Math.cos(sl.angle)*sl.r,y1=cy+Math.sin(sl.angle)*sl.r;
    const x2=cx+Math.cos(sl.angle)*(sl.r+sl.len),y2=cy+Math.sin(sl.angle)*(sl.r+sl.len);
    ctx.strokeStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${sl.life*t*0.32})`;
    ctx.lineWidth=0.8+t;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  ctx.restore();
}

/* ── FLOATS ── */
function addFloat(txt,lane,z,col){floats.push({txt,x:laneX(lane,z),y:depthY(z),vy:-98,life:1.3,max:1.3,col});}
function updateFloats(dt){
  const el=document.getElementById('floats');el.innerHTML='';
  if (!floats || !Array.isArray(floats)) return;
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i];f.y+=f.vy*dt;f.life-=dt;
    if(f.life<=0){floats.splice(i,1);continue;}
    const d=document.createElement('div');d.className='ft';d.textContent=f.txt;
    d.style.cssText=`left:${f.x}px;top:${f.y}px;color:${f.col};opacity:${f.life/f.max}`;
    el.appendChild(d);
  }
}

/* ── HUD ── */
function updateHUD(){
  document.getElementById('h-score').textContent=score.toLocaleString();
  document.getElementById('h-sector').textContent=String(sector).padStart(2,'0');
  document.getElementById('h-multi').textContent=`x${multi.toFixed(1)}`;
  document.getElementById('speed-num').textContent=String(Math.floor(speed/8)).padStart(3,'0');
  const ef=document.getElementById('ef');ef.style.width=player.energy+'%';
  ef.style.background=player.energy<25?'linear-gradient(90deg,#FF2020,#FF5050)':player.energy<50?'linear-gradient(90deg,#FF8800,#FFCC00)':`linear-gradient(90deg,${QS[player.qi].col}88,${QS[player.qi].col})`;
  const cf=document.getElementById('cf');cf.style.width=player.charge+'%';
  cf.style.background=`linear-gradient(90deg,${QS[player.qi].col}44,${QS[player.qi].col})`;
  for(let i=0;i<3;i++){
    const pip=document.getElementById(`qp-${i}`),active=i===player.qi,shifting=player.shifting&&i===player.shiftTo;
    pip.style.color=active||shifting?QS[i].col:'rgba(255,255,255,0.12)';
    pip.style.borderColor=active?QS[i].col:shifting?QS[i].col+'90':'rgba(255,255,255,0.08)';
    pip.style.boxShadow=active?`0 0 14px ${QS[i].col},inset 0 0 8px ${QS[i].col}22`:'none';
    pip.style.transform=active?'scale(1.22)':'scale(1)';
    pip.style.background=active?QS[i].col+'15':'transparent';
    pip.style.animation=shifting&&!active?'blink 0.18s infinite':'';
  }
}

/* ── EFFECTS ── */
function drawFlash(){
  if(flashA<=0)return;
  ctx.fillStyle=flashCol;ctx.globalAlpha=flashA*0.27;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  flashA=Math.max(0,flashA-0.045);
}
function drawVignette(){
  const g=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.86);
  g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(0,0,8,0.72)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function drawQTint(){
  const qi=player.qi;ctx.fillStyle=QS[qi].tint;ctx.fillRect(0,0,W,H);
  if(player.shifting){ctx.fillStyle=`rgba(${QS[qi].rgb.join(',')},0.05)`;ctx.fillRect(0,0,W,H);}
  if(player.overload){ctx.fillStyle='rgba(199,255,77,0.04)';ctx.fillRect(0,0,W,H);}
}
function tickShake(dt){
  if(shakeMag>0){shakeMag*=0.87;shakeX=(Math.random()-0.5)*shakeMag*2;shakeY=(Math.random()-0.5)*shakeMag*2;
    if(shakeMag<0.4){shakeMag=0;shakeX=shakeY=0;}}
}

/* ── OVERLOAD + SECTOR ── */
let overloadTimeout = null;
let sectorTimeout = null;
function triggerOverload(){
  player.overload=true;
  player.olMs=OVERLOAD_MS;
  sfx('overload');
  shakeMag=14;
  const el=document.getElementById('overload');
  el.classList.remove('hidden');
  if (overloadTimeout) clearTimeout(overloadTimeout);
  overloadTimeout = setTimeout(() => {
    el.classList.add('hidden');},900);
  addFloat('QUANTUM OVERLOAD',1,0.75,'#C7FF4D');
}
const SF_SUBS=['QUANTUM INSTABILITY INCREASING',
  'DIMENSIONAL RIFT DETECTED',
  'REALITY STABILIZERS FAILING',
  'SUPERPOSITION CASCADE INITIATED',
  'ALL TIMELINES CONVERGING',
  'EVENT HORIZON APPROACHING',
  'QUANTUM ENTANGLEMENT MAXIMUM',
  'MULTIVERSE COLLAPSE IMMINENT'
];
function triggerSector(){
  const el=document.getElementById('sf');
  document.getElementById('sf-num').textContent=String(sector).padStart(2,'0');
  document.getElementById('sf-sub').textContent=
    SF_SUBS[Math.min(sector-2,SF_SUBS.length-1)];
  el.classList.remove('hidden');
  sfx('sector');
  shakeMag=16;
  if (sectorTimeout) clearTimeout(sectorTimeout);
  sectorTimeout = setTimeout(() => {
  el.classList.add('hidden');},2700);
}

/* ── GAME OVER ── */
function doGameOver(){
  if(STATE!=='PLAYING')return;STATE='GAMEOVER';stopEng();sfx('gameover');
  const isRec=score>highScore;
  if(isRec){highScore=score;localStorage.setItem('qd_hs',highScore);}
  document.getElementById('go-score').textContent=score.toLocaleString();
  document.getElementById('go-sec').textContent=String(sector).padStart(2,'0');
  document.getElementById('go-rec').classList.toggle('hidden',!isRec);
  setTimeout(()=>showScreen('gameover'),900);
}
function showScreen(name){
  ['menu','hud','gameover','pause-scr'].forEach(id=>document.getElementById(id).classList.toggle('hidden',id!==name));
}

/* ── INPUT ── */
function processInput(dt){
  if((jp('ArrowLeft')||jp('KeyA'))&&player.targetLane>0){player.targetLane--;player.drifting=true;player.driftT=0;player.charge=Math.min(100,player.charge+3);}
  if((jp('ArrowRight')||jp('KeyD'))&&player.targetLane<2){player.targetLane++;player.drifting=true;player.driftT=0;player.charge=Math.min(100,player.charge+3);}
  if(!K['ArrowLeft']&&!K['KeyA']&&!K['ArrowRight']&&!K['KeyD']){player.drifting=false;player.driftT=0;}
  const SKM={'Digit1':0,'KeyQ':0,'Digit2':1,'KeyW':1,'Digit3':2,'KeyE':2};
  for(const[code,qi]of Object.entries(SKM)){
    if(jp(code)&&qi!==player.qi&&!player.shifting&&player.coolMs<=0){
      player.shifting=true;player.shiftTo=qi;player.shiftMs=SHIFT_MS;player.coolMs=SHIFT_COOL_MS;
      flashA=0.52;flashCol=QS[qi].col;sfx('shift');burst(player.screenX,PLAYER_Y-H*0.054,QS[qi].col,8);break;
    }
  }
  if(jp('Space')&&player.charge>=SHIELD_COST&&!player.shielded&&!player.shifting){
    player.charge-=SHIELD_COST;player.shielded=true;player.shieldMs=SHIELD_MS;
    sfx('shield');burst(player.screenX,PLAYER_Y-H*0.054,QS[player.qi].col,14);addFloat('TEMPORAL SHIELD',player.lane,0.82,'#C7FF4D');
  }
  if(jp('KeyP')||jp('Escape'))togglePause();
}
function togglePause(){
  if(STATE==='PLAYING'){STATE='PAUSED';stopEng();document.getElementById('pause-scr').classList.remove('hidden');}
  else if(STATE==='PAUSED'){STATE='PLAYING';if(audioOK)engGain.gain.linearRampToValueAtTime(0.08,AC.currentTime+0.3);document.getElementById('pause-scr').classList.add('hidden');lastT=performance.now();}
}

/* ── UPDATE ── */
function update(dt){
  const tgtSpd=Math.min(MAX_SPD,BASE_SPD+(sector-1)*SPD_PER_SECTOR);speed+=(tgtSpd-speed)*dt*0.55;
  trackScroll+=dt*speed*0.00095;score+=Math.round(speed*dt*0.038*multi);
  sectorTimer+=dt;if(sectorTimer>=SECTOR_SECS){sectorTimer=0;sector++;triggerSector();}
  camPhase+=dt*(0.18+sector*0.028);
  const cmag=Math.min(sector*0.48,2.6),tcurve=Math.sin(camPhase)*TRACK_HALF*0.21*cmag;
  camCurve+=(tcurve-camCurve)*dt*1.75;
  multi=Math.max(1,multi-dt*0.038);
  processInput(dt);updatePlayer(dt);updateObstacles(dt);
  updateParticles(dt);updateSpeedLines(dt);updateFloats(dt);updateHUD();updateAudio(speed);tickShake(dt);
}

/* ── RENDER ── */
function render(dt){
  ctx.save();if(shakeMag>0.3)ctx.translate(shakeX,shakeY);ctx.clearRect(-32,-32,W+64,H+64);
  drawBg();drawCity(camCurve);drawStars(dt,camCurve);drawTrack();
  drawObstacles();drawSpeedLines();drawPlayer();drawParticles();
  drawFlash();drawQTint();drawVignette();ctx.restore();
}
function renderMenuBG(dt){
  ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#020208');g.addColorStop(0.5,'#08082A');g.addColorStop(1,'#04041A');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);drawStars(dt,0);
  const t=Date.now()*0.00038;
  for(let gx=0;gx<W;gx+=58){ctx.strokeStyle=`rgba(0,245,255,${0.018+0.008*Math.sin(t+gx*0.012)})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
  for(let gy=0;gy<H;gy+=58){ctx.strokeStyle=`rgba(0,245,255,${0.018+0.008*Math.sin(t+gy*0.012)})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
  const by=((Date.now()*0.0004)%1)*H,bg=ctx.createLinearGradient(0,by-40,0,by+40);
  bg.addColorStop(0,'transparent');bg.addColorStop(0.5,'rgba(0,245,255,0.04)');bg.addColorStop(1,'transparent');
  ctx.fillStyle=bg;ctx.fillRect(0,by-40,W,80);drawVignette();
}

/* ── LOOP ── */
let lastT=0;

function loop(ts){
  const dt=Math.min((ts-lastT)/1000,0.05);lastT=ts;
  if(STATE==='PLAYING'){update(dt);render(dt);}
  else if(STATE==='MENU'||STATE==='GAMEOVER'){renderMenuBG(dt);updateFloats(dt);for(const s of stars)s.tw+=s.ts*dt;}
  else if(STATE==='PAUSED')render(0);
  syncKP();requestAnimationFrame(loop);
}

/* ── BOOT ── */
function startGame(){
  initAudio();
  resetAll();player.screenX=laneX(1,1.0);
  STATE='PLAYING';
  showScreen('hud');
  lastT=performance.now();
}
function goMenu(){
  STATE='MENU';stopEng();showScreen('menu');
  highScore=parseInt(localStorage.getItem('qd_hs')||'0');
  document.getElementById('best-disp').textContent=highScore>0?highScore.toLocaleString():'—';
  const rh=()=>Math.random().toString(16).slice(2,6).toUpperCase();
  document.getElementById('w-addr').textContent=`0x${rh()}...${rh()} // SPECTATOR MODE`;
}
window.addEventListener('DOMContentLoaded',()=>{
  resize();initStars();goMenu();
  document.getElementById('btn-start').addEventListener('click',startGame);
  document.getElementById('btn-retry').addEventListener('click',startGame);
  document.getElementById('btn-menu').addEventListener('click',goMenu);
  document.getElementById('btn-resume').addEventListener('click',()=>{if(STATE==='PAUSED')togglePause();});
  document.getElementById('btn-quit').addEventListener('click',goMenu);
  requestAnimationFrame(loop);
});
})();
