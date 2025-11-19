// FILE: rock-balance.js
/* =========================================================
   Zen Rock Balance — Final Dramatic (Light rotation + soft dust)
   Versi file .js lengkap — komentar dalam Bahasa Indonesia
   ========================================================= */

////////////////////////////////
// KONFIGURASI & ASSET PATHS  //
////////////////////////////////
const CANVAS_W = 600, CANVAS_H = 700;
const PODIUM_W = 200, PODIUM_H = 250;
const PODIUM = { x: Math.round((CANVAS_W - PODIUM_W) / 2), y: CANVAS_H - PODIUM_H, w: PODIUM_W, h: PODIUM_H };

// daftar batu (ubah path sesuai foldermu)
const ROCK_ASSETS = [
  { src: 'Rocky/1.png', w:110, h:50 },
  { src: 'Rocky/2.png', w:90,  h:60 },
  { src: 'Rocky/3.png', w:100, h:100 },
  { src: 'Rocky/4.png', w:80,  h:80 },
  { src: 'Rocky/5.png', w:200, h:60 },
  { src: 'Rocky/6.png', w:90,  h:50 },
  { src: 'Rocky/7.png', w:125, h:55 },
  { src: 'Rocky/8.png', w:95,  h:65 },
  { src: 'Rocky/9.png', w:105, h:45 }
];

// 50 kutipan Bahasa Indonesia (static)
const QUOTES = [
  "Seismic teaches us the greatest innovations are born from the courage to change foundations.",
  "Privacy is not a choice—within Seismic, privacy is power.",
  "Build an encrypted future, layer by layer.",
  "Technology evolves, but a strong vision continues to shake the world.",
  "Seismic is where small ideas can create massive impact.",
  "Don’t fear movement—even an earthquake begins with a small vibration.",
  "The future belongs to those brave enough to build new systems.",
  "Security isn’t a barrier; it’s the foundation of innovation.",
  "Every block in Seismic is a step toward a safer world.",
  "Technology is powerful when it protects, not just displays.",
  "Let innovation shake your limits.",
  "Privacy is a right, and Seismic makes it a standard.",
  "Not just a chain—this is a paradigm shift.",
  "Silence the noise, amplify the impact.",
  "In an open world, encryption is a shield.",
  "Move with intent, not fear.",
  "Seismic is a call to create a more human-centered ecosystem.",
  "Don’t follow the flow—build your own chain.",
  "Innovation without privacy is only half-progress.",
  "Every small decision creates a big ripple.",
  "Don’t wait for momentum—create it.",
  "True strength appears when technology and ethics align.",
  "Seismic is where code and trust move together.",
  "When the world changes fast, be the foundation that stays firm.",
  "Build systems that protect, not restrict.",
  "Transparency is good; encryption is essential.",
  "Innovation is the art of making the impossible possible.",
  "Protect your idea, let its impact shake the world.",
  "Build the future, not just applications.",
  "Not all change is visible—some is felt.",
  "When everyone is watching, Seismic helps you stay protected.",
  "Security is not optional, but essential.",
  "Think big, innovate bigger.",
  "A new world needs a new foundation.",
  "Trust is built with the right technology.",
  "Privacy opens space for true creativity.",
  "Seismic is where big dreams have a safe place.",
  "Create impact, not noise.",
  "Small steps create massive waves.",
  "Every chain starts with one brave link.",
  "Protection fuels true innovation.",
  "Encrypted ideas last longer.",
  "A stable system begins with stable intent.",
  "Bold visions require solid foundations.",
  "Privacy makes innovation fearless.",
  "Let your ideas echo beyond the noise.",
  "Seismic moves because people dare to build.",
  "Great impact begins with strong structures.",
  "Rebuild the world, one secure block at a time."
];

