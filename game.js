const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const startScreen = document.getElementById('start-screen');
const shopScreen = document.getElementById('shop-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const shopBtn = document.getElementById('shopBtn');
const shopBtn2 = document.getElementById('shopBtn2');
const backBtn = document.getElementById('backBtn');
const finalScore = document.getElementById('finalScore');
const finalReward = document.getElementById('finalReward');
const earnedCoins = document.getElementById('earnedCoins');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const menuCoins = document.getElementById('menuCoins');
const shopCoins = document.getElementById('shopCoins');
const skinGrid = document.getElementById('skinGrid');

const MAX_REWARD = 20000;
const REWARD_PER_PIPE = 100;

const SKINS = [
  { id:'original', name:'Original Imba', price:0, src:'assets/skin_original.png' },
  { id:'red', name:'Red Devil', price:25, src:'assets/skin_red.png' },
  { id:'ice', name:'Ice Panic', price:50, src:'assets/skin_ice.png' },
  { id:'toxic', name:'Toxic Gacor', price:80, src:'assets/skin_toxic.png' },
  { id:'ninja', name:'Ninja Mode', price:120, src:'assets/skin_ninja.png' },
  { id:'gold', name:'Gold VIP', price:200, src:'assets/skin_gold.png' }
];

const skinImages = {};
for (const s of SKINS) {
  skinImages[s.id] = new Image();
  skinImages[s.id].src = s.src;
}
const logo = new Image();
logo.src = 'assets/logo.png';

let coins = Number(localStorage.getItem('imbaBirdCoins') || '0');
let ownedSkins = JSON.parse(localStorage.getItem('imbaBirdOwnedSkins') || '["original"]');
let selectedSkin = localStorage.getItem('imbaBirdSelectedSkin') || 'original';
if (!ownedSkins.includes('original')) ownedSkins.push('original');
if (!ownedSkins.includes(selectedSkin)) selectedSkin = 'original';

let state = 'menu';
let frame = 0;
let score = 0;
let reward = 0;
let pipes = [];
let particles = [];
let warnings = [];
let shake = 0;
let lastCoinAdded = false;

const bird = {
  x: 108,
  y: 360,
  r: 22,
  vy: 0,
  rot: 0,
};

function rupiah(n){ return 'Rp' + Math.floor(n).toLocaleString('id-ID'); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rand(a,b){ return Math.random()*(b-a)+a; }
function saveShop(){
  localStorage.setItem('imbaBirdCoins', String(coins));
  localStorage.setItem('imbaBirdOwnedSkins', JSON.stringify(ownedSkins));
  localStorage.setItem('imbaBirdSelectedSkin', selectedSkin);
}
function updateCoinText(){
  menuCoins.textContent = coins;
  shopCoins.textContent = coins;
}
function hidePanels(){
  startScreen.classList.remove('active');
  shopScreen.classList.remove('active');
  gameoverScreen.classList.remove('active');
}

function resetGame(){
  state = 'playing';
  frame = 0;
  score = 0;
  reward = 0;
  pipes = [];
  particles = [];
  warnings = [];
  shake = 0;
  lastCoinAdded = false;
  bird.y = 360;
  bird.vy = 0;
  bird.rot = 0;
  hidePanels();
  spawnPipe();
}

function showMenu(){
  state = 'menu';
  updateCoinText();
  hidePanels();
  startScreen.classList.add('active');
}

function showShop(){
  state = 'shop';
  updateCoinText();
  renderShop();
  hidePanels();
  shopScreen.classList.add('active');
}

function addGameCoins(){
  if (lastCoinAdded) return;
  const gained = score; // 1 score = 1 koin skin permanen
  coins += gained;
  lastCoinAdded = true;
  saveShop();
}

function endGame(maxWin=false){
  if (state === 'gameover') return;
  state = 'gameover';
  addGameCoins();
  finalScore.textContent = score;
  finalReward.textContent = rupiah(reward);
  earnedCoins.textContent = score;
  updateCoinText();
  if(maxWin){
    resultTitle.textContent = 'MAX WIN!';
    resultText.textContent = 'Selamat bro, kamu tembus batas maksimal Rp20.000!';
  } else {
    resultTitle.textContent = 'GAME OVER';
    resultText.textContent = 'Sekali kena langsung gagal. Mode sekarang lebih kejam.';
  }
  setTimeout(()=>gameoverScreen.classList.add('active'), 250);
}

function flap(){
  if(state === 'menu') resetGame();
  else if(state === 'playing'){
    bird.vy = -7.65; // responsif tapi gravitasi brutal
    for(let i=0;i<5;i++) particles.push({x:bird.x-22,y:bird.y+rand(-12,12),vx:rand(-3.6,-1),vy:rand(-1.2,1.2),life:20});
  }
}

function spawnPipe(){
  // Upgrade susah: gap lebih sempit, spawn lebih rapat, dan gap bergerak lebih awal.
  const gap = clamp(116 - score * 0.44, 58, 116);
  const margin = 78;
  const center = rand(margin + gap/2, H - 138 - gap/2);
  const width = clamp(76 - score * 0.03, 56, 76);
  const typeRoll = Math.random();
  pipes.push({
    x: W + 24,
    w: width,
    gapY: center,
    baseGapY: center,
    gap,
    passed:false,
    wiggle: rand(0, Math.PI*2),
    move: score >= 12 && typeRoll < .62,
    fake: score >= 35 && typeRoll > .82,
    spike: score >= 70 && typeRoll > .68
  });
}

function update(){
  if(state !== 'playing') return;
  frame++;
  const speed = clamp(4.85 + score * 0.045, 4.85, 11.8);
  const gravity = clamp(0.54 + score * 0.0024, 0.54, 0.86);
  const spawnEvery = Math.floor(clamp(92 - score * 0.24, 54, 92));

  bird.vy += gravity;
  bird.y += bird.vy;
  bird.rot = clamp(bird.vy / 9, -0.62, 0.96);

  if(frame % spawnEvery === 0) spawnPipe();

  for(const p of pipes){
    p.x -= speed;
    if(p.move){
      const amp = clamp(14 + score * .08, 14, 38);
      p.gapY = p.baseGapY + Math.sin((frame + p.wiggle*30) * 0.07) * amp;
      p.gapY = clamp(p.gapY, 72 + p.gap/2, H - 132 - p.gap/2);
    }
    if(!p.passed && p.x + p.w < bird.x - bird.r){
      p.passed = true;
      score++;
      reward = Math.min(MAX_REWARD, score * REWARD_PER_PIPE);
      shake = 6;
      for(let i=0;i<10;i++) particles.push({x:bird.x,y:bird.y,vx:rand(-3.5,1),vy:rand(-2.2,2.2),life:24});
      if(score === 10 || score === 30 || score === 60) warnings.push({text:'MODE MAKIN GILA!', life:95});
      if(reward >= MAX_REWARD) endGame(true);
    }
  }
  pipes = pipes.filter(p => p.x > -120);

  for(const q of particles){q.x+=q.vx;q.y+=q.vy;q.life--;}
  particles = particles.filter(q=>q.life>0);
  for(const w of warnings) w.life--;
  warnings = warnings.filter(w=>w.life>0);

  if(shake>0) shake *= .84;

  if(bird.y - bird.r < 0 || bird.y + bird.r > H - 58){ endGame(false); return; }

  for(const p of pipes){
    const topH = p.gapY - p.gap/2;
    const bottomY = p.gapY + p.gap/2;
    const bx = bird.x, by = bird.y, br = bird.r * 0.74;
    const inX = bx + br > p.x && bx - br < p.x + p.w;
    if(inX && (by - br < topH || by + br > bottomY)){
      shake = 18;
      endGame(false);
      return;
    }
    if(p.spike){
      // area jebakan kecil di tengah gap, bikin game jauh lebih susah setelah score tinggi
      const spikeX = p.x + p.w/2;
      const spikeY = p.gapY;
      const dx = bx - spikeX;
      const dy = by - spikeY;
      if(Math.sqrt(dx*dx + dy*dy) < br + 11){
        shake = 18;
        endGame(false);
        return;
      }
    }
  }
}

function drawBackground(){
  const grd = ctx.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,'#85e7ff');
  grd.addColorStop(.58,'#b7f3ff');
  grd.addColorStop(1,'#54c678');
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,W,H);

  ctx.globalAlpha = .65;
  for(let i=0;i<8;i++){
    const x = ((i*97 - frame*.44) % (W+150)) - 90;
    const y = 62 + (i%4)*38;
    ctx.fillStyle = '#ffffff';
    blob(x,y,34,16); blob(x+24,y-6,28,18); blob(x+52,y,38,14);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(42,122,83,.28)';
  for(let x=-30;x<W+40;x+=38){
    ctx.fillRect(x, H-195, 22, 60 + ((x*7)%44));
  }
  ctx.fillStyle = '#319253';
  ctx.beginPath();
  ctx.moveTo(0,H-125);
  for(let x=0;x<=W;x+=40){ctx.lineTo(x,H-128+Math.sin(x*.04+frame*.014)*12)}
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#226b3d';
  ctx.fillRect(0,H-58,W,58);
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  for(let x=0;x<W;x+=32){ctx.fillRect((x-frame*2.5)%W,H-58,18,6)}
}

function blob(x,y,w,h){
  ctx.beginPath();
  ctx.ellipse(x,y,w,h,0,0,Math.PI*2);
  ctx.fill();
}

function drawPipe(p){
  const topH = p.gapY - p.gap/2;
  const bottomY = p.gapY + p.gap/2;
  const cap = 16;
  pipeRect(p.x, -10, p.w, topH+10, p.fake);
  pipeCap(p.x-8, topH-cap, p.w+16, cap, p.fake);
  pipeCap(p.x-8, bottomY, p.w+16, cap, p.fake);
  pipeRect(p.x, bottomY, p.w, H-bottomY-58, p.fake);
  if(p.spike) drawSpike(p.x + p.w/2, p.gapY);
}

function pipeRect(x,y,w,h,fake=false){
  const g = ctx.createLinearGradient(x,0,x+w,0);
  if(fake){
    g.addColorStop(0,'#6a1b9a'); g.addColorStop(.45,'#f443ff'); g.addColorStop(1,'#3e0a64');
  } else {
    g.addColorStop(0,'#0b7b2a'); g.addColorStop(.45,'#39e264'); g.addColorStop(1,'#07551e');
  }
  ctx.fillStyle = g; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = fake ? '#25003d' : '#063919'; ctx.lineWidth = 4; ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x+8,y+4,8,Math.max(0,h-8));
}
function pipeCap(x,y,w,h,fake=false){
  const g = ctx.createLinearGradient(x,0,x+w,0);
  if(fake){
    g.addColorStop(0,'#58148f'); g.addColorStop(.5,'#ff60ff'); g.addColorStop(1,'#2f064d');
  } else {
    g.addColorStop(0,'#087126'); g.addColorStop(.5,'#4af277'); g.addColorStop(1,'#064717');
  }
  ctx.fillStyle = g; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = fake ? '#25003d' : '#063919'; ctx.lineWidth = 4; ctx.strokeRect(x,y,w,h);
}
function drawSpike(x,y){
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle = '#ff2b2b';
  ctx.strokeStyle = '#360000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0,-16); ctx.lineTo(14,0); ctx.lineTo(0,16); ctx.lineTo(-14,0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawBird(){
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rot);
  const size = 72;
  const img = skinImages[selectedSkin] || skinImages.original;
  if(img && img.complete){
    ctx.drawImage(img, -size/2, -size/2, size, size);
  } else {
    ctx.fillStyle = '#ffd21d';
    ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawHUD(){
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  roundRect(14,14,W-28,98,16); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '900 24px Arial'; ctx.textAlign = 'left';
  ctx.fillText('Score: '+score, 30, 46);
  ctx.font = '900 22px Arial';
  ctx.fillStyle = '#ffe65c'; ctx.fillText(rupiah(reward)+' / '+rupiah(MAX_REWARD), 30, 78);
  ctx.font = '900 14px Arial'; ctx.fillStyle = '#ffb7b7';
  ctx.fillText('EXTREME MODE AKTIF', 30, 100);
  ctx.textAlign = 'right'; ctx.font = '800 13px Arial'; ctx.fillStyle = '#fff';
  ctx.fillText('1 RINTANGAN = Rp100', W-26, 46);
  ctx.fillText('KOIN: +1 / SCORE', W-26, 76);
  ctx.restore();

  for(const w of warnings){
    ctx.save();
    ctx.globalAlpha = Math.min(1, w.life/35);
    ctx.textAlign = 'center'; ctx.font = '900 30px Arial';
    ctx.fillStyle = '#ff3030'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.strokeText(w.text, W/2, H*.32);
    ctx.fillText(w.text, W/2, H*.32);
    ctx.restore();
  }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function drawParticles(){
  for(const q of particles){
    ctx.globalAlpha = q.life/24;
    ctx.fillStyle = q.vx < -2 ? '#ff4d16' : '#ffd31d';
    ctx.fillRect(q.x,q.y,12,4);
  }
  ctx.globalAlpha = 1;
}

function draw(){
  ctx.save();
  if(shake > 0 && state === 'playing') ctx.translate(rand(-shake,shake), rand(-shake,shake));
  drawBackground();
  pipes.forEach(drawPipe);
  drawParticles();
  drawBird();
  if(state === 'playing') drawHUD();
  if(state === 'menu' || state === 'shop'){
    ctx.globalAlpha = .38;
    ctx.save(); ctx.translate(W/2, H*.50 + Math.sin(frame*.05)*10); ctx.rotate(Math.sin(frame*.04)*.15);
    const img = skinImages[selectedSkin] || skinImages.original;
    if(img.complete) ctx.drawImage(img, -92, -92, 184, 184);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function renderShop(){
  skinGrid.innerHTML = '';
  for(const s of SKINS){
    const owned = ownedSkins.includes(s.id);
    const selected = selectedSkin === s.id;
    const card = document.createElement('div');
    card.className = 'skin-card' + (selected ? ' selected' : '');
    card.innerHTML = `
      <img src="${s.src}" alt="${s.name}">
      <div class="skin-name">${s.name}</div>
      <div class="skin-price">${s.price === 0 ? 'Gratis' : s.price + ' koin'}</div>
    `;
    const btn = document.createElement('button');
    if(selected){
      btn.textContent = 'DIPAKAI';
      btn.className = 'owned';
    } else if(owned){
      btn.textContent = 'PAKAI';
      btn.className = 'owned';
      btn.onclick = () => { selectedSkin = s.id; saveShop(); renderShop(); };
    } else if(coins >= s.price){
      btn.textContent = 'BELI';
      btn.onclick = () => { coins -= s.price; ownedSkins.push(s.id); selectedSkin = s.id; saveShop(); updateCoinText(); renderShop(); };
    } else {
      btn.textContent = 'KURANG KOIN';
      btn.className = 'locked';
    }
    card.appendChild(btn);
    skinGrid.appendChild(card);
  }
}

function loop(){
  if(state === 'menu' || state === 'shop') frame++;
  update();
  draw();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);
menuBtn.addEventListener('click', showMenu);
shopBtn.addEventListener('click', showShop);
shopBtn2.addEventListener('click', showShop);
backBtn.addEventListener('click', showMenu);
canvas.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });
window.addEventListener('keydown', e => {
  if(e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
});

updateCoinText();
requestAnimationFrame(loop);
