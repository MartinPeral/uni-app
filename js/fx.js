// =============================================================
//  fx.js — Vibración, animaciones y gestos táctiles
//  (deslizar filas, mantener pulsado y deslizar para cambiar)
// =============================================================

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Vibración ----------

let switchLabel;

/**
 * Vibración corta. En Android usa navigator.vibrate; en iPhone (iOS 18+)
 * se consigue activando un interruptor oculto, que hace vibrar el Taptic Engine.
 */
export function haptic(kind = 'light') {
  if (navigator.vibrate) {
    navigator.vibrate(kind === 'success' ? [12, 60, 18] : kind === 'heavy' ? 30 : 10);
    return;
  }
  try {
    if (!switchLabel) {
      switchLabel = document.createElement('label');
      switchLabel.setAttribute('aria-hidden', 'true');
      switchLabel.className = 'haptic';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      switchLabel.appendChild(input);
      document.body.appendChild(switchLabel);
    }
    switchLabel.click();
    if (kind === 'success' || kind === 'heavy') setTimeout(() => switchLabel.click(), 110);
  } catch { /* sin vibración */ }
}

// ---------- Números que cuentan ----------

/** Anima los elementos con data-count desde 0 hasta su valor */
export function countUp(root = document) {
  const els = root.querySelectorAll('[data-count]');
  if (!els.length || reduced()) return;
  const t0 = performance.now();
  const dur = 750;
  const items = [...els].map((el) => ({
    el,
    to: +el.dataset.count,
    dec: +(el.dataset.dec ?? 2),
    suffix: el.dataset.suffix || '',
    final: el.textContent,
  }));
  const fmt = (n, d) => n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - (1 - k) ** 3;
    for (const x of items) {
      if (!x.el.isConnected) continue;
      x.el.textContent = k >= 1 ? x.final : fmt(x.to * e, x.dec) + x.suffix;
    }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Confeti ----------

export function confetti({ x = innerWidth / 2, y = innerHeight / 3, power = 1, colors } = {}) {
  if (reduced()) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const pal = colors || ['#7c9cff', '#3ddc97', '#f7c948', '#ff6b8b', '#c084fc', '#2dd4bf'];
  const n = Math.round(70 * power);
  const parts = [...Array(n)].map(() => {
    const a = Math.random() * Math.PI * 2;
    const v = (4 + Math.random() * 7) * Math.sqrt(power);
    return {
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 5 * Math.sqrt(power),
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      col: pal[(Math.random() * pal.length) | 0],
    };
  });
  const t0 = performance.now();
  const frame = (now) => {
    const k = (now - t0) / 1600;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - k * k);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.col;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      g.restore();
    }
    if (k < 1) requestAnimationFrame(frame);
    else c.remove();
  };
  requestAnimationFrame(frame);
}

/** Confeti saliendo de un elemento */
export const burstFrom = (el, power = 0.5) => {
  const r = el.getBoundingClientRect();
  confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, power });
};

// ---------- Evitar el toque que sigue a un gesto ----------

let swallowUntil = 0;
const swallow = () => { swallowUntil = Date.now() + 450; };
document.addEventListener('click', (e) => {
  if (Date.now() < swallowUntil) {
    e.stopPropagation();
    e.preventDefault();
    swallowUntil = 0;
  }
}, true);

// ---------- Gestos ----------

const handlers = { swipe: null, long: null, nav: null };

/** Registra qué hacer con cada gesto */
export function onGestures(h) { Object.assign(handlers, h); }

let g = null; // gesto en curso

const SWIPE_AT = 84; // px para activar la acción al deslizar
const LONG_MS = 460;

document.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || e.target.closest('input, textarea, select, .no-gesture')) return;
  const row = e.target.closest('.swipe');
  const long = e.target.closest('[data-long]');
  const nav = e.target.closest('[data-swipe-nav]');
  if (!row && !long && !nav) return;
  g = {
    id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0,
    row, long, nav, axis: null, fired: false,
    slide: row?.querySelector('.row-slide'),
  };
  if (long) {
    g.timer = setTimeout(() => {
      if (!g || g.axis) return;
      g.fired = true;
      haptic('heavy');
      swallow();
      long.classList.add('pressed');
      setTimeout(() => long.classList.remove('pressed'), 250);
      handlers.long?.(long);
    }, LONG_MS);
  }
}, { passive: true });

document.addEventListener('pointermove', (e) => {
  if (!g || e.pointerId !== g.id) return;
  g.dx = e.clientX - g.x;
  g.dy = e.clientY - g.y;
  if (!g.axis && Math.hypot(g.dx, g.dy) > 9) {
    g.axis = Math.abs(g.dx) > Math.abs(g.dy) ? 'x' : 'y';
    clearTimeout(g.timer);
    if (g.axis === 'y') { g = null; return; }
  }
  if (g.axis !== 'x') return;
  if (g.row && g.slide) {
    const dir = g.dx > 0 ? 'right' : 'left';
    const allowed = g.row.dataset[dir] ? 1 : 0.15; // resistencia si no hay acción
    const raw = g.dx * allowed;
    const x = Math.sign(raw) * Math.min(Math.abs(raw), 140 + Math.max(0, Math.abs(raw) - 140) * 0.25);
    g.slide.style.transition = 'none';
    g.slide.style.transform = `translateX(${x}px)`;
    g.row.classList.toggle('show-right', g.dx > 0);
    g.row.classList.toggle('show-left', g.dx < 0);
    const armed = Math.abs(g.dx) >= SWIPE_AT && !!g.row.dataset[dir];
    if (armed !== !!g.armed) {
      g.armed = armed;
      g.row.classList.toggle('armed', armed);
      if (armed) haptic();
    }
  }
}, { passive: true });

function end(e) {
  if (!g || (e && e.pointerId !== g.id)) return;
  clearTimeout(g.timer);
  const cur = g;
  g = null;
  if (cur.axis !== 'x' || cur.fired) return;
  swallow();
  if (cur.row && cur.slide) {
    const dir = cur.dx > 0 ? 'right' : 'left';
    const act = Math.abs(cur.dx) >= SWIPE_AT ? cur.row.dataset[dir] : null;
    cur.slide.style.transition = '';
    if (act && dir === 'left' && cur.row.dataset.leftOut) {
      // Sale por la izquierda (borrar)
      cur.slide.style.transform = 'translateX(-110%)';
      cur.row.classList.add('leaving');
      setTimeout(() => handlers.swipe?.(cur.row, act), 200);
    } else {
      cur.slide.style.transform = '';
      if (act) handlers.swipe?.(cur.row, act);
    }
    setTimeout(() => cur.row.classList.remove('armed', 'show-left', 'show-right'), 250);
    return;
  }
  if (cur.nav && Math.abs(cur.dx) > 60) {
    haptic();
    handlers.nav?.(cur.nav, cur.dx < 0 ? 1 : -1);
  }
}

document.addEventListener('pointerup', end);
document.addEventListener('pointercancel', (e) => {
  if (!g || e.pointerId !== g.id) return;
  clearTimeout(g.timer);
  if (g.slide) g.slide.style.transform = '';
  g.row?.classList.remove('armed', 'show-left', 'show-right');
  g = null;
});

// En iPhone, mantener pulsado abre el menú del sistema: lo evitamos en lo que tiene menú propio
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('[data-long]')) e.preventDefault();
});
