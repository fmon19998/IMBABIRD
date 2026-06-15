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
  { id:'original', name:'Original Rogue', price:0, src:'assets/skin_original.png' },
  { id:'samurai', name:'Samurai Ronin', price:20, src:'assets/skin_samurai.png' },
  { id:'explorer', name:'Jungle Explorer', price:40, src:'assets/skin_explorer.png' },
  { id:'ninja', name:'Ninja Shadow', price:65, src:'assets/skin_ninja.png' },
  { id:'cowboy', name:'Cowboy Outlaw', price:90, src:'assets/skin_cowboy.png' },
  { id:'viking', name:'Viking Raider', price:120, src:'assets/skin_viking.png' },
  { id:'wizard', name:'Sky Wizard', price:150, src:'assets/skin_wizard.png' },
  { id:'soldier', name:'Elite Soldier', price:185, src:'assets/skin_soldier.png' },
  { id:'chef', name:'Master Chef', price:225, src:'assets/skin_chef.png' },
  { id:'king', name:'Gold Sultan VIP', price:300, src:'assets/skin_king.png' },
];

const skinImages = {};
for (const s of SKINS) {
  skinImages[s.id] = new Image();
  skinImages[s.id].src = s.src;
}
const SKIN_MAP = Object.fromEntries(SKINS.map(s => [s.id, s]));

const logo = new Image();
logo.src = 'assets/logo.png';
const backgroundNature = new Image();
backgroundNature.src = 'assets/background_nature.png';

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
function rand(a,b){ return Math.random() * (b - a) + a; }
function pick(arr){ return arr[(Math.random() * arr.length) | 0]; }
function hidePanels(){
  startScreen.classList.remove('active');
  shopScreen.classList.remove('active');
  gameoverScreen.classList.remove('active');
}
function updateCoinText(){
  menuCoins.textContent = coins;
  shopCoins.textContent = coins;
}
function saveShop(){
  localStorage.setItem('imbaBirdCoins', String(coins));
  localStorage.setItem('imbaBirdOwnedSkins', JSON.stringify(ownedSkins));
  localStorage.setItem('imbaBirdSelectedSkin', selectedSkin);
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
  const gained = score;
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
    resultText.textContent = 'Gila bro, kamu nembus batas maksimal Rp20.000!';
  } else {
    resultTitle.textContent = 'GAME OVER';
    resultText.textContent = 'Sekali kena langsung gagal. Nature map ini tetap brutal bro.';
  }
  setTimeout(() => gameoverScreen.classList.add('active'), 180);
}
function flap(){
  if(state === 'menu') resetGame();
  else if(state === 'playing'){
    bird.vy = -7.6;
    for(let i=0;i<6;i++) particles.push({x:bird.x - 20, y:bird.y + rand(-14,14), vx:rand(-4,-1), vy:rand(-1.4,1.4), life:20, type:'spark'});
  }
}

function spawnPipe(){
  const gap = clamp(118 - score * 0.46, 56, 118);
  const margin = 82;
  const center = rand(margin + gap/2, H - 152 - gap/2);
  const width = clamp(74 - score * 0.025, 58, 74);
  const roll = Math.random();
  pipes.push({
    x: W + 40,
    w: width,
    gapY: center,
    baseGapY: center,
    gap,
    passed:false,
    wiggle: rand(0, Math.PI * 2),
    move: score >= 10 && roll < 0.62,
    spike: score >= 45 && roll > 0.70,
    variant: pick(['bamboo', 'totem', 'vine']),
    vineSide: Math.random() > 0.5 ? 1 : -1,
  });
}

