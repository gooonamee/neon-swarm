import { createRandom } from './random.js';
import { stageShot } from './shots.js';

const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const W = 1200, H = 720, TAU = Math.PI * 2;
const params = new URLSearchParams(location.search);
const seed = Number.parseInt(params.get('seed'), 10);
const random = createRandom(Number.isFinite(seed) ? seed : Math.random() * 4294967296);
let scale, ox, oy, screen = 'title', muted = false, audio, mouse = {x: 800, y: 360, down: false}, keys = new Set(), last = 0, accumulator = 0;
const colors = { chaser:'#ff567e', dasher:'#ffb35b', splitter:'#be7cff', small:'#ff8aaa' };
const upgrades = [
  ['RAPID FIRE','Fire 18% faster','⌁'], ['HEAVY ROUNDS','Bullets deal +1 damage','✦'],
  ['THRUSTERS','Move 14% faster','➤'], ['MULTISHOT','Fire an extra projectile','⋮'],
  ['MAGNET FIELD','Collect gems from farther away','◇'], ['HULL REPAIR','+25 max HP and heal 35','✚']
];
function sound(kind) {
  if (muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o=audio.createOscillator(), g=audio.createGain(), t=audio.currentTime;
    const settings={shoot:[520,180,.045,'square'],hit:[150,70,.12,'sawtooth'],explosion:[130,35,.18,'sawtooth'],pickup:[700,1100,.08,'sine'],level:[440,880,.3,'triangle']}[kind];
    o.type=settings[3]; o.frequency.setValueAtTime(settings[0],t); o.frequency.exponentialRampToValueAtTime(settings[1],t+settings[2]);
    g.gain.setValueAtTime(.035,t); g.gain.exponentialRampToValueAtTime(.001,t+settings[2]); o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t+settings[2]);
  } catch {}
}
function createGame() {
  return {
    reset() { Object.assign(this,{ player:{x:600,y:360,hp:100,maxHp:100,speed:220,damage:1,rate:.23,multi:1,magnet:95,invuln:0}, bullets:[],enemies:[],gems:[],particles:[],texts:[],time:0,score:0,kills:0,level:1,xp:0,xpNeed:8,spawn:.2,cooldown:0,shake:0,levelPending:false,choices:[] }); },
    burst(x,y,color,n=10) { for(let i=0;i<n;i++){let a=random()*TAU, v=40+random()*180;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+random()*.45,max:.75,color});} },
    spawnEnemy() { let a=random()*TAU, d=740, p=this.player, roll=random(), type=this.time>20&&roll>.77?'splitter':this.time>8&&roll>.48?'dasher':'chaser'; this.addEnemy(type,Math.max(-30,Math.min(W+30,p.x+Math.cos(a)*d)),Math.max(-30,Math.min(H+30,p.y+Math.sin(a)*d))); },
    addEnemy(type,x,y) { let hp=type==='splitter'?5:type==='dasher'?3: type==='small'?1:2; this.enemies.push({type,x,y,hp,maxHp:hp,r:type==='splitter'?20:type==='dasher'?15:type==='small'?9:13,phase:random()*1.5,vx:0,vy:0}); },
    upgrade(index) { let id=this.choices[index] ?? index,p=this.player; if(id===0)p.rate*=.82;if(id===1)p.damage++;if(id===2)p.speed*=1.14;if(id===3)p.multi=Math.min(5,p.multi+1);if(id===4)p.magnet+=45;if(id===5){p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+35);} this.levelPending=false; if(this.xp>=this.xpNeed)this.levelUp(); },
    levelUp() { this.xp-=this.xpNeed; this.level++; this.xpNeed=Math.floor(this.xpNeed*1.3+3); let pool=[0,1,2,3,4,5]; this.choices=[]; for(let i=0;i<3;i++)this.choices.push(pool.splice(Math.floor(random()*pool.length),1)[0]);this.levelPending=true;sound('level'); },
    update(dt,input,staging=false) {
      let p=this.player; this.time+=dt; p.invuln=Math.max(0,p.invuln-dt); this.shake=Math.max(0,this.shake-dt*20);
      let len=Math.hypot(input.x,input.y)||1; p.x=Math.max(24,Math.min(W-24,p.x+input.x/len*p.speed*dt));p.y=Math.max(24,Math.min(H-24,p.y+input.y/len*p.speed*dt));p.angle=Math.atan2(input.aimY-p.y,input.aimX-p.x);
      this.cooldown-=dt; if(input.fire&&this.cooldown<=0){this.cooldown=p.rate;for(let i=0;i<p.multi;i++){let a=p.angle+(i-(p.multi-1)/2)*.16;this.bullets.push({x:p.x+Math.cos(a)*18,y:p.y+Math.sin(a)*18,vx:Math.cos(a)*620,vy:Math.sin(a)*620,life:1.25});}if(!staging)sound('shoot');}
      this.spawn-=dt;if(this.spawn<=0){this.spawn=Math.max(.22,1.05-this.time*.009);this.spawnEnemy();}
      for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
      for(const e of this.enemies){let dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,speed=(e.type==='small'?115:e.type==='splitter'?55:80)+Math.min(85,this.time*.7);if(e.type==='dasher'){e.phase-=dt;if(e.phase<=-0.24){e.phase=1.3;e.vx=0;e.vy=0;}else if(e.phase<=0 && !e.vx&&!e.vy){e.vx=dx/d*310;e.vy=dy/d*310;}if(e.phase>0)speed*=.35;else{e.x+=e.vx*dt;e.y+=e.vy*dt;speed=0;}} e.x+=dx/d*speed*dt;e.y+=dy/d*speed*dt;
        if(d<e.r+13&&p.invuln<=0){p.hp-=15;p.invuln=.8;this.shake=12;this.burst(p.x,p.y,'#68f7ff',12);if(!staging)sound('hit');}
        for(const b of this.bullets){if(b.life>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+5){b.life=0;e.hp-=p.damage;this.burst(b.x,b.y,colors[e.type],3);if(!staging)sound('hit');if(e.hp<=0){e.dead=true;this.kills++;let points=e.type==='splitter'?30:e.type==='dasher'?20:10;this.score+=points;this.texts.push({x:e.x,y:e.y,text:'+'+points,life:.8});this.gems.push({x:e.x,y:e.y,value:e.type==='splitter'?3:1});this.burst(e.x,e.y,colors[e.type],12);this.shake=5;if(!staging)sound('explosion');if(e.type==='splitter'){this.addEnemy('small',e.x-12,e.y);this.addEnemy('small',e.x+12,e.y);}break;}}}
      }
      this.enemies=this.enemies.filter(e=>!e.dead);this.bullets=this.bullets.filter(b=>b.life>0&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);
      for(const gem of this.gems){let dx=p.x-gem.x,dy=p.y-gem.y,d=Math.hypot(dx,dy)||1;if(d<p.magnet){let s=180+(p.magnet-d)*4;gem.x+=dx/d*s*dt;gem.y+=dy/d*s*dt;}if(d<18){gem.dead=true;this.xp+=gem.value;if(!staging)sound('pickup');}}
      this.gems=this.gems.filter(g=>!g.dead);if(this.xp>=this.xpNeed&&!this.levelPending)this.levelUp();
      for(const q of this.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.96;q.vy*=.96;q.life-=dt;}this.particles=this.particles.filter(q=>q.life>0);for(const t of this.texts){t.y-=35*dt;t.life-=dt;}this.texts=this.texts.filter(t=>t.life>0);
    }
  };
}
const game=createGame();game.reset();
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2;}addEventListener('resize',resize);resize();
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}function text(s,x,y,size,color='#eafaff',align='left',weight=700){ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillText(s,x,y);}function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function poly(x,y,r,sides,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();for(let i=0;i<sides;i++){let a=i*TAU/sides;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fillStyle=color+'25';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.stroke();ctx.restore();}
function bar(x,y,w,h,value,color){rect(x,y,w,h,'#202b3b');rect(x,y,Math.max(0,Math.min(1,value))*w,h,color);}
function timeString(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#050812';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  rect(0,0,W,H,'#080e1c');let grad=ctx.createRadialGradient(600,340,30,600,340,720);grad.addColorStop(0,'#14233a');grad.addColorStop(1,'#080b16');rect(0,0,W,H,grad);
  ctx.save();if(screen==='play'&&game.shake>0)ctx.translate((random()-.5)*game.shake,(random()-.5)*game.shake);
  for(let x=0;x<W;x+=48)line(x,0,x,H,'#27364a55');for(let y=0;y<H;y+=48)line(0,y,W,y,'#27364a55');
  for(let i=0;i<36;i++){let x=(i*173+43)%W,y=(i*241+31)%H;rect(x,y,2,2,'#5a7b8b66');}
  for(const g of game.gems)poly(g.x,g.y,6,4,0,'#54f5cb');
  for(const b of game.bullets){ctx.save();ctx.shadowColor='#80fff4';ctx.shadowBlur=15;line(b.x-b.vx*.025,b.y-b.vy*.025,b.x,b.y,'#baffff',3);ctx.restore();}
  for(const e of game.enemies){poly(e.x,e.y,e.r,e.type==='splitter'?5:e.type==='dasher'?4:3,game.time*.7+(e.type==='chaser'?Math.PI:0),colors[e.type]);if(e.type==='dasher')poly(e.x,e.y,5,4,0,colors[e.type]);}
  for(const q of game.particles){ctx.globalAlpha=Math.min(1,q.life*2);rect(q.x,q.y,3,3,q.color);}ctx.globalAlpha=1;
  for(const t of game.texts){ctx.globalAlpha=Math.min(1,t.life*2);text(t.text,t.x,t.y,14,'#ffffff','center');}ctx.globalAlpha=1;
  let p=game.player;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);ctx.shadowColor='#55f9ff';ctx.shadowBlur=20;ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-13,-12);ctx.lineTo(-8,0);ctx.lineTo(-13,12);ctx.closePath();ctx.fillStyle=p.invuln>0?'#fff':'#7cfff4';ctx.fill();ctx.strokeStyle='#d8ffff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ff9d70';ctx.beginPath();ctx.moveTo(-11,-5);ctx.lineTo(-20-random()*5,0);ctx.lineTo(-11,5);ctx.fill();ctx.restore();ctx.restore();
  if(screen==='play'||screen==='paused'||screen==='upgrade'){
    rect(0,0,W,76,'#070c17dd');text('NEON',28,31,18,'#76fff4');text('SWARM',28,51,18,'#fff');line(115,18,115,57,'#324557');text('SCORE',140,26,10,'#7f9aad');text(String(game.score).padStart(6,'0'),140,50,22);text('SURVIVAL',310,26,10,'#7f9aad');text(timeString(game.time),310,50,22);text('KILLS',445,26,10,'#7f9aad');text(String(game.kills),445,50,22);text('HULL',790,27,10,'#ff8198');text(`${Math.ceil(p.hp)} / ${p.maxHp}`,1168,27,11,'#fff','right');bar(790,36,378,8,p.hp/p.maxHp,'#ff617f');text(`LVL ${game.level}`,790,62,10,'#6ef8d6');bar(850,54,318,6,game.xp/game.xpNeed,'#68f4d1');text('P / ESC  PAUSE     M  SOUND',1168,703,10,'#7891a3','right');
  }
  if(screen==='title'){
    rect(0,0,W,H,'#05091699');text('AN ARCADE SURVIVAL EXPERIENCE',600,142,12,'#77f8e5','center');text('NEON',600,260,108,'#e8ffff','center',900);text('SWARM',600,355,108,'#6fffea','center',900);line(475,385,725,385,'#56ddda',2);text('HOLD THE LINE AGAINST THE INFINITE.',600,421,15,'#b4cad6','center');rect(450,461,300,54,'#67fbe5');text('ENTER THE ARENA  →',600,495,16,'#07151c','center',900);text('WASD / ARROWS  MOVE     •     MOUSE  AIM     •     HOLD CLICK / SPACE  FIRE',600,574,12,'#a6bbc9','center');text('P / ESC  PAUSE     •     M  MUTE',600,603,11,'#708a9b','center');
  }
  if(screen==='over'){rect(0,0,W,H,'#050916dd');text('SIGNAL LOST',600,180,13,'#ff718c','center');text('GAME OVER',600,265,68,'#f4ffff','center',900);line(430,292,770,292,'#ff617f',2);text('FINAL SCORE',460,346,11,'#819aa9','center');text('SURVIVED',600,346,11,'#819aa9','center');text('KILLS',740,346,11,'#819aa9','center');text(String(game.score),460,385,29,'#fff','center');text(timeString(game.time),600,385,29,'#fff','center');text(String(game.kills),740,385,29,'#fff','center');rect(450,445,300,54,'#69f9e5');text('RESTART  [ R ]',600,479,16,'#07151c','center',900);}
  if(screen==='paused'){rect(0,0,W,H,'#050916cc');text('PAUSED',600,320,64,'#f0ffff','center',900);text('P OR ESC TO RESUME',600,370,14,'#74f9e3','center');}
  if(screen==='upgrade'){rect(0,0,W,H,'#050916dd');text('SYSTEM UPGRADE',600,160,13,'#6afbe2','center');text(`LEVEL ${game.level}`,600,220,54,'#fff','center',900);text('Choose one enhancement',600,255,15,'#9bb6c5','center');game.choices.forEach((id,i)=>{let x=168+i*294;rect(x,300,276,190,'#142336');ctx.strokeStyle='#3e6675';ctx.strokeRect(x+.5,300.5,275,189);text(`0${i+1}`,x+20,331,12,'#6dfbe0');text(upgrades[id][2],x+138,377,34,'#78ffec','center');text(upgrades[id][0],x+138,420,16,'#fff','center');text(upgrades[id][1],x+138,448,12,'#a6c1cc','center',400);});text('CLICK A CARD OR PRESS 1 / 2 / 3',600,548,12,'#7b9aa9','center');}
  ctx.restore();
}
function point(e){let r=canvas.getBoundingClientRect();return {x:((e.clientX-r.left)*devicePixelRatio-ox)/scale,y:((e.clientY-r.top)*devicePixelRatio-oy)/scale};}
function start(){game.reset();screen='play';accumulator=0;document.querySelector('#status').textContent='Survive the swarm.';}
function choose(i){if(i>=0&&i<3){game.upgrade(i);screen=game.levelPending?'upgrade':'play';}}
canvas.addEventListener('pointermove',e=>{Object.assign(mouse,point(e));});canvas.addEventListener('pointerdown',e=>{Object.assign(mouse,point(e));mouse.down=true;if(screen==='title'||screen==='over')start();else if(screen==='upgrade'&&mouse.y>=300&&mouse.y<=490)choose(Math.floor((mouse.x-168)/294));});addEventListener('pointerup',()=>mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;keys.add(k);if(k==='m')muted=!muted;else if((k==='enter'&&screen==='title')||(k==='r'&&screen==='over'))start();else if((k==='p'||k==='escape')&&(screen==='play'||screen==='paused'))screen=screen==='play'?'paused':'play';else if(screen==='upgrade'&&['1','2','3'].includes(k))choose(Number(k)-1);});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();mouse.down=false;if(screen==='play')screen='paused';});
function frame(now){let dt=Math.min((now-last)/1000||0,.1);last=now;if(screen==='play'){accumulator+=dt;while(accumulator>=1/60&&screen==='play'){game.update(1/60,{x:(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y:(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),aimX:mouse.x,aimY:mouse.y,fire:mouse.down||keys.has(' ')});accumulator-=1/60;if(game.player.hp<=0){screen='over';document.querySelector('#status').textContent=`Game over. Score ${game.score}, ${game.kills} kills.`;}else if(game.levelPending)screen='upgrade';}}else accumulator=0;draw();requestAnimationFrame(frame);}
if(params.has('shot')){screen=stageShot(params.get('shot'),game);draw();requestAnimationFrame(()=>{draw();window.__shotReady=true;});}else requestAnimationFrame(frame);
