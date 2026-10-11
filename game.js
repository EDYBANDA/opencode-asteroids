'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define la silueta (verts mirando a +x), el color del trazo y la
// llama del propulsor. La llama cian del power-up "Velocidad" es común a todas
// para que el aviso de boost siempre se distinga.
const SKINS = [
  { name: 'CLÁSICA',     color: '#fff', flame: 'rgba(255,130,0,0.85)',   flameX: -8,
    verts: [[20,0],[-12,-9],[-7,0],[-12,9]] },
  { name: 'INTERCEPTORA', color: '#0ff', flame: 'rgba(255,255,255,0.85)', flameX: -5,
    verts: [[18,0],[-12,-13],[-4,0],[-12,13]] },
  { name: 'AGUJA',       color: '#ffd166', flame: 'rgba(255,80,0,0.85)',  flameX: -6,
    verts: [[26,0],[-9,-5],[-5,0],[-9,5]] },
  { name: 'CAZADOR',     color: '#6f6', flame: 'rgba(180,255,140,0.85)',  flameX: -5,
    verts: [[16,0],[2,-4],[-6,-12],[-9,-4],[-5,0],[-9,4],[-6,12],[2,4]] },
  { name: 'COLIBRÍ',     color: '#f6f', flame: 'rgba(255,120,220,0.85)',  flameX: -6,
    verts: [[13,0],[7,-8],[-6,-9],[-9,-3],[-6,0],[-9,3],[-6,9],[7,8]] },
];

const STORAGE_KEY = 'asteroids-skin';

function loadSkinIndex() {
  try {
    const i = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return Number.isInteger(i) ? Math.min(Math.max(i, 0), SKINS.length - 1) : 0;
  } catch { return 0; }   // localStorage no disponible (p. ej. file://)
}

function saveSkinIndex(i) {
  try { localStorage.setItem(STORAGE_KEY, String(i)); } catch {}
}