function update(){
  if(state !== 'playing') return;
  frame++;
  const speed = clamp(4.8 + score * 0.046, 4.8, 11.5);
  const gravity = clamp(0.54 + score * 0.0022, 0.54, 0.86);
  const spawnEvery = Math.floor(clamp(92 - score * 0.22, 52, 92));

  bird.vy += gravity;
  bird.y += bird.vy;
  bird.rot = clamp(bird.vy / 9, -0.62, 0.96);

  if(frame % spawnEvery === 0) spawnPipe();

  for(const p of pipes){
    p.x -= speed;
    if(p.move){
      const amp = clamp(12 + score * 0.09, 12, 38);
      p.gapY = p.baseGapY + Math.sin((frame + p.wiggle * 60) * 0.07) * amp;
      p.gapY = clamp(p.gapY, 80 + p.gap/2, H - 140 - p.gap/2);
    }
    if(!p.passed && p.x + p.w < bird.x - bird.r){
      p.passed = true;
      score++;
      reward = Math.min(MAX_REWARD, score * REWARD_PER_PIPE);
      shake = 5;
      for(let i=0;i<12;i++) particles.push({x:bird.x, y:bird.y, vx:rand(-3,1), vy:rand(-2.4,2.4), life:24, type:'spark'});
      if([8, 18, 35, 60].includes(score)) warnings.push({text:'MODE MAKIN GILA!', life:100});
      if(reward >= MAX_REWARD) endGame(true);
    }
  }
  pipes = pipes.filter(p => p.x > -140);

  for(const q of particles){ q.x += q.vx; q.y += q.vy; q.life--; }
  particles = particles.filter(q => q.life > 0);
  for(const w of warnings) w.life--;
  warnings = warnings.filter(w => w.life > 0);
  if(shake > 0) shake *= 0.84;

  if(bird.y - bird.r < 4 || bird.y + bird.r > H - 68){ endGame(false); return; }

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
      const trapX = p.x + p.w / 2;
      const trapY = p.gapY;
      const dx = bx - trapX;
      const dy = by - trapY;
      if(Math.sqrt(dx * dx + dy * dy) < br + 12){
        shake = 18;
        endGame(false);
        return;
      }
    }
  }
}