/////////////////////////////////////
// PARAMETER EFEK (mudah di-tweak) //
/////////////////////////////////////
const GRAVITY_DROP_FAST = 0.1; // jatuh sedang (keluar layar)
const GRAVITY_FLOAT = 0.08;    // melayang ringan
const FALL_WIGGLE = 0.06;      // drift horizontal kecil
const FALL_ROTATION = 0.7;     // rotasi sedikit saat jatuh
const STACK_VERTICAL_GAP = -3; // sangat rapat (negatif = saling overlap)
const SHAKE_DURATION = 220;    // ms
const SHAKE_MAG = 8;           // px
const DUST_PARTICLES = 10;

////////////////////////////////////////
// STATE & DOM references (harus ada) //
////////////////////////////////////////
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const gallery = document.getElementById('gallery');
const ghost = document.getElementById('ghost');
const nameBox = document.getElementById('nameBox');
const nameTag = document.getElementById('nameTag');
const quoteText = document.getElementById('quoteText');

const resetBtn = document.getElementById('resetBtn');
const captureBtn = document.getElementById('captureBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

let rockImages = [];
let rocks = []; // daftar batu di dunia
let inventoryUsed = new Array(ROCK_ASSETS.length).fill(false);
let grabbedRock = null;
let draggingIndex = null;
let pointer = { x:0, y:0, px:0, py:0 };
let analyzeUsed = false;
let currentStackOrder = 0;
let particles = [];

/* Background & podium images */
const bgImg = new Image();
bgImg.src = 'bg1.png';   // <-- pastikan file ada
const podiumImg = new Image();
podiumImg.src = 'podium1.png';

/////////////////////////////////////
// UTIL: konversi layar -> koordinat canvas logis
/////////////////////////////////////
function screenToLogical(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

/////////////////////////////////////
// PRELOAD & BUILD GALLERY
/////////////////////////////////////
function preload(){
  ROCK_ASSETS.forEach((a,i)=>{
    const im = new Image();
    im.src = a.src;
    rockImages[i] = im;
  });
  buildGallery();
}
function buildGallery(){
  if(!gallery) return;
  gallery.innerHTML = '';
  ROCK_ASSETS.forEach((a,i)=>{
    const slot = document.createElement('div');
    slot.className = 'gal-item';
    slot.dataset.index = i;
    const img = document.createElement('img'); img.src = a.src;
    slot.appendChild(img);

    slot.addEventListener('pointerdown', (ev)=>{
      ev.preventDefault();
      if(inventoryUsed[i]) return;
      startGalleryDrag(i, ev);
    }, { passive:false });

    slot.addEventListener('click', ()=>{
      if(inventoryUsed[i]) return;
      spawnRockAtCenter(i);
      inventoryUsed[i] = true;
      slot.classList.add('used');
      enableAnalyzeIfNeeded();
    });

    gallery.appendChild(slot);
  });
}
preload();

/////////////////////////////////////
// GHOST (preview saat drag dari galeri)
/////////////////////////////////////
function showGhost(src, x, y){
  if(!ghost) return;
  ghost.style.display = 'flex';
  ghost.style.left = x + 'px';
  ghost.style.top = y + 'px';
  const img = ghost.querySelector('img');
  if(img) img.src = src;
}
function moveGhost(x,y){
  if(!ghost) return;
  ghost.style.left = x + 'px';
  ghost.style.top = y + 'px';
}
function hideGhost(){
  if(!ghost) return;
  ghost.style.display = 'none';
  const img = ghost.querySelector('img'); if(img) img.src = '';
}

/////////////////////////////////////
// DRAG DARI GALERI -> SPAWN PADA MASUK CANVAS
/////////////////////////////////////
function startGalleryDrag(index, ev){
  draggingIndex = index;
  pointer.x = ev.clientX; pointer.y = ev.clientY;
  showGhost(ROCK_ASSETS[index].src, pointer.x, pointer.y);
  window.addEventListener('pointermove', galleryMove, { passive:false });
  window.addEventListener('pointerup', galleryUp, { passive:false });
}
function galleryMove(ev){
  ev.preventDefault();
  pointer.x = ev.clientX; pointer.y = ev.clientY;
  moveGhost(pointer.x, pointer.y);

  const rect = canvas.getBoundingClientRect();
  if(draggingIndex !== null && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom){
    const p = screenToLogical(pointer.x, pointer.y);
    spawnRockFromGallery(draggingIndex, p.x, p.y);
    inventoryUsed[draggingIndex] = true;
    const slot = gallery.querySelector(`[data-index="${draggingIndex}"]`); if(slot) slot.classList.add('used');
    draggingIndex = null;
  }
}
function galleryUp(){
  hideGhost();
  draggingIndex = null;
  window.removeEventListener('pointermove', galleryMove);
  window.removeEventListener('pointerup', galleryUp);
}

/////////////////////////////////////
// SPAWN ROCK KE DUNIA (koordinat logis)
/////////////////////////////////////
function spawnRockFromGallery(index, lx, ly){
  const a = ROCK_ASSETS[index];
  const r = {
    id: Date.now() + Math.random(),
    srcIndex: index,
    img: rockImages[index],
    x: lx - a.w/2,
    y: ly - a.h/2,
    w: a.w, h: a.h,
    vx: 0, vy: 0,
    angle: (Math.random()-0.5)*0.04,
    angVel: (Math.random()-0.5)*0.02,
    grabbed: true,
    isFalling: false,
    removeOnExit: false,
    stacked: false,
    stackOrder: null
  };
  rocks.push(r);
  grabbedRock = r;
}
function spawnRockAtCenter(index){
  spawnRockFromGallery(index, CANVAS_W/2, PODIUM.y/2);
}

/////////////////////////////////////
// INTERAKSI CANVAS: pick / drag / release
/////////////////////////////////////
if(canvas){
  canvas.addEventListener('pointerdown', (ev)=>{
    ev.preventDefault();
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = ev.clientX; pointer.y = ev.clientY;
    const c = screenToLogical(ev.clientX, ev.clientY);

    for(let i = rocks.length-1; i >= 0; i--){
      const r = rocks[i];
      if(r.stacked) continue;
      if(c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h){
        r.grabbed = true;
        r.vx = r.vy = r.angVel = 0;
        grabbedRock = r;
        // bawa ke atas rendering (last in = top)
        rocks.splice(i,1); rocks.push(r);
        break;
      }
    }
  });

  canvas.addEventListener('pointermove', (ev)=>{
    if(!grabbedRock) return;
    ev.preventDefault();
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = ev.clientX; pointer.y = ev.clientY;
    const c = screenToLogical(ev.clientX, ev.clientY);
    if(grabbedRock.grabbed){
      grabbedRock.x = c.x - grabbedRock.w/2;
      grabbedRock.y = c.y - grabbedRock.h/2;
    }
  });

  canvas.addEventListener('pointerup', (ev)=>{
    ev.preventDefault();
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = ev.clientX; pointer.y = ev.clientY;
    if(!grabbedRock) return;

    const r = grabbedRock;
    r.grabbed = false;
    const c = screenToLogical(ev.clientX, ev.clientY);
    const prev = screenToLogical(pointer.px, pointer.py);
    const dx = c.x - prev.x, dy = c.y - prev.y;

    // cek overlap HORIZONTAL dengan podium (cukup area X)
    const overPodiumHorizontal = (r.x + r.w > PODIUM.x) && (r.x < PODIUM.x + PODIUM.w);

    if(overPodiumHorizontal){
      // tandai sebagai "jatuh" agar physics berikan sedikit momentum
      r.isFalling = true;
      r.vx = dx * 0.12;
      r.vy = Math.max(0.5, Math.abs(dy) * 0.05);
    } else {
      // di luar podium -> tandai untuk jatuh cepat dan hilang
      r.removeOnExit = true;
      r.vx = dx * 0.28;
      r.vy = Math.max(6, Math.abs(dy) * 0.25 + 6);
      r.angVel = (Math.random()-0.5)*0.12;
    }

    grabbedRock = null;
  });
}

/////////////////////////////////////
// SNAP KE TUMPUKAN (tidak menjalankan fisika saat menempel)
/////////////////////////////////////
function snapToStack(r){
  const stacked = rocks.filter(x=>x.stacked);
  const topY = (stacked.length > 0) ? Math.min(...stacked.map(x=>x.y)) : PODIUM.y;

  // X sedikit acak
  const shiftX = (Math.random()-0.5) * 8; // lebih rapat geser +/-8px
  const finalX = PODIUM.x + (PODIUM.w - r.w)/2 + shiftX;

  // finalY menggunakan STACK_VERTICAL_GAP (negative => rapat)
  const finalY = topY - r.h - STACK_VERTICAL_GAP;

  // set stacked, hentikan gerakan & rotasi
  r.stacked = true;
  r.isFalling = false;
  r.removeOnExit = false;
  r.vx = 0; r.vy = 0; r.angVel = 0;
  r.angle = 0; // hentikan rotasi akhir

  r.x = finalX;
  r.y = finalY;
  r.stackOrder = currentStackOrder++;

  // efek visual
  spawnDust(r.x + r.w/2, r.y + r.h - 6, 'soft');
  shakeRock(r, SHAKE_DURATION, SHAKE_MAG);

  // aktifkan analyze jika belum dipakai
  enableAnalyzeIfNeeded();
}

/////////////////////////////////////
// SHAKE (visual), DUST particle
/////////////////////////////////////
function shakeRock(rock, duration = 180, magnitude = 8){
  const start = performance.now();
  const origX = rock.x;
  function tick(t){
    const elapsed = t - start;
    if(elapsed >= duration){
      rock.x = origX; // kembalikan
      return;
    }
    const p = elapsed / duration;
    const damp = (1 - p);
    rock.x = origX + Math.sin(elapsed * 0.06 * Math.PI * 2) * magnitude * damp;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function spawnDust(x,y, type='soft'){
  const count = (type === 'soft') ? DUST_PARTICLES : DUST_PARTICLES * 2;
  for(let i=0;i<count;i++){
    particles.push({
      x: x + (Math.random()*20 - 10),
      y: y + (Math.random()*6 - 3),
      vx: (Math.random()-0.5) * 1.4,
      vy: (Math.random()*-1.2) - 0.2,
      alpha: 0.9 + Math.random()*0.15,
      size: 1 + Math.random()*3
    });
  }
}
function updateParticles(){
  for(let i = particles.length-1; i >= 0; i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.02;
    p.alpha -= 0.014;
    p.size *= 0.985;
    if(p.alpha <= 0.02 || p.size <= 0.4) particles.splice(i,1);
  }
}
function drawParticles(){
  for(const p of particles){
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/////////////////////////////////////
// PHYSICS: melayang, jatuh, removeOnExit
/////////////////////////////////////
function updatePhysics() {
  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];

    // skip batu yang sudah menempel
    if (r.stacked) continue;

    // jika batu harus dibuang (keluar area)
    if (r.removeOnExit) {
      r.vy += GRAVITY_DROP_FAST;
      r.x += r.vx;
      r.y += r.vy;
      r.angle += r.angVel;
      r.angVel *= 0.97;

      if (r.y > CANVAS_H + 150) {
        rocks.splice(i, 1);
      }
      continue;
    }

    // jika sedang di-drag, skip physics
    if (r.grabbed) continue;

    // MELAYANG (belum jatuh)
    if (!r.isFalling) {
      r.vy += GRAVITY_FLOAT * 0.6;
      r.vx += (Math.random() - 0.5) * (FALL_WIGGLE * 0.35);
      r.angVel += (Math.random() - 0.5) * 0.0012;
    }

    // JATUH (isFalling true)
    if (r.isFalling) {
      r.vy += GRAVITY_DROP_FAST * 0.55;
      r.vx += (Math.random() - 0.5) * (FALL_WIGGLE * 0.5);
      r.angVel += (Math.random() - 0.5) * (0.0025 * FALL_ROTATION);
    }

    // update posisi
    r.x += r.vx;
    r.y += r.vy;
    r.angle += r.angVel;

    // damping
    r.vx *= 0.9925;
    r.vy *= 0.9925;
    r.angVel *= 0.985;

    // Jika sudah ada batu di stack, snap to top batu; kalau belum ada, snap ke podium
    const stacked = rocks.filter(x => x.stacked);
    if (stacked.length > 0) {
      const topY = Math.min(...stacked.map(x => x.y));
      if (r.y + r.h >= topY) {
        r.isFalling = false;
        snapToStack(r);
        continue;
      }
    } else {
      if (r.y + r.h >= PODIUM.y) {
        r.isFalling = false;
        snapToStack(r);
        continue;
      }
    }

    // batas layar
    if (r.x < 0) { r.x = 0; r.vx *= -0.25; }
    if (r.x + r.w > CANVAS_W) { r.x = CANVAS_W - r.w; r.vx *= -0.25; }
    if (r.y < 0) { r.y = 0; r.vy *= -0.25; }
  }
}

/////////////////////////////////////
// DRAW: background image fullscreen (A), podium PNG above background (C), rocks, particles
/////////////////////////////////////
function draw(){
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);

  // background image full canvas (pilihan A)
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    const g = ctx.createLinearGradient(0,0,0,CANVAS_H);
    g.addColorStop(0,'#FFC3CA');
    g.addColorStop(1,'#D67B9F');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  }

  // gambar podium di atas background (pilihan C juga terpenuhi)
  if (podiumImg.complete && podiumImg.naturalWidth > 0) {
    ctx.drawImage(podiumImg, PODIUM.x, PODIUM.y, PODIUM.w, PODIUM.h);
  } else {
    // fallback rectangle podium
    ctx.fillStyle = '#c2b59b'; ctx.fillRect(PODIUM.x, PODIUM.y, PODIUM.w, 20);
    ctx.fillStyle = '#b57f3b'; ctx.fillRect(PODIUM.x, PODIUM.y + 20, PODIUM.w, PODIUM.h - 20);
  }

  // render floating (belum stacked) dulu, stacked terakhir (urut stackOrder)
  const floating = rocks.filter(r => !r.stacked);
  const stacked = rocks.filter(r => r.stacked).sort((a,b) => a.stackOrder - b.stackOrder);

  [...floating, ...stacked].forEach(r=>{
    if(r.img && r.img.complete && r.img.naturalWidth > 0){
      ctx.save();
      ctx.translate(r.x + r.w/2, r.y + r.h/2);
      ctx.rotate(r.angle || 0);
      ctx.drawImage(r.img, -r.w/2, -r.h/2, r.w, r.h);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(r.x + r.w/2, r.y + r.h/2);
      ctx.rotate(r.angle || 0);
      ctx.fillStyle = '#7f6a55';
      ctx.fillRect(-r.w/2, -r.h/2, r.w, r.h);
      ctx.restore();
    }
  });

  // gambar partikel di atas semuanya
  drawParticles();
}

/////////////////////////////////////
// LOOP utama
/////////////////////////////////////
function loop(){
  updatePhysics();
  updateParticles();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/////////////////////////////////////
// ANALYZE button logic: aktif setelah 1 stacked, hanya 1x
/////////////////////////////////////
function enableAnalyzeIfNeeded(){
  const stackedCount = rocks.filter(r=>r.stacked).length;
  if(stackedCount > 0 && !analyzeUsed && analyzeBtn){
    analyzeBtn.disabled = false;
  }
}
function lockAnalyze(){
  analyzeUsed = true;
  if(analyzeBtn){
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Created';
  }
}

if(analyzeBtn){
  analyzeBtn.addEventListener('click', ()=>{
    const stackedCount = rocks.filter(r=>r.stacked).length;
    if(stackedCount === 0){
      if(quoteText) quoteText.textContent = `"Arrange rocks to create a masterpiece."`;
      return;
    }
    const idx = Math.floor(Math.random() * QUOTES.length);
    if(quoteText) quoteText.textContent = `"${QUOTES[idx]}"`;
    lockAnalyze();
  });
}

/////////////////////////////////////
// RESET & CAPTURE (download otomatis)
/////////////////////////////////////
if(resetBtn){
  resetBtn.addEventListener('click', ()=>{
    rocks = [];
    inventoryUsed = new Array(ROCK_ASSETS.length).fill(false);
    document.querySelectorAll('.gal-item').forEach(el=>el.classList.remove('used'));
    if(quoteText) quoteText.textContent = `"Susun batuan untuk menciptakan sebuah mahakarya."`;
    if(nameBox) nameBox.value = '';
    if(nameTag) nameTag.textContent = 'NAMA ANDA';
    analyzeUsed = false; if(analyzeBtn) analyzeBtn.disabled = true; if(analyzeBtn) analyzeBtn.textContent = 'Analisis';
    currentStackOrder = 0;
    particles = [];
  });
}

if(captureBtn){
  captureBtn.addEventListener('click', async () => {
    try {
      const left = document.getElementById('leftPanel');
      if(!left) throw new Error('leftPanel tidak ditemukan');

      const snap = await html2canvas(left, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });

      // download otomatis
      const a = document.createElement('a');
      a.href = snap.toDataURL('image/png');
      a.download = (nameBox && nameBox.value.trim() ? nameBox.value.trim() : 'rock_balance') + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (err) {
      console.error(err);
      alert('Gagal capture. Jalankan lewat server lokal (python -m http.server) atau pastikan gambar memakai akses CORS.');
    }
  });
}

/////////////////////////////////////
// NAME sync & gallery quick-spawn
/////////////////////////////////////
if(nameBox){
  nameBox.addEventListener('input', ()=>{ if(nameTag) nameTag.textContent = nameBox.value.trim() || 'NAMA ANDA'; });
}
if(gallery){
  gallery.addEventListener('click', (ev)=>{
    const slot = ev.target.closest('.gal-item');
    if(!slot) return;
    const idx = Number(slot.dataset.index);
    if(inventoryUsed[idx]) return;
    spawnRockAtCenter(idx);
    inventoryUsed[idx] = true;
    slot.classList.add('used');
    enableAnalyzeIfNeeded();
  });
}

/////////////////////////////////////
// Prevent touch default untuk area app (biar tidak scroll saat drag)
/////////////////////////////////////
['touchstart','touchmove','touchend'].forEach(evtName=>{
  window.addEventListener(evtName, function(e){
    const safeControl = e.target.closest && e.target.closest('input, textarea, button, select, [contenteditable]');
    if(safeControl) return;
    // elemen wrapper app jika ada (tidak dipakai di semua versi)
    const appWrap = document.querySelector('.app');
    if(appWrap && e.target.closest && e.target.closest('.app')){
      e.preventDefault();
    }
  }, { passive:false });
});

/////////////////////////////////////
// INIT
/////////////////////////////////////
(function init(){
  ROCK_ASSETS.forEach((a,i)=>{ const im = new Image(); im.src = a.src; rockImages[i] = im; });
  buildGallery();
  if(analyzeBtn) analyzeBtn.disabled = true;
  // jangan ubah body sizing di file ini — dikelola di HTML/CSS

  /* =========================================================
   DISABLE PAGE SCROLL SELAMA DRAG DI CANVAS / GALLERY
   ========================================================= */
let disableScroll = false;

function preventScroll(e) {
  if (disableScroll) e.preventDefault();
}

// aktifkan monitor scroll-blocker
window.addEventListener("touchmove", preventScroll, { passive: false });
window.addEventListener("wheel", preventScroll, { passive: false });

// Saat pointerdown di canvas → kunci scroll
canvas.addEventListener("pointerdown", () => {
  disableScroll = true;
});

// Saat pointerdown pada item galeri → kunci scroll
document.querySelectorAll(".gal-item").forEach(item => {
  item.addEventListener("pointerdown", () => {
    disableScroll = true;
  }, { passive: false });
});

// Saat pointerup di mana saja → buka scroll kembali
window.addEventListener("pointerup", () => {
  disableScroll = false;
});
  
})();