let skinIndex = loadSkinIndex();
let skinToast = 0;   // segundos restantes del aviso "NAVE: ..." en el HUD

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  skinToast = 2;
  saveSkinIndex(skinIndex);
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Sintonía de la estrella fugaz
const FUGAZ_SPEED  = 240;   // px/s: mucho más veloz que un asteroide normal
const FUGAZ_TTL    = 8;     // segundos de vida antes de desvanecerse sola
const FUGAZ_POINTS = 250;   // bonus por destruirla
const FUGAZ_RADIUS = 14;    // radio de colisión y de la estrella de 5 puntas

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class EstrellaFugaz extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);
    this.fugaz  = true;
    this.radius = FUGAZ_RADIUS;
    this.points = FUGAZ_POINTS;
    this.ttl    = FUGAZ_TTL;

    // Dirección aleatoria, mucho más veloz que un asteroide normal
    const angle = rand(0, Math.PI * 2);
    const speed = FUGAZ_SPEED + rand(-40, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-3, 3);
  }

  update(dt) {
    if (this.dead) return;
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      return;
    }

    // Estela de chispas doradas
    if (Math.random() < 0.6)
      particles.push(new Particle(this.x, this.y, '255,215,94'));
  }

  split() { return []; }   // no se divide en fragmentos

  draw() {
    if (this.dead) return;
    // Parpadeo justo antes de desvanecerse
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    // Se desvanece gradualmente en los últimos segundos
    const alpha = Math.min(1, this.ttl / 2).toFixed(2);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255,215,94,${alpha})`;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Estrella de 5 puntas
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.45;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-ups ("Velocidad" y "Escudo") ─────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'velocidad') {
    this.type = type;
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(10, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = 10;   // expira si no se recoge
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo al acercarse a expirar
    if (this.ttl < 3 && Math.floor(this.ttl * 8) % 2 === 0) return;

    // Pulso de escala
    const pulse = 1 + 0.12 * Math.sin(this.ttl * 6);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = this.type === 'escudo' ? '#0f0' : '#0ff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    if (this.type === 'escudo') {
      // Hexágono (contorno de escudo)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * 9;
        const py = Math.sin(a) * 9;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      // Rayo estilizado
      ctx.beginPath();
      ctx.moveTo( 3, -8);
      ctx.lineTo(-3,  0);
      ctx.lineTo( 0,  0);
      ctx.lineTo(-3,  8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.speedBoost > 0 ? 520 : 260;  // px/s² (x2 con "Velocidad")
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Abanico de 3 balas mientras dura el triple shot
    if (this.tripleShot > 0) {
      const SPREAD = 0.15;   // rad entre balas
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta de la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const fx = skin.flameX;
      ctx.beginPath();
      ctx.moveTo(fx, -4);
      ctx.lineTo(fx - rand(6, 14), 0);
      ctx.lineTo(fx,  4);
      ctx.strokeStyle = this.speedBoost > 0
        ? 'rgba(0, 255, 255, 0.9)'
        : skin.flame;
      ctx.stroke();
    }

    // Burbuja del escudo (parpadea al expirar)
    if (this.shield > 0 && !(this.shield < 2 && Math.floor(this.shield * 8) % 2 === 0)) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '255,255,255') {
    this.x  = x;
    this.y  = y;
    this.color = color;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let fugazTimer;   // cuenta atrás para la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  fugazTimer = rand(8, 15);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin de la nave (disponible en cualquier estado)
  if (pressed('KeyS')) cycleSkin();
  if (skinToast > 0) skinToast -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Activar triple shot (tecla de prueba)
  if (pressed('KeyT')) ship.tripleShot = 5;

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Aparición aleatoria de la estrella fugaz
  fugazTimer -= dt;
  if (fugazTimer <= 0) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - ship.x, y - ship.y) < 160);   // nunca encima de la nave
    asteroids.push(new EstrellaFugaz(x, y));
    fugazTimer = rand(8, 15);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.fugaz ? 12 : a.size * 5, a.fugaz ? '255,215,94' : undefined);
        newAsteroids.push(...a.split());
        if (Math.random() < 0.12)
          powerups.push(new PowerUp(a.x, a.y, Math.random() < 0.5 ? 'velocidad' : 'escudo'));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide (con escudo, el asteroide se destruye sin dar puntos)
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield > 0) {
          a.dead = true;
          explode(a.x, a.y, a.fugaz ? 12 : a.size * 5, '0,255,0');
          asteroids.push(...a.split());
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerups) {
      if (dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        if (p.type === 'escudo') {
          ship.shield = 5;
          explode(ship.x, ship.y, 6, '0,255,0');
        } else {
          ship.speedBoost = 5;
          explode(ship.x, ship.y, 6, '0,255,255');
        }
        break;
      }
    }
  }

  // Nivel completado (las estrellas fugaces no bloquean el avance)
  if (asteroids.every(a => a.fugaz)) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.5, 0.5);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 2.4;   // compensa el scale(0.5) para un trazo de 1.2 px
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  // Power-ups activos, apilados bajo el score
  let py = 46;
  if (state === 'playing' && ship.speedBoost > 0) {
    ctx.fillStyle = '#0ff';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, 14, py);
    py += 20;
  }
  if (state === 'playing' && ship.tripleShot > 0) {
    ctx.fillStyle = '#ff0';
    ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}s`, 14, py);
    py += 20;
  }
  if (state === 'playing' && ship.shield > 0) {
    ctx.fillStyle = '#0f0';
    ctx.fillText(`ESCUDO ${ship.shield.toFixed(1)}s`, 14, py);
  }
  ctx.fillStyle = '#fff';

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Aviso temporal del nombre de la skin activa (se desvanece)
  if (skinToast > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, skinToast).toFixed(2)})`;
    ctx.fillText(`NAVE: ${SKINS[skinIndex].name}`, W / 2, H - 14);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