function drawBackground(){
  if(backgroundNature.complete && backgroundNature.naturalWidth){
    ctx.drawImage(backgroundNature, 0, 0, W, H);

    // subtle moving atmosphere so background still feels alive
    ctx.save();
    ctx.globalAlpha = 0.08;
    for(let i = 0; i < 6; i++){
      const x = ((i * 110 - frame * (0.12 + (i % 3) * 0.04)) % (W + 220)) - 110;
      const y = 70 + (i % 3) * 95;
      drawCloud(x, y, 0.9 + (i % 2) * 0.2);
    }
    ctx.restore();

    // slight vignette for readability of gameplay
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0.04)');
    shade.addColorStop(0.45, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  // fallback generated background if image asset fails to load
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#8be7ff');
  sky.addColorStop(0.48, '#d8fbff');
  sky.addColorStop(1, '#7fd785');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sunX = W - 80;
  const sunY = 90;
  const sun = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 54);
  sun.addColorStop(0, 'rgba(255,245,180,.95)');
  sun.addColorStop(1, 'rgba(255,212,85,0)');
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(sunX, sunY, 54, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe278';
  ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.84;
  for(let i = 0; i < 8; i++){
    const x = ((i * 90 - frame * (0.18 + (i % 3) * 0.05)) % (W + 180)) - 100;
    const y = 76 + (i % 4) * 42;
    drawCloud(x, y, 0.78 + (i % 3) * 0.14);
  }
  ctx.globalAlpha = 1;
  drawMountainLayer('#7fb7cb', '#679db3', 0.08, 0.0, 340, 110, 7);
  drawMountainLayer('#6ca0a5', '#588d8d', 0.16, 0.8, 390, 130, 6);
  drawMountainLayer('#5d9b73', '#4c815e', 0.4, 1.4, 470, 150, 7);
  ctx.fillStyle = 'rgba(31,86,62,.28)';
  for(let x = -20; x < W + 30; x += 28){
    const h = 54 + ((x * 7) % 48 + 48) % 48;
    ctx.fillRect(x, H - 246, 10, h);
    ctx.beginPath();
    ctx.moveTo(x - 12, H - 246);
    ctx.lineTo(x + 5, H - 276 - h * 0.18);
    ctx.lineTo(x + 22, H - 246);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#5ab56c';
  ctx.beginPath();
  ctx.moveTo(0, H - 172);
  for(let x = 0; x <= W; x += 18){ ctx.lineTo(x, H - 178 + Math.sin(x * 0.036 + frame * 0.012) * 11); }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#43a45b';
  ctx.beginPath();
  ctx.moveTo(0, H - 130);
  for(let x = 0; x <= W; x += 16){ ctx.lineTo(x, H - 126 + Math.sin(x * 0.052 + frame * 0.018) * 10); }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  for(let x = 8; x < W; x += 24){
    const y = H - 96 + Math.sin((x + frame) * 0.08) * 2;
    drawFlower(x, y, ((x / 24) | 0) % 3);
  }
  ctx.fillStyle = '#22683f'; ctx.fillRect(0, H - 68, W, 68);
}

function drawCloud(x, y, s){
  ctx.fillStyle = '#ffffff';
  blob(x + 12 * s, y, 24 * s, 14 * s);
  blob(x + 36 * s, y - 8 * s, 22 * s, 18 * s);
  blob(x + 66 * s, y, 28 * s, 14 * s);
  blob(x + 40 * s, y + 2 * s, 42 * s, 16 * s);
}
function blob(x,y,w,h){
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawMountainLayer(c1, c2, speed, seed, baseY, amp, peaks){
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(0, H);
  let step = W / peaks;
  for(let i = 0; i <= peaks + 1; i++){
    const px = i * step - ((frame * speed + seed * 40) % step);
    const peak = baseY + Math.sin(i * 1.4 + seed) * 32;
    ctx.lineTo(px - step * 0.5, peak + amp * 0.48);
    ctx.lineTo(px, peak - amp);
    ctx.lineTo(px + step * 0.5, peak + amp * 0.4);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  ctx.fillStyle = c2;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(0, baseY + 30, W, H - baseY - 30);
  ctx.globalAlpha = 1;
}
function drawFlower(x,y,type){
  const colors = [['#ff6fa8','#ffd3e4'], ['#ffd84a','#fff2a8'], ['#9c7bff','#dfd2ff']][type];
  ctx.strokeStyle = '#2d7c44';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke();
  ctx.fillStyle = colors[0];
  for(let i = 0; i < 4; i++){
    const a = i * Math.PI / 2 + Math.PI / 4;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 4, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = colors[1];
  ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
}

function drawPipe(p){
  const topH = p.gapY - p.gap / 2;
  const bottomY = p.gapY + p.gap / 2;
  drawNaturePillar(p.x, -10, p.w, topH + 10, p.variant, true, p.vineSide);
  drawNaturePillar(p.x, bottomY, p.w, H - bottomY - 68, p.variant, false, p.vineSide);
  if(p.spike) drawTrapFruit(p.x + p.w / 2, p.gapY);
}

function drawNaturePillar(x, y, w, h, variant, top, vineSide){
  if(h <= 0) return;
  if(variant === 'bamboo') drawBambooPillar(x, y, w, h, top, vineSide);
  else if(variant === 'totem') drawTotemPillar(x, y, w, h, top);
  else drawVineCliff(x, y, w, h, top, vineSide);
}

function drawBambooPillar(x, y, w, h, top, vineSide){
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#4eab47');
  g.addColorStop(0.45, '#97e862');
  g.addColorStop(1, '#2f7a2f');
  ctx.fillStyle = g;
  roundRectFill(x, y, w, h, 10);
  ctx.strokeStyle = '#295626';
  ctx.lineWidth = 4;
  roundRectStroke(x, y, w, h, 10);
  for(let sy = y + 20; sy < y + h; sy += 26){
    ctx.strokeStyle = '#69bc57';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x + 6, sy); ctx.lineTo(x + w - 6, sy); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.2)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 8, sy + 5); ctx.lineTo(x + w - 8, sy + 5); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x + 8, y + 8, 10, Math.max(0, h - 16));
  drawPillarCap(x - 7, top ? y + h - 14 : y, w + 14, 18, '#7f5d2f', '#b7894c');
  drawLeaves(x + (vineSide > 0 ? w - 8 : 8), top ? y + h - 8 : y + 12, vineSide, top ? -1 : 1);
  drawLeaves(x + w / 2, top ? y + h + 6 : y - 4, 1, top ? -1 : 1, 0.8);
  drawVines(x + (vineSide > 0 ? x*0 + w - 14 : 14), y, h, top, vineSide);
}

function drawTotemPillar(x, y, w, h, top){
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#8b7c61');
  g.addColorStop(0.5, '#b59e79');
  g.addColorStop(1, '#6a5b45');
  ctx.fillStyle = g;
  roundRectFill(x, y, w, h, 8);
  ctx.strokeStyle = '#514533';
  ctx.lineWidth = 4;
  roundRectStroke(x, y, w, h, 8);
  for(let sy = y + 18; sy < y + h - 18; sy += 34){
    ctx.fillStyle = 'rgba(80,58,30,.55)';
    roundRectFill(x + 10, sy, w - 20, 20, 6);
    ctx.fillStyle = '#fff7e0';
    ctx.beginPath(); ctx.arc(x + w * 0.35, sy + 9, 2.8, 0, Math.PI * 2); ctx.arc(x + w * 0.65, sy + 9, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#513f24';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(x + w * 0.5, sy + 14, 5, 0, Math.PI); ctx.stroke();
  }
  drawPillarCap(x - 8, top ? y + h - 14 : y, w + 16, 18, '#5d4a32', '#9d7f50');
  drawLeaves(x + w / 2, top ? y + h - 8 : y + 10, 1, top ? -1 : 1, 0.9);
}

function drawVineCliff(x, y, w, h, top, vineSide){
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#775a33');
  g.addColorStop(0.45, '#a47a43');
  g.addColorStop(1, '#5e4324');
  ctx.fillStyle = g;
  roundRectFill(x, y, w, h, 8);
  ctx.strokeStyle = '#432f17';
  ctx.lineWidth = 4;
  roundRectStroke(x, y, w, h, 8);
  for(let sy = y + 8; sy < y + h - 6; sy += 24){
    ctx.strokeStyle = 'rgba(40,20,5,.26)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, sy);
    ctx.lineTo(x + w - 8, sy + 8);
    ctx.stroke();
  }
  drawPillarCap(x - 7, top ? y + h - 14 : y, w + 14, 18, '#375929', '#58a53b');
  drawLeaves(x + (vineSide > 0 ? w - 8 : 8), top ? y + h - 10 : y + 12, vineSide, top ? -1 : 1, 1.1);
  drawVines(x + (vineSide > 0 ? w - 14 : 14), y, h, top, vineSide);
}

function drawPillarCap(x, y, w, h, c1, c2){
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, c1);
  g.addColorStop(0.5, c2);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  roundRectFill(x, y, w, h, 8);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 3;
  roundRectStroke(x, y, w, h, 8);
}
function drawLeaves(x, y, dirX, dirY, scale=1){
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#4fc44e';
  for(let i = 0; i < 3; i++){
    ctx.beginPath();
    ctx.ellipse(i * 7 * dirX, i * 7 * dirY, 10, 4, i * 0.5 * dirX, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawVines(localX, y, h, top, side){
  ctx.save();
  ctx.strokeStyle = '#2e7c32';
  ctx.lineWidth = 3;
  const startY = top ? y + h - 10 : y + 10;
  const endY = top ? y + h - 10 - Math.min(42, h * 0.4) : y + 10 + Math.min(42, h * 0.4);
  ctx.beginPath();
  ctx.moveTo(localX, startY);
  ctx.bezierCurveTo(localX + side * 12, (startY + endY) / 2, localX - side * 6, (startY + endY) / 2, localX + side * 8, endY);
  ctx.stroke();
  ctx.restore();
}
function drawTrapFruit(x, y){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(frame * 0.12);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 18);
  g.addColorStop(0, '#ffe58f');
  g.addColorStop(0.2, '#ff8b4a');
  g.addColorStop(1, '#8d1600');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  for(let i = 0; i < 8; i++){
    ctx.save();
    ctx.rotate(i * Math.PI / 4);
    ctx.fillStyle = '#8d1600';
    ctx.beginPath();
    ctx.moveTo(10, -3); ctx.lineTo(24, 0); ctx.lineTo(10, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#4b0a00';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawBirdSprite(x, y, size, skinId, rot=0, preview=false){
  const img = skinImages[skinId] || skinImages.original;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const drawSize = preview ? size : size * 1.18;
  if(img && img.complete && img.naturalWidth){
    ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  } else {
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.arc(0, 0, drawSize * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBird(){
  drawBirdSprite(bird.x, bird.y, 72, selectedSkin, bird.rot, false);
}

function drawParticles(){
  for(const q of particles){
    ctx.globalAlpha = q.life / 24;
    if(q.type === 'spark'){
      ctx.fillStyle = q.vx < -2 ? '#ff6430' : '#ffd43b';
      ctx.fillRect(q.x, q.y, 10, 4);
    }
  }
  ctx.globalAlpha = 1;
}

function drawHUD(){
  ctx.save();
  ctx.fillStyle = 'rgba(7,18,19,.36)';
  roundRectFill(14, 14, W - 28, 100, 16);
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 2;
  roundRectStroke(14, 14, W - 28, 100, 16);

  ctx.fillStyle = '#fff';
  ctx.font = '900 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 30, 46);
  ctx.font = '900 22px Arial';
  ctx.fillStyle = '#ffe65c';
  ctx.fillText(rupiah(reward) + ' / ' + rupiah(MAX_REWARD), 30, 78);
  ctx.font = '900 14px Arial';
  ctx.fillStyle = '#c9ffb0';
  ctx.fillText('MAP ALAM + EXTREME MODE', 30, 100);

  ctx.textAlign = 'right';
  ctx.font = '800 13px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('1 RINTANGAN = Rp100', W - 26, 46);
  ctx.fillText('KOIN: +1 / SCORE', W - 26, 76);
  ctx.fillText('SEKALI KENA = GAGAL', W - 26, 96);
  ctx.restore();

  for(const w of warnings){
    ctx.save();
    ctx.globalAlpha = Math.min(1, w.life / 36);
    ctx.textAlign = 'center';
    ctx.font = '900 30px Arial';
    ctx.strokeStyle = '#122';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#ff4d40';
    ctx.strokeText(w.text, W / 2, H * 0.3);
    ctx.fillText(w.text, W / 2, H * 0.3);
    ctx.restore();
  }
}

function draw(){
  ctx.save();
  if(shake > 0 && state === 'playing') ctx.translate(rand(-shake, shake), rand(-shake, shake));
  drawBackground();
  pipes.forEach(drawPipe);
  drawParticles();
  drawBird();
  if(state === 'playing') drawHUD();

  if(state === 'menu' || state === 'shop'){
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(W / 2, H * 0.52 + Math.sin(frame * 0.05) * 10);
    ctx.rotate(Math.sin(frame * 0.045) * 0.12);
    drawBirdSprite(0, 0, 180, selectedSkin, 0, true);
    ctx.restore();
  }
  ctx.restore();
}

function renderShop(){
  skinGrid.innerHTML = '';
  for(const skin of SKINS){
    const owned = ownedSkins.includes(skin.id);
    const selected = selectedSkin === skin.id;
    const card = document.createElement('div');
    card.className = 'skin-card' + (selected ? ' selected' : '');

    const preview = document.createElement('img');
    preview.src = skin.src;
    preview.alt = skin.name;
    preview.className = 'skin-preview';

    const name = document.createElement('div');
    name.className = 'skin-name';
    name.textContent = skin.name;

    const price = document.createElement('div');
    price.className = 'skin-price';
    price.textContent = skin.price === 0 ? 'Gratis' : skin.price + ' koin';

    const btn = document.createElement('button');
    if(selected){
      btn.textContent = 'DIPAKAI';
      btn.className = 'owned';
    } else if(owned){
      btn.textContent = 'PAKAI';
      btn.className = 'owned';
      btn.onclick = () => { selectedSkin = skin.id; saveShop(); renderShop(); };
    } else if(coins >= skin.price){
      btn.textContent = 'BELI';
      btn.onclick = () => {
        coins -= skin.price;
        ownedSkins.push(skin.id);
        selectedSkin = skin.id;
        saveShop();
        updateCoinText();
        renderShop();
      };
    } else {
      btn.textContent = 'KURANG KOIN';
      btn.className = 'locked';
    }
    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(price);
    card.appendChild(btn);
    skinGrid.appendChild(card);
  }
}

function roundRectFill(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
function roundRectStroke(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
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
  if(e.code === 'Space' || e.code === 'ArrowUp'){
    e.preventDefault();
    flap();
  }
});

updateCoinText();
requestAnimationFrame(loop);
