// =============================================================
//  app.js — Interfaz: navegación, pantallas y acciones
// =============================================================

import * as S from './store.js';
import * as St from './study.js';
import { haptic, countUp, confetti, burstFrom, onGestures } from './fx.js';
import * as Pl from './plan.js';
import * as SP from './studyplan.js';
import { askTutor, aiUrl, DEFAULT_AI_URL, splitPlan, renderMarkdown } from './ai.js';

const APP_VERSION = '3.2';

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const toastEl = document.getElementById('toast');
const snackEl = document.getElementById('snack');
const miniEl = document.getElementById('minitimer');

// ---------- Utilidades ----------

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Número en formato español: 7,25 */
const fmt = (n, d = 2) =>
  n == null || Number.isNaN(+n) ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: d });

/** Lee un número escrito con coma o punto. Devuelve null si está vacío */
const parseNum = (v) => {
  if (v == null) return null;
  const t = String(v).trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const pct = (f) => `${fmt(f * 100, 0)} %`;

const dfmt = (str, o) => new Intl.DateTimeFormat('es-ES', o).format(S.toDate(str));
const longDate = (str) => cap(dfmt(str, { weekday: 'long', day: 'numeric', month: 'long' }));
const shortDate = (str) => dfmt(str, { weekday: 'short', day: 'numeric', month: 'short' });
const dayMonth = (str) => dfmt(str, { day: 'numeric', month: 'short' });

function rel(str) {
  const n = S.daysUntil(str);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  if (n > 1) return `En ${n} días`;
  return `Hace ${-n} días`;
}

function greeting() {
  const h = new Date().getHours();
  return h >= 6 && h < 13 ? 'Buenos días' : h >= 13 && h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

let toastTimer;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ---------- Iconos (SVG) ----------

const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  plusSm: svg('<path d="M12 5v14M5 12h14"/>', 'width="18" height="18"'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.8" width="16" height="16"'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  chevron: svg('<path d="M9 18l6-6-6-6"/>', 'width="18" height="18"'),
  left: svg('<path d="M15 18l-6-6 6-6"/>', 'width="20" height="20"'),
  right: svg('<path d="M9 18l6-6-6-6"/>', 'width="20" height="20"'),
  x: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  xs: svg('<path d="M18 6L6 18M6 6l12 12"/>', 'width="16" height="16"'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>', 'width="18" height="18"'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', 'width="18" height="18"'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'width="15" height="15"'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 'width="15" height="15"'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', 'width="18" height="18"'),
  link: svg('<path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1"/>', 'width="18" height="18"'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>', 'width="18" height="18"'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', 'width="18" height="18"'),
  upload: svg('<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>', 'width="18" height="18"'),
  cal: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>', 'width="18" height="18"'),
  calAdd: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M12 13v5M9.5 15.5h5"/>', 'width="18" height="18"'),
  sparkle: svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>', 'width="18" height="18"'),
  alert: svg('<path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4.5M12 17.5v.01"/>', 'width="18" height="18"'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>', 'width="14" height="14"'),
  book: svg('<path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5z"/><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>', 'width="40" height="40" stroke-width="1.6"'),
  cap: svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>', 'width="40" height="40" stroke-width="1.6"'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>', 'width="18" height="18"'),
  // Tipos de evaluable
  examen: svg('<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>', 'width="18" height="18"'),
  practica: svg('<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3"/><path d="M7 15h10"/>', 'width="18" height="18"'),
  entrega: svg('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', 'width="18" height="18"'),
  otro: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/>', 'width="18" height="18"'),
  send: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 'width="20" height="20" stroke-width="2.6"'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>', 'width="18" height="18"'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>', 'width="18" height="18"'),
  playBig: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>', 'width="22" height="22"'),
  pause: svg('<path d="M8 5v14M16 5v14"/>', 'width="20" height="20" stroke-width="3"'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>', 'width="18" height="18"'),
  skip: svg('<path d="M5 5l9 7-9 7z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>', 'width="18" height="18"'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>', 'width="18" height="18"'),
  flame: svg('<path d="M12 22c4 0 7-2.7 7-6.8 0-4.4-3.6-6.8-4.6-10.7-.2-.8-1.2-1-1.6-.3C11.7 6.3 11 8.5 11 10c-1-.6-1.6-1.9-1.8-2.8-.1-.6-.9-.8-1.2-.3C6.5 9 5 11.5 5 15.2 5 19.3 8 22 12 22z" fill="currentColor" stroke="none"/>', 'width="16" height="16"'),
  copy: svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/>', 'width="18" height="18"'),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>', 'width="18" height="18"'),
  brain: svg('<path d="M9.5 3a3 3 0 00-3 3v.2A3 3 0 004 9a3 3 0 001 2.2A3.2 3.2 0 004 14a3 3 0 002.5 3A3 3 0 009.5 21 2.5 2.5 0 0012 18.5V5.5A2.5 2.5 0 009.5 3zM14.5 3a3 3 0 013 3v.2A3 3 0 0120 9a3 3 0 01-1 2.2 3.2 3.2 0 011 2.8 3 3 0 01-2.5 3 3 3 0 01-3 4 2.5 2.5 0 01-2.5-2.5"/>', 'width="40" height="40" stroke-width="1.6"'),
  wand: svg('<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/>', 'width="18" height="18"'),
};

// ---------- Navegación (rutas con #) ----------

const route = () => {
  const [name = 'inicio', id] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'inicio', id };
};

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

const TAB_OF = {
  inicio: 'inicio', ajustes: 'inicio',
  asignaturas: 'asignaturas', asignatura: 'asignaturas',
  agenda: 'agenda',
  notas: 'notas',
  estudio: 'estudio',
  plan: 'inicio',
  'plan-estudio': 'estudio',
  tutor: 'inicio',
};
const DEPTH = { asignatura: 1, ajustes: 1, plan: 1, tutor: 2, 'plan-estudio': 1 };
let enterTimer;
const NO_TABS = ['ajustes'];

let lastRouteKey = '';

function render() {
  const r = route();
  const views = {
    inicio: viewHome,
    asignaturas: viewSubjects,
    asignatura: viewSubject,
    agenda: viewAgenda,
    notas: viewRecord,
    ajustes: viewSettings,
    estudio: viewStudy,
    plan: viewPlan,
    'plan-estudio': viewStudyPlan,
    tutor: viewTutor,
  };
  const view = views[r.name];
  if (!view) return go('#/inicio');

  const html = view(r);
  if (html == null) return; // la vista ha redirigido
  app.innerHTML = html;

  document.body.classList.toggle('no-tabs', NO_TABS.includes(r.name));
  document.querySelectorAll('#tabbar a').forEach((a) =>
    a.classList.toggle('active', a.dataset.tab === TAB_OF[r.name]));

  const key = r.name + '/' + (r.id || '');
  const changed = key !== lastRouteKey;
  if (changed) {
    window.scrollTo(0, 0);
    // Animación de entrada: hacia dentro, hacia atrás o fundido
    const prev = lastRouteKey.split('/')[0];
    const a = DEPTH[r.name] || 0;
    const b = DEPTH[prev] || 0;
    const dir = !prev ? 'fade' : a > b ? 'fwd' : a < b ? 'back' : 'fade';
    // Mientras se ve la animación de apertura, la entrada se reserva para después
    if (!document.getElementById('splash')) playEnter(dir);
  }
  lastRouteKey = key;
  afterRender(r);
  tickStudy();
}

/** Anima la entrada del contenido de la pantalla */
function playEnter(dir = 'fade') {
  app.classList.remove('enter-fwd', 'enter-back', 'enter-fade');
  void app.offsetWidth;
  app.classList.add(`enter-${dir}`);
  app.querySelectorAll('.stack > *, .glance > *, .exam-scroll > *, .stats > *, .plan > *').forEach((el, i) =>
    el.style.setProperty('--i', Math.min(i % 12, 10)));
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => app.classList.remove('enter-fwd', 'enter-back', 'enter-fade'), 800);
  countUp(app);
}

/** Redibuja con un fundido suave del contenido de la pestaña */
function renderTab() {
  render();
  const body = app.querySelector('.tab-body');
  if (!body) return;
  body.classList.remove('tab-in');
  void body.offsetWidth;
  body.classList.add('tab-in');
}

window.addEventListener('hashchange', () => { simOn = false; render(); });

function afterRender(r) {
  // Línea de "ahora" en el horario semanal
  if (r.name === 'agenda' && agendaView === 'week') {
    const now = app.querySelector('.wk-now');
    if (now && weekOffset === 0) now.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  }
}

// ---------- Tema ----------

function applyTheme() {
  const t = S.state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0d12' : '#f4f5f9');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ---------- Piezas comunes ----------

const subjColor = (s) => s?.color || 'var(--muted)';

const topBar = (title, { back, action = '' } = {}) => `
  <div class="bar">
    <button class="icon-btn" data-action="nav" data-to="${back}" aria-label="Volver">${I.back}</button>
    <strong>${title}</strong>
    <div class="bar-action">${action}</div>
  </div>`;

const kindTag = (k) => `<span class="kind k-${k}">${I[k]}${S.KINDS[k].label}</span>`;

/** Nota con color según el resultado */
const gradeBadge = (g, { honors = false, size = '' } = {}) =>
  g == null
    ? `<span class="gbadge none ${size}">—</span>`
    : `<span class="gbadge t-${S.gradeTone(g)} ${size}">${fmt(g)}${honors ? ` ${I.star}` : ''}</span>`;

/** Arco de un anillo (se anima al entrar en la pantalla) */
const arc = (size, r, C, frac, color, stroke, opacity = '1') => `
  <circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${stroke}"
    stroke-dasharray="${C} ${C}" stroke-dashoffset="${C * (1 - Math.min(1, frac))}" style="--len:${C}"
    transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/>`;

/** Número que se anima al entrar */
const counted = (n, d = 2) => (n == null ? '—' : `<span data-count="${n}" data-dec="${d}">${fmt(n, d)}</span>`);

/** Nota de un apartado: sobre 10 o, si va en puntos, "2,4/3" */
function compBadge(p) {
  if (!p.comp.points || p.avg == null) return gradeBadge(p.avg);
  const of = (+p.comp.weight || 0) / 10;
  const low = p.min != null && p.avg < p.min;
  return `<span class="gbadge pts t-${low ? 'bad' : S.gradeTone(p.avg)}">${fmt(S.toPoints(p.comp, p.avg))}<small>/${fmt(of)}</small></span>`;
}

/** Anillo de progreso: puntos asegurados sobre 10 */
function ring(c, { size = 120, stroke = 10, color = 'var(--accent)' } = {}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pass = (+S.state.settings.passMark || 5) / 10;
  const done = Math.min(1, c.points / 10);
  const pending = Math.min(1 - done, c.pendingW);
  const tick = (a) => {
    const ang = a * 2 * Math.PI - Math.PI / 2;
    const x1 = size / 2 + (r - stroke / 2 - 2) * Math.cos(ang);
    const y1 = size / 2 + (r - stroke / 2 - 2) * Math.sin(ang);
    const x2 = size / 2 + (r + stroke / 2 + 2) * Math.cos(ang);
    const y2 = size / 2 + (r + stroke / 2 + 2) * Math.sin(ang);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--text)" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
  };
  return `
    <svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
      ${done + pending > 0.005 ? arc(size, r, C, done + pending, color, stroke, '.28') : ''}
      ${done > 0.005 ? arc(size, r, C, done, color, stroke) : ''}
      ${tick(pass)}
    </svg>`;
}

/** Barra apilada con los apartados de evaluación */
function compBar(c, s) {
  if (!c.parts.length) return '';
  return `<div class="cbar" style="--c:${subjColor(s)}">${c.parts.filter((p) => !p.optional && !p.req).map((p) => `
    <span style="flex:${Math.max(p.weight, 0.001)}" title="${esc(p.comp.name)}">
      <i style="width:${p.avg == null ? 0 : (p.avg / 10) * p.share * 100}%"></i>
    </span>`).join('')}</div>`;
}

/** Texto de estado de una asignatura */
function statusInfo(s, c) {
  const pass = +S.state.settings.passMark || 5;
  const pending = pct(c.pendingW);
  switch (c.status) {
    case 'nodata': return { tone: 'muted', title: 'Sin método de evaluación', text: 'Añade cómo se evalúa para calcular tu nota.' };
    case 'start': return { tone: 'muted', title: 'Aún sin notas', text: `Necesitas una media de ${fmt(pass)} para aprobar.` };
    case 'ontrack': return { tone: 'ok', title: `Necesitas un ${fmt(c.need)}`, text: `de media en lo que queda (${pending} de la nota).` };
    case 'hard': return { tone: 'warn', title: `Necesitas un ${fmt(c.need)}`, text: `de media en lo que queda (${pending}). Toca apretar.` };
    case 'secured': return { tone: 'good', title: c.reqPending.length ? 'Nota asegurada' : 'Aprobado asegurado', text: c.reqPending.length ? `Solo te falta superar ${c.reqPending.map((p) => p.comp.name).join(' y ')}.` : c.minsPending.length ? 'Te falta llegar a las notas mínimas que quedan.' : 'Aunque saques un 0 en lo que queda.' };
    case 'reqpending': {
      const r = c.reqPending[0];
      return { tone: 'warn', title: `Te falta ${r.comp.name}`, text: `Con ${fmt(c.points)} aprobarías, pero antes tienes que sacar al menos un ${fmt(r.min)}${r.avg != null ? ` (llevas ${fmt(r.avg)})` : ''}.` };
    }
    case 'impossible': return { tone: 'bad', title: 'No llegas por continua', text: `Necesitarías un ${fmt(c.need)} en lo que queda. Prepara la siguiente convocatoria.` };
    case 'passed': return { tone: 'good', title: s.final ? `Aprobada con ${fmt(s.final.grade)}` : `Aprobada con ${fmt(c.points)}`, text: s.final ? S.gradeLabel(+s.final.grade, s.final.honors) : 'Ya tienes todas las notas. Pon la nota del acta cuando salga.' };
    case 'retake': {
      const f = c.itemFails[0];
      return { tone: 'bad', title: 'Tienes que recuperar', text: `En ${f.item.title} sacaste ${fmt(f.grade)} y el mínimo es ${fmt(f.min)}.${c.itemFails.length > 1 ? ` Y ${c.itemFails.length - 1} más.` : ''}` };
    }
    case 'failed': {
      const m = c.parts.find((p) => p.failsMin);
      const pr = c.periods.find((p) => p.failsMin);
      const f = c.itemFails[0];
      const text = s.final ? S.gradeLabel(+s.final.grade)
        : m ? (m.comp.points
          ? `No llegas al mínimo en ${m.comp.name}: tienes ${fmt(S.toPoints(m.comp, m.avg))} de ${fmt((+m.comp.weight || 0) / 10)} y necesitas ${fmt(m.comp.min)}.`
          : `No llegas a la nota mínima en ${m.comp.name} (${fmt(m.avg)} de ${fmt(m.min)}).`)
          : pr ? `No llegas a la mínima del ${S.PERIODS[pr.period]} (${fmt(pr.avg)} de ${fmt(pr.min)}).`
            : f ? `En ${f.item.title} no llegas al mínimo (${fmt(f.grade)} de ${fmt(f.min)}).`
              : 'No llegas al aprobado con estas notas.';
      return { tone: 'bad', title: s.final ? `Suspensa (${fmt(s.final.grade)})` : 'Suspensa', text };
    }
    default: return { tone: 'muted', title: '', text: '' };
  }
}

/** Fila de evaluable para listas */
function itemRow(it, { showSubject = true, showDate = true } = {}) {
  const s = S.subject(it.subjectId);
  const g = S.grade10(it);
  const deliverable = (it.kind === 'practica' && !it.exam) || it.kind === 'entrega';
  const late = it.date && S.daysUntil(it.date) < 0 && S.isPending(it) && deliverable;
  const right = g != null
    ? gradeBadge(g)
    : deliverable
      ? `<button class="tick ${it.done ? 'on' : ''}" data-action="toggle-done" data-id="${it.id}" aria-label="${it.done ? 'Marcar como no entregada' : 'Marcar como entregada'}">${I.check}</button>`
      : '';
  const meta = [
    showDate && it.date ? `<span class="${late ? 'text-bad' : ''}">${dayMonth(it.date)}${it.time ? ' · ' + it.time : ''}</span>` : '',
    showDate && it.date && S.isPending(it) ? `<span class="${late ? 'text-bad' : ''}">${rel(it.date)}</span>` : '',
    it.place ? `<span>${esc(it.place)}</span>` : '',
    !showDate && it.time ? `<span>${it.time}</span>` : '',
    deliverable && it.done && g == null ? '<span class="text-good">Entregada</span>' : '',
  ].filter(Boolean).join('<i class="dot"></i>');
  const swipeRight = deliverable && g == null ? 'done' : 'grade';
  const rightLabel = swipeRight === 'done' ? (it.done ? `${I.undo} Pendiente` : `${I.check} Entregada`) : `${I.edit} Poner nota`;
  return `
    <div class="row-item swipe" data-id="${it.id}" data-right="${swipeRight}" data-left="delete" data-left-out="1" data-long="item" style="--c:${subjColor(s)}">
      <div class="swipe-bg"><span class="sw-right ${swipeRight}">${rightLabel}</span><span class="sw-left">Eliminar ${I.trash}</span></div>
      <div class="row-slide">
        <button class="row-main" data-action="edit-item" data-id="${it.id}">
          <span class="kicon k-${it.kind}">${I[it.kind]}</span>
          <span class="row-text">
            <strong>${esc(it.title || S.KINDS[it.kind].label)}</strong>
            <small>${showSubject && s ? `<b class="sdot"></b>${esc(S.shortName(s))}${meta ? '<i class="dot"></i>' : ''}` : ''}${meta}</small>
          </span>
        </button>
        ${right}
      </div>
    </div>`;
}

const empty = (icon, title, text, button = '') => `
  <div class="empty">${icon}<strong>${title}</strong><p>${text}</p>${button}</div>`;

const fab = () => `<button class="fab" data-action="quick-add" aria-label="Añadir">${I.plus}</button>`;

// =============================================================
//  INICIO
// =============================================================

/** Grupo de una clase: el suyo o el de la asignatura para ese bloque */
const slotGroup = (c) => c.slot.group || S.groupOf(c.s, S.slotArea(c.slot.type));

function nowCard() {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const today = S.classesOn(now);
  const cur = today.find((c) => m >= S.minutes(c.slot.start) && m < S.minutes(c.slot.end));
  const next = today.find((c) => S.minutes(c.slot.start) > m);

  const slotLine = (c) => `${esc(c.slot.type || 'Clase')}${c.slot.room ? ' · ' + esc(c.slot.room) : ''}${slotGroup(c) ? ' · ' + esc(slotGroup(c)) : ''}`;

  if (cur) {
    const a = S.minutes(cur.slot.start);
    const b = S.minutes(cur.slot.end);
    const left = b - m;
    return `
      <a class="card now" href="#/asignatura/${cur.s.id}" style="--c:${subjColor(cur.s)}">
        <span class="now-label live">Ahora en clase</span>
        <strong class="now-title">${esc(cur.s.name)}</strong>
        <span class="now-meta">${slotLine(cur)} · termina a las ${cur.slot.end} (${left} min)</span>
        <div class="now-bar"><i style="width:${((m - a) / (b - a)) * 100}%"></i></div>
        ${next ? `<span class="now-next">Después: ${esc(S.shortName(next.s))} a las ${next.slot.start}</span>` : ''}
      </a>`;
  }
  if (next) {
    const inMin = S.minutes(next.slot.start) - m;
    const when = inMin < 60 ? `en ${inMin} min` : `a las ${next.slot.start}`;
    return `
      <a class="card now" href="#/asignatura/${next.s.id}" style="--c:${subjColor(next.s)}">
        <span class="now-label">Siguiente clase · ${when}</span>
        <strong class="now-title">${esc(next.s.name)}</strong>
        <span class="now-meta">${next.slot.start}–${next.slot.end} · ${slotLine(next)}</span>
      </a>`;
  }
  // Busca el próximo día con clase
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const list = S.classesOn(d);
    if (!list.length) continue;
    const f = list[0];
    const label = i === 1 ? 'Mañana' : cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(d));
    return `
      <a class="card now" href="#/agenda" data-action="go-week" style="--c:${subjColor(f.s)}">
        <span class="now-label">${today.length ? 'Hoy ya no tienes más clases' : 'Hoy no tienes clase'}</span>
        <strong class="now-title">${label}: ${esc(f.s.name)}</strong>
        <span class="now-meta">Empiezas a las ${f.slot.start} · ${list.length} ${list.length === 1 ? 'clase' : 'clases'}</span>
      </a>`;
  }
  return '';
}

function todayList() {
  const list = S.classesOn(new Date());
  if (!list.length) return '';
  const m = new Date().getHours() * 60 + new Date().getMinutes();
  return `
    <h2 class="section-title">Clases de hoy <span class="count">${list.length}</span></h2>
    <div class="card flush timeline">${list.map((c) => {
      const past = S.minutes(c.slot.end) <= m;
      return `
        <a class="tl-row ${past ? 'past' : ''}" href="#/asignatura/${c.s.id}" style="--c:${subjColor(c.s)}">
          <span class="tl-time"><b>${c.slot.start}</b><small>${c.slot.end}</small></span>
          <span class="tl-bar"></span>
          <span class="row-text"><strong>${esc(c.s.name)}</strong><small>${esc(c.slot.type || '')}${c.slot.room ? ' · ' + esc(c.slot.room) : ''}${slotGroup(c) ? ' · Grupo ' + esc(slotGroup(c)) : ''}</small></span>
        </a>`;
    }).join('')}</div>`;
}

function examCards() {
  const exams = S.upcoming({ exams: true }).slice(0, 4);
  if (!exams.length) return '';
  return `
    <h2 class="section-title">Próximos exámenes</h2>
    <div class="exam-scroll">${exams.map((it) => {
      const s = S.subject(it.subjectId);
      const n = S.daysUntil(it.date);
      return `
        <button class="exam-card ${n <= 7 ? 'soon' : ''}" data-action="edit-item" data-id="${it.id}" data-long="item" style="--c:${subjColor(s)}">
          <span class="exam-days"><b>${n === 0 ? 'Hoy' : n}</b>${n === 0 ? '' : n === 1 ? 'día' : 'días'}</span>
          <strong>${esc(s.name)}</strong>
          <small>${esc(it.title)}${it.kind === 'practica' ? ' <em class="ptag">Prácticas</em>' : ''}</small>
          <small class="muted">${shortDate(it.date)}${it.time ? ' · ' + it.time : ''}${it.place ? '<br>' + esc(it.place) : ''}</small>
        </button>`;
    }).join('')}</div>`;
}

function pendingList() {
  const late = S.overdue();
  const next = S.upcoming({ kinds: ['practica', 'entrega', 'otro'], days: 21 });
  const list = [...late, ...next].slice(0, 8);
  if (!list.length) return '';
  return `
    <h2 class="section-title">Entregas y prácticas <span class="count">${list.length}</span></h2>
    <div class="card flush">${list.map((it) => itemRow(it)).join('')}</div>`;
}

function statsRow() {
  const r = S.record();
  const active = S.activeSubjects();
  return `
    <div class="stats">
      <a class="stat" href="#/notas"><strong>${counted(r.weighted)}</strong><span>Media</span></a>
      <a class="stat" href="#/notas"><strong>${counted(r.credits, 1)}</strong><span>Créditos</span></a>
      <a class="stat" href="#/asignaturas"><strong>${counted(active.length, 0)}</strong><span>En curso</span></a>
    </div>`;
}

/** Resumen rápido de cómo va cada asignatura */
function subjectsGlance() {
  const list = S.activeSubjects().filter(S.inCurrentTerm);
  if (!list.length) return '';
  return `
    <h2 class="section-title">Este cuatrimestre</h2>
    <div class="glance">${list.map((s) => {
      const c = S.calc(s);
      const info = statusInfo(s, c);
      return `
        <a class="glance-item" href="#/asignatura/${s.id}" data-long="subject" data-id="${s.id}" style="--c:${subjColor(s)}">
          <span class="glance-name"><b class="sdot"></b>${esc(S.shortName(s))}</span>
          ${gradeBadge(c.current)}
          <small class="tone-${info.tone}">${c.status === 'ontrack' || c.status === 'hard' ? `Necesitas ${fmt(c.need)}` : esc(info.title)}</small>
        </a>`;
    }).join('')}</div>`;
}

function viewHome() {
  const st = S.state.settings;
  const today = S.ymd();
  const head = `
    <header class="top">
      <div>
        <p class="eyebrow">${longDate(today)}</p>
        <h1>${greeting()}${st.name ? `, ${esc(st.name)}` : ''}</h1>
      </div>
      <button class="icon-btn" data-action="nav" data-to="#/ajustes" aria-label="Ajustes">${I.gear}</button>
    </header>`;

  if (!S.state.subjects.length) {
    return `${head}
      <div class="card onboard">
        ${I.cap}
        <h2>Organiza tu curso</h2>
        <p>Añade tus asignaturas con su horario y cómo se evalúan. UniLog calcula tu nota, te dice lo que necesitas para aprobar y te avisa de lo que viene.</p>
        <button class="btn primary block" data-action="new-subject">${I.plusSm} Añadir asignatura</button>
        <button class="btn ghost block" data-action="add-past">Añadir una asignatura ya aprobada</button>
        <button class="btn text block" data-action="load-demo">Ver con datos de ejemplo</button>
      </div>`;
  }

  return `${head}
    ${S.state.demo ? `<div class="demo-note">${I.sparkle}<span>Estás viendo datos de ejemplo.</span><button class="btn sm" data-action="clear-demo">Empezar de cero</button></div>` : ''}
    ${Pl.dayBlocks(S.ymd()).length ? '' : nowCard()}
    ${dayCard()}
    ${tutorCard()}
    ${studyHomeCard()}
    ${examCards()}
    ${pendingList()}
    ${subjectsGlance()}
    <h2 class="section-title">Expediente</h2>
    ${statsRow()}
    <p class="foot">UniLog ${APP_VERSION}</p>
    ${fab()}`;
}

// =============================================================
//  ASIGNATURAS
// =============================================================

let subjFilter = 'year';

function subjectCard(s) {
  const c = S.calc(s);
  const g = s.final ? +s.final.grade : c.current;
  const next = S.itemsOf(s.id).filter((i) => i.date && i.date >= S.ymd() && S.isPending(i)).sort(S.byDate)[0];
  const info = statusInfo(s, c);
  return `
    <a class="card subj" href="#/asignatura/${s.id}" data-long="subject" data-id="${s.id}" style="--c:${subjColor(s)}">
      <div class="subj-top">
        <div class="subj-name">
          <strong>${esc(s.name)}</strong>
          <small>${fmt(s.credits, 1)} ECTS · ${s.year}.º curso${subjFilter === 'past' ? ' · ' + S.TERMS[s.term] : ''}</small>
        </div>
        ${gradeBadge(g, { honors: s.final?.honors, size: 'lg' })}
      </div>
      ${s.final ? '' : compBar(c, s)}
      ${s.final ? '' : areaMini(c)}
      <div class="subj-foot">
        <span class="tone-${info.tone}">${esc(info.title)}</span>
        ${next ? `<span class="muted">${S.KINDS[next.kind].label} · ${rel(next.date).toLowerCase()}</span>` : ''}
      </div>
    </a>`;
}

/** Resumen corto: Teoría 6,4 · Prácticas 8,5 */
function areaMini(c) {
  if (c.cuatris?.length) {
    return `<div class="area-mini">${c.cuatris.map((q) =>
      `<span class="period"><b>${S.PERIOD_SHORT[q.period]}</b> ${q.grade == null ? '—' : fmt(q.grade)}</span>`).join('')}</div>`;
  }
  if (c.split) {
    return `<div class="area-mini">${c.periods.map((p) =>
      `<span class="period"><b>${S.PERIOD_SHORT[p.period]}</b> ${p.avg == null ? '—' : fmt(p.avg)}</span>`).join('')}</div>`;
  }
  const list = c.areas.filter((a) => a.area !== 'otro');
  if (!list.length) return '';
  return `<div class="area-mini">${list.map((a) =>
    `<span class="${a.area}"><b>${S.AREAS[a.area].label}</b> ${a.avg == null ? '—' : fmt(a.avg)}</span>`).join('')}</div>`;
}

const byName = (a, b) => a.year - b.year || a.name.localeCompare(b.name);

/** Cabecera de un grupo con número de asignaturas y créditos */
function groupHead(title, arr, badge = '') {
  const credits = arr.reduce((a, s) => a + (+s.credits || 0), 0);
  return `
    <h2 class="section-title grp">${title}${badge}
      ${arr.length ? `<span class="count">${arr.length} · ${fmt(credits, 1)} ECTS</span>` : ''}
    </h2>`;
}

function viewSubjects() {
  const all = S.state.subjects;
  const year = S.academicYear();
  const thisYear = all.filter(S.isThisYear);
  const past = all.filter((s) => !S.isThisYear(s));
  const now = S.currentTerm();

  let body = '';
  if (subjFilter === 'year') {
    const terms = ['C1', 'C2', 'A']
      .map((t) => [t, thisYear.filter((s) => s.term === t).sort(byName)])
      .filter(([t, arr]) => arr.length || t !== 'A');
    body = thisYear.length
      ? terms.map(([t, arr]) => `
          ${groupHead(S.TERMS[t], arr, t === now || (t === 'A' && arr.length) ? '<span class="now-tag">Ahora</span>' : '')}
          ${arr.length
            ? `<div class="stack">${arr.map(subjectCard).join('')}</div>`
            : `<button class="add-term" data-action="new-subject" data-term="${t}">${I.plusSm} Añadir asignatura del ${t === 'C1' ? 'primer' : 'segundo'} cuatrimestre</button>`}`).join('')
      : empty(I.book, 'Sin asignaturas este curso', `Añade las asignaturas que cursas en ${year}, separadas por cuatrimestre.`,
        '<button class="btn primary" data-action="new-subject">Añadir asignatura</button>');
  } else {
    // Cursos anteriores, del más reciente al más antiguo
    const groups = new Map();
    for (const s of [...past].sort((a, b) => (b.academicYear || '').localeCompare(a.academicYear || '') || byName(a, b))) {
      const k = s.academicYear ? `Curso ${s.academicYear}` : 'Sin curso académico';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(s);
    }
    body = past.length
      ? [...groups].map(([k, arr]) => `${groupHead(k, arr)}<div class="stack">${arr.map(subjectCard).join('')}</div>`).join('')
        + '<button class="btn ghost block mt" data-action="add-past">Añadir asignatura ya aprobada</button>'
      : empty(I.cap, 'Nada de otros cursos', 'Añade las asignaturas que ya aprobaste para tener tu expediente y tu media completos.',
        '<button class="btn primary" data-action="add-past">Añadir asignatura aprobada</button>');
  }

  return `
    <header class="top">
      <div><p class="eyebrow">${esc(S.state.settings.degree)}</p><h1>Asignaturas</h1></div>
      <button class="icon-btn accent" data-action="new-subject" aria-label="Nueva asignatura">${I.plus}</button>
    </header>
    <div class="seg">
      <button class="${subjFilter === 'year' ? 'on' : ''}" data-action="subj-filter" data-v="year">Curso ${year} <em>${thisYear.length}</em></button>
      <button class="${subjFilter === 'past' ? 'on' : ''}" data-action="subj-filter" data-v="past">Anteriores <em>${past.length}</em></button>
    </div>
    ${body}
    ${fab()}`;
}

// ---------- Detalle de asignatura ----------

const subjTab = {}; // pestaña abierta por asignatura
const sims = {}; // notas simuladas por asignatura
let simOn = false;

function heroHTML(s) {
  const sim = simOn ? sims[s.id] : null;
  const c = S.calc(s, sim);
  const info = statusInfo(s, c);
  const g = s.final ? +s.final.grade : c.current;
  return `
    <div id="subj-hero">
    <div class="card hero" style="--c:${subjColor(s)}">
      <div class="hero-ring">
        ${ring(s.final ? { points: +s.final.grade, pendingW: 0 } : c, { color: subjColor(s) })}
        <div class="ring-label">
          <strong class="t-${S.gradeTone(g)}">${counted(g)}</strong>
          <small>${s.final ? 'Nota final' : c.simulated ? 'Simulada' : 'Nota actual'}</small>
        </div>
      </div>
      <div class="hero-text">
        <span class="status tone-${info.tone}">${esc(info.title)}</span>
        <p>${esc(info.text)}</p>
        ${s.final ? '' : `
        <div class="hero-nums">
          <span><b>${fmt(c.points)}</b> puntos de 10</span>
          <span><b>${pct(c.doneW)}</b> evaluado</span>
          ${c.bonus > 0 ? `<span class="text-good"><b>+${fmt(c.bonus)}</b> por opcionales</span>` : ''}
        </div>`}
      </div>
    </div>
    ${s.final ? '' : c.split ? periodTiles(c) : c.cuatris.length ? cuatriTiles(s, c) : areaTiles(c)}
    </div>`;
}

/** Notas de cada cuatrimestre (anuales), con su teoría y prácticas */
function periodTiles(c) {
  return `
    <div class="areas">${c.periods.map((p) => {
      const low = p.min != null && p.avg != null && p.avg < p.min;
      const tp = p.areas.filter((a) => a.area !== 'otro');
      return `
        <div class="area-tile period">
          <span class="area-name">${S.PERIOD_SHORT[p.period]}<em>${pct(p.weight)}</em></span>
          <strong class="t-${S.gradeTone(p.avg)}">${fmt(p.avg)}</strong>
          <small class="${low ? 'text-bad' : ''}">${p.avg == null ? 'Sin notas' : `${pct(p.done)} evaluado`}${p.min != null ? ` · mín. ${fmt(p.min)}` : ''}</small>
          ${tp.length > 1 ? `<small class="tp-line">${tp.map((a) => `<span class="${a.area}"><b>${S.AREAS[a.area].short}</b> ${fmt(a.avg)}</span>`).join('')}</small>` : ''}
        </div>`;
    }).join('')}</div>`;
}

/** Anual de todo el curso: teoría y prácticas, y la nota de cada cuatri */
function cuatriTiles(s, c) {
  return `${areaTiles(c)}
    <div class="areas cuatri-tiles">${c.cuatris.map((q) => `
      <button class="area-tile period ${cuatriOf(s) === q.period ? 'sel' : ''}" data-action="eval-period" data-id="${s.id}" data-v="${q.period}">
        <span class="area-name">${S.PERIOD_SHORT[q.period]}</span>
        <strong class="t-${S.gradeTone(q.grade)}">${fmt(q.grade)}</strong>
        <small class="tp-line">${q.areas.filter((x) => x.area !== 'otro').map((x) =>
          `<span class="${x.area}"><b>${S.AREAS[x.area].short}</b> ${fmt(x.avg)}</span>`).join('')}${q.low ? ' <span class="text-bad">bajo mínimo</span>' : ''}</small>
      </button>`).join('')}
    </div>`;
}

/** Notas de teoría y prácticas por separado */
function areaTiles(c) {
  const list = c.areas.filter((a) => a.area !== 'otro' || c.areas.length === 1);
  if (!list.length || (list.length === 1 && list[0].area === 'otro')) return '';
  return `
    <div class="areas">${list.map((a) => {
      const low = a.min != null && a.avg != null && a.avg < a.min;
      return `
        <div class="area-tile ${a.area}">
          <span class="area-name">${S.AREAS[a.area].label}<em>${pct(a.weight)}</em></span>
          <strong class="t-${S.gradeTone(a.avg)}">${fmt(a.avg)}</strong>
          <small class="${low ? 'text-bad' : ''}">${a.avg == null ? 'Sin notas' : `${pct(a.done)} evaluado`}${a.min != null ? ` · mín. ${fmt(a.min)}` : ''}</small>
        </div>`;
    }).join('')}</div>`;
}

function evalTab(s) {
  const sim = simOn ? sims[s.id] || (sims[s.id] = {}) : null;
  const c = S.calc(s, sim);

  if (!s.comps.length) {
    return `
      <div class="card">
        <p class="card-title">¿Cómo se evalúa?</p>
        <p class="muted small">Lo normal es teoría y prácticas. Elige una plantilla y ajusta los porcentajes a lo que diga la guía docente, o créala desde cero.</p>
        <div class="presets">${S.PRESETS.map((p, i) => `
          <button class="preset" data-action="apply-preset" data-id="${s.id}" data-i="${i}">
            <strong>${p.name}</strong>
            <small>${p.desc || p.comps.map((x) => `${x.name} ${x.weight} %`).join(' · ')}</small>
          </button>`).join('')}
        </div>
        <button class="btn ghost block mt" data-action="new-comp" data-id="${s.id}">${I.plusSm} Crear desde cero</button>
      </div>`;
  }

  const warnings = [...c.weightIssues];
  const alerts = c.itemFails.map((f) => `${esc(f.item.title)}: sacaste ${fmt(f.grade)} y el mínimo es ${fmt(f.min)}.`);
  for (const p of c.atRiskMin) warnings.push(`En ${esc(p.name)} llevas ${fmt(p.avg)}${p.of ? ` de ${fmt(p.of)}` : ''} y la mínima es ${fmt(p.min)}.`);
  if (!s.final) {
    for (const p of c.minsPending) {
      const min10 = p.min10 ?? (p.scale ? (p.min / p.scale) * 10 : p.min);
      if (p.avg == null && (c.need == null || min10 > c.need)) {
        warnings.push(p.of
          ? `En ${esc(p.name)} necesitas al menos ${fmt(p.min)} de ${fmt(p.of)} puntos.`
          : `En ${esc(p.name)} necesitas al menos un ${fmt(p.min)}${c.need != null && c.need > 0 ? ' aunque la media te pida menos' : ''}.`);
      }
    }
  }

  const loose = S.itemsOf(s.id).filter((i) => !i.compId || !s.comps.some((x) => x.id === i.compId));

  return `
    ${alerts.map((w) => `<div class="warn bad">${I.alert}<span>${w}</span></div>`).join('')}
    ${warnings.map((w) => `<div class="warn">${I.alert}<span>${w}</span></div>`).join('')}

    <div class="sim-toggle ${simOn ? 'on' : ''}">
      <div>
        <strong>${I.sparkle} Simulador</strong>
        <small>${simOn ? 'Escribe notas hipotéticas en lo que te falta. No se guardan.' : 'Prueba qué nota sacarías con distintas notas.'}</small>
      </div>
      <label class="switch"><input type="checkbox" data-field="sim" ${simOn ? 'checked' : ''}><span></span></label>
    </div>

    ${c.cuatris.length ? cuatriSeg(s, c) : ''}
    ${c.cuatris.length && cuatriOf(s) !== 'all' ? cuatriView(s, c, sim) : `
    ${compBar(c, s)}

    ${(c.split ? c.periods : [{ period: '', areas: c.areas }]).map((pr) => `
    ${pr.period ? `
      <div class="period-head">
        <div><strong>${S.PERIODS[pr.period]}</strong><small>${pct(pr.weight)} de la nota${pr.min != null ? ` · mínimo ${fmt(pr.min)}` : ''}</small></div>
        <span data-period-avg="${pr.period}">${gradeBadge(pr.avg, { size: 'lg' })}</span>
      </div>` : ''}
    ${pr.areas.map((a) => `
    ${pr.areas.length > 1 || pr.period ? `<h2 class="section-title area-head ${a.area}">${S.AREAS[a.area].label}<span class="count">${pct(pr.period ? a.weight / (pr.weight || 1) : a.weight)}${pr.period ? ' del cuatri' : ''}</span></h2>` : ''}
    <div class="stack ${pr.areas.length > 1 || pr.period ? '' : 'mt'}">${a.parts.map((p) => `
      <div class="card comp">
        <div class="comp-head">
          <button class="comp-title" data-action="edit-comp" data-id="${s.id}" data-c="${p.comp.id}">
            <strong>${esc(p.comp.name)}${p.optional ? ' <em class="opt">Opcional</em>' : ''}</strong>
            <small>${compRules(p, c)} ${I.edit}</small>
          </button>
          <span class="comp-avg" data-comp-avg="${p.comp.id}">${compBadge(p)}</span>
        </div>
        ${p.optional && p.target ? `<p class="bonus ${p.bonus > 0 ? 'on' : ''}" data-comp-bonus="${p.comp.id}">${bonusText(p)}</p>` : ''}
        ${p.req && p.min != null ? `<p class="bonus ${p.avg != null && p.avg >= p.min ? 'on' : p.failsMin ? 'bad' : ''}">${reqText(p)}</p>` : ''}
        ${p.items.length ? compItems(p, sim) : '<p class="muted small">Sin evaluables. Añade el examen o las prácticas de este apartado.</p>'}
        <button class="btn sm ghost mt" data-action="new-item" data-s="${s.id}" data-c="${p.comp.id}" data-k="${p.comp.kind || 'examen'}">${I.plusSm} Añadir ${addLabel(p.comp)}</button>
      </div>`).join('')}
    </div>`).join('')}
    ${pr.period ? `<button class="add-term mt" data-action="new-comp" data-id="${s.id}" data-p="${pr.period}">${I.plusSm} Añadir apartado al ${S.PERIOD_SHORT[pr.period]}</button>` : ''}
    `).join('')}`}

    ${c.split ? '' : `<button class="btn ghost block mt" data-action="new-comp" data-id="${s.id}">${I.plusSm} Añadir apartado de evaluación</button>`}
    <button class="btn text block" data-action="presets" data-id="${s.id}">Cambiar a otra plantilla de evaluación</button>

    ${loose.length ? `
      <h2 class="section-title">No cuentan para la nota</h2>
      <div class="card flush">${loose.sort(S.byDate).map((it) => itemRow(it, { showSubject: false })).join('')}</div>` : ''}

    <h2 class="section-title">Nota final</h2>
    ${s.final ? `
      <div class="card final-card">
        <div><strong>${fmt(s.final.grade)} · ${S.gradeLabel(+s.final.grade, s.final.honors)}</strong>
        <small class="muted">${esc(s.final.call || '')}</small></div>
        <button class="btn sm" data-action="final" data-id="${s.id}">Cambiar</button>
      </div>` : `
      <button class="btn block ${c.pendingW < 1e-6 && c.parts.length ? 'primary' : ''}" data-action="final" data-id="${s.id}">Poner nota del acta</button>
      <p class="hint">Cuando tengas la nota oficial, ponla aquí. La asignatura pasa a tu expediente.</p>`}`;
}

// --- Anuales de todo el curso: ver cada cuatrimestre por separado ---

const evalPeriod = {}; // cuatrimestre elegido por asignatura

function cuatriOf(s) {
  if (!evalPeriod[s.id]) evalPeriod[s.id] = S.currentTermAuto();
  return evalPeriod[s.id];
}

function cuatriSeg(s, c) {
  const cur = cuatriOf(s);
  const g = (k) => c.cuatris.find((x) => x.period === k)?.grade;
  return `
    <div class="seg cuatri-seg">
      ${['C1', 'C2'].map((k) => `
        <button class="${cur === k ? 'on' : ''}" data-action="eval-period" data-id="${s.id}" data-v="${k}">
          ${S.PERIOD_SHORT[k]} <em class="t-${S.gradeTone(g(k))}">${g(k) == null ? '' : fmt(g(k))}</em>
        </button>`).join('')}
      <button class="${cur === 'all' ? 'on' : ''}" data-action="eval-period" data-id="${s.id}" data-v="all">Curso</button>
    </div>`;
}

/** Un cuatrimestre: sus pruebas de cada apartado y su nota orientativa */
function cuatriView(s, c, sim) {
  const k = cuatriOf(s);
  const q = c.cuatris.find((x) => x.period === k);
  const other = c.cuatris.find((x) => x.period !== k);
  const byArea = S.AREA_ORDER.map((a) => ({ a, rows: q.rows.filter((r) => S.areaOf(r.comp) === a) })).filter((x) => x.rows.length);
  return `
    <div class="card cuatri-head" style="--c:${subjColor(s)}">
      <div class="ch-main">
        <span class="m-label">${S.PERIODS[k]}</span>
        <strong class="t-${S.gradeTone(q.grade)}" data-cuatri-grade>${fmt(q.grade)}</strong>
        <small>${q.grade == null ? 'Aún sin notas en este cuatri' : `${pct(q.done)} evaluado${q.bonus > 0 ? ` · +${fmt(q.bonus)} por opcionales` : ''}`}</small>
      </div>
      <div class="ch-areas">${q.areas.map((x) => `
        <span class="${x.area}"><b>${S.AREAS[x.area].label}</b>${gradeBadge(x.avg)}</span>`).join('')}
      </div>
    </div>
    <p class="hint">Nota orientativa del cuatri con los mismos pesos. La final sale de juntar los dos${other?.grade != null ? ` (el ${S.PERIOD_SHORT[other.period]} va con ${fmt(other.grade)})` : ''}.</p>

    ${byArea.map(({ a, rows }) => `
      <h2 class="section-title area-head ${a}">${S.AREAS[a].label}</h2>
      <div class="stack">${rows.map((r) => `
        <div class="card comp">
          <div class="comp-head">
            <button class="comp-title" data-action="edit-comp" data-id="${s.id}" data-c="${r.comp.id}">
              <strong>${esc(r.comp.name)}${r.optional ? ' <em class="opt">Opcional</em>' : ''}</strong>
              <small>${r.optional ? 'solo cuenta si te sube la nota' : `${fmt(r.comp.weight)} % de la nota`}${r.min != null ? ` · mín. ${fmt(r.min)} en el cuatri` : ''}${r.comp.agg === 'best' ? ` · media del ${fmt(r.comp.bestPct || 80)} % mejores` : ''} · ${I.edit}</small>
            </button>
            <span class="comp-avg ${r.low ? 'low' : ''}" data-cp-avg="${r.comp.id}-${k}">${gradeBadge(r.avg)}</span>
          </div>
          ${r.low ? `<p class="bonus bad">Por debajo del mínimo de ${fmt(r.min)} en este cuatri.</p>` : ''}
          ${r.optional && r.bonus > 0 ? `<p class="bonus on">Te suma ${fmt(r.bonus)} puntos este cuatri.</p>` : ''}
          ${r.items.length
            ? `<div class="comp-items">${r.items.sort(S.byDate).map((it) => gradeRow(it, sim, r.items.length)).join('')}</div>`
            : `<p class="muted small">Nada en el ${S.PERIOD_SHORT[k]} todavía.</p>`}
          <button class="btn sm ghost mt" data-action="new-item" data-s="${s.id}" data-c="${r.comp.id}" data-k="${r.comp.kind || 'examen'}" data-p="${k}">${I.plusSm} Añadir ${addLabel(r.comp)} al ${S.PERIOD_SHORT[k]}</button>
        </div>`).join('')}
      </div>`).join('')}`;
}

/** Reglas de un apartado en una línea: peso, mínimos, cómo se calcula */
function compRules(p, c) {
  const x = p.comp;
  const target = x.replaces && c.parts.find((q) => q.comp.id === x.replaces);
  const bits = [
    p.optional ? `puede sustituir ${fmt(x.weight)} % de ${esc(target?.comp.name || '—')}` : x.req ? 'requisito, no cuenta en la nota' : `${fmt(x.weight)} %`,
    x.agg === 'best' ? `media del ${fmt(x.bestPct || 80)} % mejores` : '',
    x.agg === 'max' ? 'vale el mejor intento' : '',
    p.byPeriod ? 'media de los dos cuatris' : '',
    p.byPeriod && x.periodMin != null && x.periodMin !== '' ? `mín. ${fmt(x.periodMin)} en cada cuatri` : '',
    p.min != null ? (x.points ? `mín. ${fmt(x.min)} sobre ${fmt((+x.weight || 0) / 10)}` : `${x.req ? 'hay que sacar' : 'mín.'} ${fmt(p.min)}${p.byPeriod ? ' de media' : ''}`) : '',
  ].filter(Boolean);
  return bits.join(' · ') + ' ·';
}

function reqText(p) {
  if (p.avg != null && p.avg >= p.min) return `Superado con un ${fmt(p.avg)}.`;
  if (p.failsMin) return `No llegas al ${fmt(p.min)}: sin esto no apruebas la asignatura.`;
  if (p.avg != null) return `Llevas un ${fmt(p.avg)}. Te queda otro intento para llegar al ${fmt(p.min)}.`;
  return `Tienes que sacar al menos un ${fmt(p.min)} para aprobar la asignatura.`;
}

function bonusText(p) {
  if (p.bonus > 0) return `Te suma ${fmt(p.bonus)} puntos: sacas más que en ${esc(p.target.comp.name)}.`;
  if (p.avg != null && p.target.avg != null) return `Ahora no te sube la nota (vas mejor en ${esc(p.target.comp.name)}), así que no cuenta.`;
  return `Solo cuenta si te sube la nota de ${esc(p.target.comp.name)}.`;
}

/** Evaluables de un apartado, separados por cuatrimestre si se evalúa así */
function compItems(p, sim) {
  const rows = (list) => list.sort(S.byDate).map((it) => gradeRow(it, sim, list.length)).join('');
  if (!p.byPeriod) return `<div class="comp-items">${rows(p.items)}</div>`;
  return p.byPeriod.map((g) => {
    const list = p.items.filter((i) => S.itemPeriod(i) === g.period);
    const low = g.min != null && g.avg != null && g.avg < g.min;
    return `
      <div class="comp-period">
        <span>${S.PERIODS[g.period]}</span>
        <b class="${low ? 'text-bad' : ''}" data-cp-avg="${p.comp.id}-${g.period}">${fmt(g.avg)}${g.min != null ? `<small> / mín. ${fmt(g.min)}</small>` : ''}</b>
      </div>
      <div class="comp-items">${list.length ? rows(list) : '<p class="muted small pad">Nada todavía</p>'}</div>`;
  }).join('');
}

/** Texto del botón para añadir un evaluable a un apartado */
const addLabel = (c) => ({ examen: 'examen', practica: 'práctica', entrega: 'entrega', otro: 'nota' }[c.kind] || '');

function gradeRow(it, sim, n) {
  const real = it.grade != null && it.grade !== '';
  const simVal = sim && sim[it.id] != null ? fmt(sim[it.id]) : '';
  const input = real
    ? `<input class="grade-in" data-grade="${it.id}" value="${fmt(it.grade)}" inputmode="decimal" enterkeyhint="done" aria-label="Nota">`
    : sim
      ? `<input class="grade-in sim" data-sim="${it.id}" value="${simVal}" placeholder="?" inputmode="decimal" enterkeyhint="done" aria-label="Nota simulada">`
      : `<input class="grade-in" data-grade="${it.id}" value="" placeholder="—" inputmode="decimal" enterkeyhint="done" aria-label="Nota">`;
  const weightNote = n > 1 && +it.weight !== 1 ? ` · peso ${fmt(it.weight)}` : '';
  const min = it.min === '' || it.min == null ? null : +it.min;
  const val = real ? +it.grade : sim && sim[it.id] != null ? +sim[it.id] : null;
  const low = min != null && val != null && val < min;
  const minNote = min != null ? ` · <span class="${low ? 'text-bad' : ''}">mín. ${fmt(min)}</span>` : '';
  return `
    <div class="grade-row">
      <button class="row-text" data-action="edit-item" data-id="${it.id}">
        <strong>${esc(it.title || S.KINDS[it.kind].label)}</strong>
        <small>${it.date ? dayMonth(it.date) + (S.isPending(it) && it.date >= S.ymd() ? ' · ' + rel(it.date).toLowerCase() : '') : 'Sin fecha'}${minNote}${weightNote}${(+it.max || 10) !== 10 ? ` · sobre ${fmt(it.max)}` : ''}</small>
      </button>
      ${low ? input.replace('class="grade-in', 'class="grade-in bad') : input}
    </div>`;
}

function datesTab(s) {
  const list = S.itemsOf(s.id).sort(S.byDate);
  const today = S.ymd();
  const next = list.filter((i) => !i.date || i.date >= today);
  const past = list.filter((i) => i.date && i.date < today).reverse();
  return `
    <div class="row-btns">
      <button class="btn sm" data-action="new-item" data-s="${s.id}" data-k="examen">${I.plusSm} Examen</button>
      <button class="btn sm" data-action="new-item" data-s="${s.id}" data-k="practica">${I.plusSm} Práctica</button>
      <button class="btn sm" data-action="new-item" data-s="${s.id}" data-k="entrega">${I.plusSm} Entrega</button>
    </div>
    ${list.length ? '' : '<p class="hint">Todavía no hay fechas para esta asignatura.</p>'}
    ${next.length ? `<h2 class="section-title">Próximo</h2><div class="card flush">${next.map((i) => itemRow(i, { showSubject: false })).join('')}</div>` : ''}
    ${past.length ? `<h2 class="section-title">Pasado</h2><div class="card flush">${past.map((i) => itemRow(i, { showSubject: false })).join('')}</div>` : ''}`;
}

function scheduleTab(s) {
  const slots = [...(s.slots || [])].sort((a, b) => a.day - b.day || S.minutes(a.start) - S.minutes(b.start));
  const hrs = (list) => list.reduce((a, x) => a + (S.minutes(x.end) - S.minutes(x.start)) / 60, 0);
  const section = (area) => {
    const list = slots.filter((x) => S.slotArea(x.type) === area);
    if (area === 'otro' && !list.length) return '';
    const group = S.groupOf(s, area);
    return `
      <h2 class="section-title area-head ${area}">${area === 'otro' ? 'Otras clases' : S.AREAS[area].label}
        ${group ? `<span class="count">Grupo ${esc(group)}</span>` : ''}
        ${list.length ? `<span class="count right">${fmt(hrs(list), 1)} h/sem</span>` : ''}
      </h2>
      ${list.length ? `<div class="card flush">${list.map((x) => `
        <button class="tl-row" data-action="edit-slot" data-id="${s.id}" data-x="${x.id}" style="--c:${subjColor(s)}">
          <span class="tl-time"><b>${S.DAYS[x.day - 1].slice(0, 3)}</b><small>${x.start}</small></span>
          <span class="tl-bar ${area}"></span>
          <span class="row-text"><strong>${x.start}–${x.end}${area === 'otro' || x.type === 'Laboratorio' ? ' · ' + esc(x.type) : ''}</strong>
          <small>${[x.room && esc(x.room), x.group && x.group !== group && 'Grupo ' + esc(x.group)].filter(Boolean).join(' · ') || 'Sin aula'}</small></span>
          ${I.chevron}
        </button>`).join('')}
      </div>` : ''}
      ${area === 'otro' ? '' : `<button class="add-term ${list.length ? 'mt' : ''}" data-action="new-slot" data-id="${s.id}" data-area="${area}">${I.plusSm} Añadir clase de ${area === 'teoria' ? 'teoría' : 'prácticas'}</button>`}`;
  };
  return `
    ${S.AREA_ORDER.map(section).join('')}
    <p class="hint">${slots.length ? `${fmt(hrs(slots), 1)} h de clase a la semana · ` : ''}${S.TERMS[s.term]}${s.final ? ' (asignatura cerrada)' : S.inCurrentTerm(s) ? '' : S.isThisYear(s) ? ' (no es el cuatrimestre actual)' : ' (no es de este curso)'}</p>
    <p class="hint">Los grupos de teoría y prácticas se cambian editando la asignatura (lápiz de arriba).</p>`;
}

function infoTab(s) {
  const topics = s.topics || [];
  const done = topics.filter((t) => St.confOf(t) >= 2).length;
  return `
    <h2 class="section-title">Profesorado</h2>
    ${(s.teachers || []).length ? `<div class="card flush">${s.teachers.map((t) => `
      <div class="row-item">
        <button class="row-main" data-action="edit-teacher" data-id="${s.id}" data-t="${t.id}">
          <span class="kicon">${I.user}</span>
          <span class="row-text"><strong>${esc(t.name)}</strong>
          <small>${[t.office && 'Despacho ' + esc(t.office), t.hours && 'Tutorías: ' + esc(t.hours)].filter(Boolean).join(' · ') || 'Sin datos'}</small></span>
        </button>
        ${t.email ? `<a class="icon-btn sm" href="mailto:${esc(t.email)}" aria-label="Enviar correo">${I.mail}</a>` : ''}
      </div>`).join('')}</div>` : ''}
    <button class="btn sm ghost mt" data-action="new-teacher" data-id="${s.id}">${I.plusSm} Añadir profesor</button>

    <h2 class="section-title">Temario ${topics.length ? `<span class="count">${done}/${topics.length}</span>` : ''}</h2>
    ${topics.length ? `<div class="progress"><i style="width:${(done / topics.length) * 100}%;background:${subjColor(s)}"></i></div>` : ''}
    ${['teoria', 'practicas'].map((area) => {
      const list = topics.filter((t) => S.topicArea(t) === area);
      return `
      <div class="topic-group ${area}">
        <div class="tg-head"><b>${area === 'teoria' ? 'Teoría' : 'Prácticas'}</b><span>${list.length ? `${list.length} temas · ${fmt(list.reduce((x, t) => x + SP.topicHours(t), 0), 1)} h` : 'Sin temas'}</span>
          <button class="link" data-action="paste-topics" data-id="${s.id}" data-area="${area}">${I.list} Pegar lista</button></div>
        <div class="card flush topics">
          ${list.map((t) => `
            <div class="topic ${St.confOf(t) === 3 ? 'done' : ''}">
              ${confMeter(t, s)}
              <button class="topic-name" data-action="edit-topic" data-id="${s.id}" data-t="${t.id}">${esc(t.name)}<small>${St.CONF[St.confOf(t)].label} · ${fmt(SP.topicHours(t), 1)} h</small></button>
              <button class="icon-btn ghost sm" data-action="del-topic" data-id="${s.id}" data-t="${t.id}" aria-label="Quitar tema">${I.xs}</button>
            </div>`).join('')}
          <form class="topic-new" data-save="add-topic" data-id="${s.id}" data-area="${area}">
            <input class="input" name="topic" placeholder="${area === 'teoria' ? 'Añadir tema de teoría…' : 'Añadir práctica o tema de prácticas…'}" enterkeyhint="done" autocomplete="off">
            <button class="icon-btn sm" type="submit" aria-label="Añadir">${I.plusSm}</button>
          </form>
        </div>
      </div>`;
    }).join('')}
    <p class="hint">Toca las rayitas de cada tema para decir cuánto lo dominas y el nombre para cambiar sus horas. Los temas de prácticas son para los exámenes y controles de prácticas.</p>

    <h2 class="section-title">Enlaces</h2>
    ${(s.links || []).length ? `<div class="card flush">${s.links.map((l) => `
      <div class="row-item">
        <a class="row-main" href="${esc(l.url)}" target="_blank" rel="noopener">
          <span class="kicon">${I.link}</span>
          <span class="row-text"><strong>${esc(l.label || l.url)}</strong><small>${esc(l.url.replace(/^https?:\/\//, ''))}</small></span>
        </a>
        <button class="icon-btn ghost sm" data-action="del-link" data-id="${s.id}" data-l="${l.id}" aria-label="Quitar enlace">${I.xs}</button>
      </div>`).join('')}</div>` : ''}
    <button class="btn sm ghost mt" data-action="new-link" data-id="${s.id}">${I.plusSm} Añadir enlace</button>
    <p class="hint">Por ejemplo, la Enseñanza Virtual, la guía docente o el repositorio de prácticas.</p>

    <h2 class="section-title">Apuntes rápidos</h2>
    <textarea class="input area" data-field="notes" data-id="${s.id}" placeholder="Criterios del profesor, qué entra en el examen…">${esc(s.notes || '')}</textarea>

    <button class="btn text-danger block mt-lg" data-action="del-subject" data-id="${s.id}">${I.trash} Eliminar asignatura</button>`;
}

function viewSubject({ id }) {
  const s = S.subject(id);
  if (!s) { go('#/asignaturas'); return null; }
  const tab = subjTab[id] || (s.comps.length || s.final ? 'eval' : 'eval');
  const tabs = [['eval', 'Evaluación'], ['dates', 'Fechas'], ['sched', 'Horario'], ['info', 'Info']];
  const body = { eval: evalTab, dates: datesTab, sched: scheduleTab, info: infoTab }[tab](s);
  return `
    ${topBar(esc(S.shortName(s)), { back: '#/asignaturas', action: `<button class="icon-btn" data-action="edit-subject" data-id="${s.id}" aria-label="Editar">${I.edit}</button>` })}
    <div class="subj-head" style="--c:${subjColor(s)}">
      <h1>${esc(s.name)}</h1>
      <div class="chips-row">
        <span class="pill">${fmt(s.credits, 1)} ECTS</span>
        <span class="pill">${s.year}.º curso</span>
        <span class="pill">${S.TERMS[s.term]}</span>
        ${s.code ? `<span class="pill">${esc(s.code)}</span>` : ''}
        ${s.group ? `<span class="pill">Grupo ${esc(s.group)}</span>` : ''}
      </div>
    </div>
    ${heroHTML(s)}
    <div class="seg sticky">${tabs.map(([k, l]) =>
      `<button class="${tab === k ? 'on' : ''}" data-action="subj-tab" data-id="${s.id}" data-v="${k}">${l}</button>`).join('')}
    </div>
    <div class="tab-body">${body}</div>`;
}

/** Actualiza la cabecera y las medias sin redibujar (para no cerrar el teclado) */
function refreshLive(s) {
  const hero = document.getElementById('subj-hero');
  if (hero) hero.outerHTML = heroHTML(s);
  const c = S.calc(s, simOn ? sims[s.id] : null);
  for (const p of c.parts) {
    const el = app.querySelector(`[data-comp-avg="${p.comp.id}"]`);
    if (el) el.innerHTML = compBadge(p);
  }
  for (const p of c.parts) {
    const b = app.querySelector(`[data-comp-bonus="${p.comp.id}"]`);
    if (b && p.target) { b.textContent = bonusText(p); b.classList.toggle('on', p.bonus > 0); }
    for (const g of p.byPeriod || []) {
      const el = app.querySelector(`[data-cp-avg="${p.comp.id}-${g.period}"]`);
      if (el) el.innerHTML = `${fmt(g.avg)}${g.min != null ? `<small> / mín. ${fmt(g.min)}</small>` : ''}`;
      if (el) el.classList.toggle('text-bad', g.min != null && g.avg != null && g.avg < g.min);
    }
  }
  for (const p of c.periods) {
    const el = app.querySelector(`[data-period-avg="${p.period}"]`);
    if (el) el.innerHTML = gradeBadge(p.avg, { size: 'lg' });
  }
  const cg = app.querySelector('[data-cuatri-grade]');
  if (cg) {
    const q = c.cuatris.find((x) => x.period === cuatriOf(s));
    if (q) { cg.textContent = fmt(q.grade); cg.className = `t-${S.gradeTone(q.grade)}`; }
  }
  for (const q of c.cuatris) for (const r of q.rows) {
    const el = app.querySelector(`[data-cp-avg="${r.comp.id}-${q.period}"]`);
    if (el && el.closest('.cuatri-head, .comp')) el.innerHTML = gradeBadge(r.avg);
  }
  const bar = app.querySelector('.tab-body .cbar');
  if (bar) bar.outerHTML = compBar(c, s);
}

// =============================================================
//  AGENDA
// =============================================================

let agendaView = 'list';
let agendaKind = 'all';
let showPast = false;
let weekOffset = 0;
let monthOffset = 0;
let selDay = S.ymd();

function monday(offset = 0) {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - (S.weekday(t) - 1) + offset * 7);
  return d;
}

function agendaList() {
  const today = S.ymd();
  const kinds = agendaKind === 'all' ? null : [agendaKind];
  const all = S.state.items.filter((i) => S.subject(i.subjectId))
    .filter((i) => !kinds || (agendaKind === 'examen' ? S.isExamItem(i) : kinds.includes(i.kind)));
  const next = all.filter((i) => i.date && i.date >= today).sort(S.byDate);
  const nodate = all.filter((i) => !i.date && S.isPending(i));
  const past = all.filter((i) => i.date && i.date < today).sort(S.byDate).reverse();
  const late = past.filter((i) => S.isPending(i) && ((i.kind === 'practica' && !i.exam) || i.kind === 'entrega'));

  const group = (list) => {
    const m = new Map();
    for (const i of list) {
      if (!m.has(i.date)) m.set(i.date, []);
      m.get(i.date).push(i);
    }
    return [...m].map(([d, arr]) => `
      <h3 class="day-head">${d === today ? 'Hoy' : S.daysUntil(d) === 1 ? 'Mañana' : longDate(d)}<span>${S.daysUntil(d) > 1 ? rel(d) : dayMonth(d)}</span></h3>
      <div class="card flush">${arr.map((i) => itemRow(i, { showDate: false })).join('')}</div>`).join('');
  };

  return `
    <div class="chips">
      ${[['all', 'Todo'], ['examen', 'Exámenes'], ['practica', 'Prácticas'], ['entrega', 'Entregas']].map(([k, l]) =>
        `<button class="chip ${agendaKind === k ? 'on' : ''}" data-action="agenda-kind" data-v="${k}">${l}</button>`).join('')}
    </div>
    ${late.length ? `<h2 class="section-title text-bad">Sin entregar <span class="count">${late.length}</span></h2><div class="card flush">${late.map((i) => itemRow(i)).join('')}</div>` : ''}
    ${next.length ? group(next) : empty(I.cal, 'Nada a la vista', 'Añade exámenes, prácticas y entregas para verlas aquí.', '<button class="btn primary" data-action="quick-add">Añadir</button>')}
    ${nodate.length ? `<h2 class="section-title">Sin fecha</h2><div class="card flush">${nodate.map((i) => itemRow(i)).join('')}</div>` : ''}
    ${past.length ? `
      <button class="btn ghost block mt" data-action="toggle-past">${showPast ? 'Ocultar' : 'Ver'} pasado (${past.length})</button>
      ${showPast ? `<div class="mt">${group(past)}</div>` : ''}` : ''}`;
}

function agendaWeek() {
  const start = monday(weekOffset);
  const days = [...Array(7)].map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const slots = S.weekSlots();
  const strs = days.map(S.ymd);
  const items = S.state.items.filter((i) => i.date && strs.includes(i.date) && S.subject(i.subjectId));
  const weekend = slots.some((x) => +x.slot.day > 5) || items.some((i) => S.weekday(S.toDate(i.date)) > 5);
  const cols = weekend ? 7 : 5;

  let from = 8 * 60;
  let to = 15 * 60;
  if (slots.length) {
    from = Math.floor(Math.min(...slots.map((x) => S.minutes(x.slot.start))) / 60) * 60;
    to = Math.ceil(Math.max(...slots.map((x) => S.minutes(x.slot.end))) / 60) * 60;
  }
  // Los eventos con hora solo amplían el horario dentro de la franja 8-21 h
  for (const i of items) {
    if (!i.time) continue;
    const m = S.minutes(i.time);
    if (m < 8 * 60 || m >= 21 * 60) continue;
    from = Math.min(from, Math.floor(m / 60) * 60);
    to = Math.max(to, Math.ceil((m + 30) / 60) * 60);
  }
  const H = 54; // px por hora
  const px = (m) => ((m - from) / 60) * H;
  const height = px(to);
  const todayStr = S.ymd();
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const end = days[cols - 1];

  const head = `
    <div class="wk-nav">
      <button class="icon-btn sm" data-action="week" data-v="-1" aria-label="Semana anterior">${I.left}</button>
      <button class="wk-label" data-action="week" data-v="0">
        <strong>${weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Semana que viene' : weekOffset === -1 ? 'Semana pasada' : 'Semana'}</strong>
        <small>${dayMonth(S.ymd(days[0]))} – ${dayMonth(S.ymd(end))}</small>
      </button>
      <button class="icon-btn sm" data-action="week" data-v="1" aria-label="Semana siguiente">${I.right}</button>
    </div>`;

  if (!slots.length && !items.length) {
    return head + empty(I.cal, 'Horario vacío', 'Añade las clases desde cada asignatura (pestaña Horario) y aparecerán aquí.');
  }

  const hours = [];
  for (let m = from; m <= to; m += 60) hours.push(m);

  const col = (d, idx) => {
    const wd = idx + 1;
    const str = S.ymd(d);
    const blocks = slots.filter((x) => +x.slot.day === wd).map((x) => {
      const top = px(S.minutes(x.slot.start));
      const h = Math.max(22, px(S.minutes(x.slot.end)) - top);
      return `
        <a class="wk-block ${S.slotArea(x.slot.type)}" href="#/asignatura/${x.s.id}" style="--c:${subjColor(x.s)};top:${top}px;height:${h - 2}px">
          <b>${esc(S.shortName(x.s))}</b>
          ${h > 40 ? `<small>${esc({ teoria: 'Teoría', practicas: 'Práct.' }[S.slotArea(x.slot.type)] || x.slot.type)}</small>` : ''}
          ${h > 58 && x.slot.room ? `<small>${esc(x.slot.room)}</small>` : ''}
        </a>`;
    }).join('');
    const evs = items.filter((i) => i.date === str);
    const timed = evs.filter((i) => i.time && S.minutes(i.time) >= from && S.minutes(i.time) < to).map((i) => `
      <button class="wk-ev k-${i.kind}" style="top:${px(S.minutes(i.time))}px" data-action="edit-item" data-id="${i.id}">${I[i.kind]}</button>`).join('');
    const now = str === todayStr && nowM >= from && nowM <= to ? `<span class="wk-now" style="top:${px(nowM)}px"></span>` : '';
    return `<div class="wk-col ${str === todayStr ? 'today' : ''}" style="height:${height}px">${hours.map((m) => `<span class="wk-line" style="top:${px(m)}px"></span>`).join('')}${blocks}${timed}${now}</div>`;
  };

  const weekItems = items.sort(S.byDate);

  return `${head}
    <div class="card wk-card" data-swipe-nav="week">
      <div class="wk" style="--cols:${cols}">
        <div class="wk-corner"></div>
        ${days.slice(0, cols).map((d) => {
          const str = S.ymd(d);
          const n = items.filter((i) => i.date === str).length;
          return `<div class="wk-day ${str === todayStr ? 'today' : ''}"><small>${S.DAYS_SHORT[S.weekday(d) - 1]}</small><b>${d.getDate()}</b>${n ? '<i></i>' : ''}</div>`;
        }).join('')}
        <div class="wk-hours" style="height:${height}px">${hours.slice(0, -1).map((m) => `<span style="top:${px(m)}px">${m / 60}</span>`).join('')}</div>
        ${days.slice(0, cols).map(col).join('')}
      </div>
      <div class="legend"><span><i class="lg-t"></i>Teoría</span><span><i class="lg-p"></i>Prácticas</span></div>
    </div>
    ${weekItems.length ? `<h2 class="section-title">Esta semana <span class="count">${weekItems.length}</span></h2>
      <div class="card flush">${weekItems.map((i) => itemRow(i)).join('')}</div>` : ''}`;
}

function agendaMonth() {
  const t = new Date();
  const first = new Date(t.getFullYear(), t.getMonth() + monthOffset, 1);
  const startPad = S.weekday(first) - 1;
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((startPad + daysIn) / 7) * 7;
  const todayStr = S.ymd();
  const byDay = new Map();
  for (const i of S.state.items) {
    if (!i.date || !S.subject(i.subjectId)) continue;
    if (!byDay.has(i.date)) byDay.set(i.date, []);
    byDay.get(i.date).push(i);
  }
  const title = cap(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(first));
  let grid = '';
  for (let c = 0; c < cells; c++) {
    const day = c - startPad + 1;
    if (day < 1 || day > daysIn) { grid += '<span class="mc pad"></span>'; continue; }
    const str = S.ymd(new Date(first.getFullYear(), first.getMonth(), day));
    const list = byDay.get(str) || [];
    const kinds = [...new Set(list.map((i) => i.kind))];
    grid += `
      <button class="mc ${str === todayStr ? 'today' : ''} ${str === selDay ? 'sel' : ''} ${list.some((i) => i.kind === 'examen') ? 'has-exam' : ''}" data-action="sel-day" data-v="${str}">
        <b>${day}</b>
        <span class="mc-dots">${kinds.map((k) => `<i class="k-${k}"></i>`).join('')}</span>
      </button>`;
  }

  const sel = byDay.get(selDay) || [];
  const classes = S.classesOn(S.toDate(selDay));
  return `
    <div class="wk-nav">
      <button class="icon-btn sm" data-action="month" data-v="-1" aria-label="Mes anterior">${I.left}</button>
      <button class="wk-label" data-action="month" data-v="0"><strong>${title}</strong></button>
      <button class="icon-btn sm" data-action="month" data-v="1" aria-label="Mes siguiente">${I.right}</button>
    </div>
    <div class="card month" data-swipe-nav="month">
      <div class="mgrid">${S.DAYS_SHORT.map((d) => `<span class="mh">${d}</span>`).join('')}${grid}</div>
      <div class="legend">
        <span><i class="k-examen"></i>Examen</span><span><i class="k-practica"></i>Práctica</span><span><i class="k-entrega"></i>Entrega</span><span><i class="k-otro"></i>Otro</span>
      </div>
    </div>
    <h3 class="day-head">${selDay === todayStr ? 'Hoy' : longDate(selDay)}<button class="btn sm" data-action="new-item" data-d="${selDay}">${I.plusSm} Añadir</button></h3>
    ${sel.length ? `<div class="card flush">${sel.sort(S.byDate).map((i) => itemRow(i, { showDate: false })).join('')}</div>` : ''}
    ${classes.length ? `<div class="card flush ${sel.length ? 'mt' : ''}">${classes.map((c) => `
      <a class="tl-row" href="#/asignatura/${c.s.id}" style="--c:${subjColor(c.s)}">
        <span class="tl-time"><b>${c.slot.start}</b><small>${c.slot.end}</small></span>
        <span class="tl-bar"></span>
        <span class="row-text"><strong>${esc(c.s.name)}</strong><small>${esc(c.slot.type || '')}${c.slot.room ? ' · ' + esc(c.slot.room) : ''}</small></span>
      </a>`).join('')}</div>` : ''}
    ${!sel.length && !classes.length ? '<p class="hint">Nada este día.</p>' : ''}`;
}

function viewAgenda() {
  const body = { list: agendaList, week: agendaWeek, month: agendaMonth }[agendaView]();
  return `
    <header class="top">
      <div><p class="eyebrow">${S.TERMS[S.currentTerm()]} · ${S.academicYear()}</p><h1>Agenda</h1></div>
      <div class="top-actions">
        <button class="icon-btn" data-action="export-ics" aria-label="Añadir al calendario del iPhone">${I.calAdd}</button>
        <button class="icon-btn accent" data-action="quick-add" aria-label="Añadir">${I.plus}</button>
      </div>
    </header>
    <div class="seg">
      ${[['list', 'Próximo'], ['week', 'Semana'], ['month', 'Mes']].map(([k, l]) =>
        `<button class="${agendaView === k ? 'on' : ''}" data-action="agenda-view" data-v="${k}">${l}</button>`).join('')}
    </div>
    <div class="tab-body">${body}</div>`;
}

// =============================================================
//  EXPEDIENTE (Notas)
// =============================================================

function viewRecord() {
  const r = S.record();
  const st = S.state.settings;
  const pctCred = Math.min(1, r.credits / r.total);
  const C = 2 * Math.PI * 44;
  const distTotal = r.passed.length || 1;
  const dist = [
    ['mh', 'MH', r.dist.mh, 'var(--mh)'],
    ['sb', 'Sobresaliente', r.dist.sb, 'var(--top)'],
    ['nt', 'Notable', r.dist.nt, 'var(--good)'],
    ['ap', 'Aprobado', r.dist.ap, 'var(--ok)'],
  ];

  const byYear = new Map();
  for (const s of [...r.closed].sort((a, b) => (a.academicYear || '').localeCompare(b.academicYear || '') || a.year - b.year || a.name.localeCompare(b.name))) {
    const k = `${s.year}.º curso${s.academicYear ? ' · ' + s.academicYear : ''}`;
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k).push(s);
  }

  const inProgress = r.inProgress.map((s) => ({ s, c: S.calc(s) }));

  return `
    <header class="top">
      <div><p class="eyebrow">${esc(st.university)}</p><h1>Expediente</h1></div>
      <button class="icon-btn accent" data-action="add-past" aria-label="Añadir nota">${I.plus}</button>
    </header>

    <div class="card record-hero">
      <div class="rh-main">
        <span class="m-label">Nota media</span>
        <strong class="big t-${S.gradeTone(r.weighted)}">${counted(r.weighted)}</strong>
        <span class="muted small">${r.weighted == null ? 'Sin notas todavía' : S.gradeLabel(r.weighted) + ' · ponderada por créditos'}</span>
        ${r.simple != null ? `<span class="muted small">Media simple: ${fmt(r.simple)}</span>` : ''}
      </div>
      <div class="rh-ring">
        <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-3)" stroke-width="9"/>
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round"
            stroke-dasharray="${pctCred * C} ${C}" transform="rotate(-90 50 50)"/>
        </svg>
        <div class="ring-label"><strong>${fmt(r.credits, 1)}</strong><small>de ${fmt(r.total)} ECTS</small></div>
      </div>
    </div>

    <div class="stats mt">
      <div class="stat"><strong>${r.passed.length}</strong><span>Aprobadas</span></div>
      <div class="stat"><strong>${pct(pctCred)}</strong><span>De la carrera</span></div>
      <div class="stat"><strong>${fmt(r.inProgressCredits, 1)}</strong><span>ECTS en curso</span></div>
    </div>

    ${r.passed.length ? `
      <h2 class="section-title">Calificaciones</h2>
      <div class="card">
        <div class="dist">${dist.filter((d) => d[2]).map((d) => `<span style="flex:${d[2]};background:${d[3]}"></span>`).join('')}</div>
        <div class="dist-legend">${dist.map((d) => `<span><i style="background:${d[3]}"></i>${d[1]} <b>${d[2]}</b></span>`).join('')}</div>
        ${r.best ? `<p class="hint">Tu mejor nota: ${esc(r.best.name)} (${fmt(r.best.final.grade)}${r.best.final.honors ? ', MH' : ''}).</p>` : ''}
      </div>` : ''}

    ${inProgress.length ? `
      <h2 class="section-title">En curso <span class="count">${inProgress.length}</span></h2>
      <div class="card flush">${inProgress.map(({ s, c }) => {
        const info = statusInfo(s, c);
        return `
          <a class="rec-row" href="#/asignatura/${s.id}" style="--c:${subjColor(s)}">
            <span class="row-text"><strong><b class="sdot"></b>${esc(s.name)}</strong>
            <small class="tone-${info.tone}">${esc(info.title)}${c.current != null ? ` · ${pct(c.doneW)} evaluado` : ''}</small></span>
            ${gradeBadge(c.current)}
          </a>`;
      }).join('')}</div>` : ''}

    ${[...byYear].map(([k, arr]) => `
      <h2 class="section-title">${k}</h2>
      <div class="card flush">${arr.map((s) => `
        <a class="rec-row" href="#/asignatura/${s.id}" style="--c:${subjColor(s)}">
          <span class="row-text"><strong><b class="sdot"></b>${esc(s.name)}</strong>
          <small>${fmt(s.credits, 1)} ECTS · ${S.gradeLabel(+s.final.grade, s.final.honors)}</small></span>
          <span class="rec-bar"><i class="t-${S.gradeTone(+s.final.grade)}" style="width:${+s.final.grade * 10}%"></i></span>
          ${gradeBadge(+s.final.grade, { honors: s.final.honors })}
        </a>`).join('')}</div>`).join('')}

    ${!r.closed.length && !inProgress.length ? empty(I.cap, 'Tu expediente está vacío', 'Añade las asignaturas que ya has aprobado para calcular tu nota media.', '<button class="btn primary" data-action="add-past">Añadir asignatura aprobada</button>') : ''}
    ${r.closed.length || inProgress.length ? '<button class="btn ghost block mt" data-action="add-past">Añadir asignatura ya aprobada</button>' : ''}
    <p class="hint center">La media se calcula ponderando cada nota por sus créditos. La matrícula de honor cuenta como 10.</p>`;
}

// =============================================================
//  ESTUDIO
// =============================================================

let studySubj = '';
let studyTopic = '';
const TR = 96; // radio del temporizador
const TC = 2 * Math.PI * TR;

const clock = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
const mins = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

const studySubjects = () => S.activeSubjects().filter((s) => S.isThisYear(s) || !s.academicYear);

function confMeter(t, s) {
  const c = St.confOf(t);
  return `<button class="conf c${c}" data-action="topic-conf" data-id="${s.id}" data-t="${t.id}" aria-label="Dominio: ${St.CONF[c].label}">
    <i></i><i></i><i></i></button>`;
}

function timerCard() {
  const x = S.state.study;
  const t = x.timer;
  const mode = t ? t.mode : x.next;
  const sid = t ? t.subjectId : studySubj;
  const sub = S.subject(sid);
  const topic = t ? St.topicOf(t.subjectId, t.topicId) : St.topicOf(studySubj, studyTopic);
  const total = t ? t.duration : St.nextMinutes(mode) * 60;
  const left = t ? St.remaining() : total;
  const color = mode === 'break' ? 'var(--good)' : sub ? subjColor(sub) : 'var(--accent)';
  const running = St.isRunning();
  const cycle = (x.cycle || 0) % 4;
  const subs = studySubjects();
  const selected = S.subject(studySubj);

  let controls;
  if (!t && mode === 'focus') {
    controls = `<button class="btn primary block big-btn" data-action="study-go">${I.playBig} Empezar ${mins(+x.focus || 25)}</button>`;
  } else if (!t) {
    controls = `
      <button class="btn primary block big-btn" data-action="study-go" data-mode="break">${I.playBig} Descanso de ${mins(St.nextMinutes('break'))}</button>
      <button class="btn text block" data-action="study-skip">Saltar descanso</button>`;
  } else {
    controls = `
      <div class="t-ctrls">
        <button class="round-btn" data-action="study-stop" aria-label="Terminar">${I.stop}</button>
        <button class="round-btn main" data-action="${running ? 'study-pause' : 'study-resume'}" aria-label="${running ? 'Pausa' : 'Seguir'}">${running ? I.pause : I.playBig}</button>
        <button class="round-btn" data-action="study-plus" aria-label="Añadir 5 minutos">+5</button>
      </div>`;
  }

  return `
    <div class="card timer-card ${mode} ${running ? 'running' : ''}" style="--c:${color}">
      <div class="t-mode">${mode === 'focus' ? `${I.brain.replace('width="40" height="40"', 'width="16" height="16"')} Estudio` : 'Descanso'}
        <span class="t-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < cycle ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="t-ring">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r="${TR}" fill="none" stroke="var(--surface-3)" stroke-width="12"/>
          <circle class="t-arc" data-timer-arc cx="110" cy="110" r="${TR}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${TC} ${TC}" stroke-dashoffset="${TC * (left / total)}" style="opacity:${left >= total - 0.5 ? 0 : 1}" transform="rotate(-90 110 110)"/>
        </svg>
        <div class="t-label">
          <strong data-timer-text>${clock(left)}</strong>
          <small>${t && !running ? 'En pausa' : sub ? esc(S.shortName(sub)) + (topic ? ' · ' + esc(topic.name) : '') : mode === 'break' ? 'Levántate y estírate' : 'Sin asignatura'}</small>
        </div>
      </div>
      ${!t && mode === 'focus' ? `
        <div class="t-pick">
          <div class="chips scroll">
            <button class="chip ${!studySubj ? 'on' : ''}" data-action="study-subj" data-v="">General</button>
            ${subs.map((s) => `<button class="chip subj-chip ${studySubj === s.id ? 'on' : ''}" style="--c:${subjColor(s)}" data-action="study-subj" data-v="${s.id}"><b class="sdot"></b>${esc(S.shortName(s))}</button>`).join('')}
          </div>
          ${selected && (selected.topics || []).length ? `
          <div class="chips scroll topics-pick">
            ${[...selected.topics].sort((a, b) => St.confOf(a) - St.confOf(b)).map((tp) => `
              <button class="chip ${studyTopic === tp.id ? 'on' : ''}" data-action="study-topic" data-v="${tp.id}"><span class="cdot c${St.confOf(tp)}"></span>${esc(tp.name)}</button>`).join('')}
          </div>` : ''}
          <div class="chips dur">${[15, 25, 45, 60].map((m) =>
            `<button class="chip ${+x.focus === m ? 'on' : ''}" data-action="study-dur" data-v="${m}">${m} min</button>`).join('')}</div>
        </div>` : ''}
      ${controls}
    </div>`;
}

function planList() {
  const tasks = St.todayPlan();
  if (!tasks.length) {
    return `<div class="card plan-empty">${I.sparkle}<div><strong>Nada urgente</strong><p>No tienes exámenes en los próximos 30 días ni entregas cercanas. Buen momento para ir adelantando.</p></div></div>`;
  }
  return `<div class="plan">${tasks.slice(0, 6).map((t) => {
    const col = subjColor(t.s);
    if (t.type === 'deliver') {
      return `
        <div class="card plan-card" style="--c:${col}">
          <div class="plan-head"><span class="kicon k-${t.item.kind}">${I[t.item.kind]}</span>
            <div><strong>${esc(t.item.title)}</strong><small>${esc(S.shortName(t.s))} · se entrega ${rel(t.item.date).toLowerCase()}${t.item.time ? ' a las ' + t.item.time : ''}</small></div>
            <button class="tick" data-action="toggle-done" data-id="${t.item.id}" aria-label="Marcar como entregada">${I.check}</button>
          </div>
        </div>`;
    }
    const head = `
      <div class="plan-head">
        <span class="plan-days ${t.daysLeft <= 7 ? 'soon' : ''}"><b>${t.daysLeft}</b>${t.daysLeft === 1 ? 'día' : 'días'}</span>
        <div><strong>${esc(t.s.name)}</strong><small>${esc(t.exam.title)} · ${shortDate(t.exam.date)}</small></div>
        <button class="round-btn sm" data-action="study-go" data-s="${t.s.id}" data-t="${t.topics?.[0]?.id || ''}" aria-label="Estudiar ahora">${I.play}</button>
      </div>`;
    if (t.type === 'notopics') {
      return `<div class="card plan-card" style="--c:${col}">${head}
        <p class="plan-text">Añade los temas que entran y te digo cuántos tocan cada día.</p>
        <button class="btn sm ghost" data-action="go-topics" data-id="${t.s.id}">${I.plusSm} Añadir temas</button></div>`;
    }
    const known = t.total ? t.total - t.pending : 0;
    return `<div class="card plan-card" style="--c:${col}">${head}
      ${t.type === 'topics' ? `
        <div class="plan-progress"><i style="width:${(known / t.total) * 100}%"></i></div>
        <p class="plan-text">${t.pending === 1 ? 'Te queda 1 tema' : `Te quedan ${t.pending} de ${t.total} temas`} · hoy toca:</p>` : '<p class="plan-text">Lo llevas todo visto. Hoy, un repaso:</p>'}
      <div class="plan-topics">${t.topics.map((tp) => `
        <div class="plan-topic">${confMeter(tp, t.s)}<span>${esc(tp.name)}</span>
          <button class="icon-btn ghost sm" data-action="study-go" data-s="${t.s.id}" data-t="${tp.id}" aria-label="Estudiar este tema">${I.play}</button></div>`).join('')}
      </div></div>`;
  }).join('')}</div>`;
}

function weekChart() {
  const days = St.lastDays(7);
  const max = Math.max(60, ...days.map((d) => d.total));
  const total = days.reduce((a, d) => a + d.total, 0);
  const today = S.ymd();
  const subs = St.bySubject(7);
  return `
    <div class="card">
      <div class="chart-head"><div><strong>${mins(total)}</strong><small>últimos 7 días · ${mins(Math.round(total / 7))} de media</small></div></div>
      <div class="bars">${days.map((d) => `
        <div class="bar-col ${d.date === today ? 'today' : ''}">
          <div class="sbar" style="height:${(d.total / max) * 100}%">${[...d.bySubject].map(([sid, m]) =>
            `<i style="flex:${m};background:${subjColor(S.subject(sid))}"></i>`).join('')}</div>
          <small>${S.DAYS_SHORT[S.weekday(d.d) - 1]}</small>
        </div>`).join('')}
      </div>
      ${subs.length ? `<div class="subj-time">${subs.map((x) => {
        const sub = S.subject(x.subjectId);
        return `<div class="st-row" style="--c:${subjColor(sub)}">
          <span><b class="sdot"></b>${sub ? esc(S.shortName(sub)) : 'General'}</span>
          <span class="st-bar"><i style="width:${(x.minutes / subs[0].minutes) * 100}%"></i></span>
          <b>${mins(x.minutes)}</b></div>`;
      }).join('')}</div>` : ''}
    </div>`;
}

function sessionsList() {
  const list = St.recentSessions(8);
  if (!list.length) return '<p class="hint">Aquí aparecerán tus sesiones de estudio.</p>';
  return `<div class="card flush">${list.map((x) => {
    const sub = S.subject(x.subjectId);
    const tp = St.topicOf(x.subjectId, x.topicId);
    const when = x.date === S.ymd() ? 'Hoy' : S.daysUntil(x.date) === -1 ? 'Ayer' : dayMonth(x.date);
    const hour = new Date(x.start).toTimeString().slice(0, 5);
    return `
      <div class="row-item swipe" data-id="${x.id}" data-left="del-session" data-left-out="1" style="--c:${subjColor(sub)}">
        <div class="swipe-bg"><span class="sw-right"></span><span class="sw-left">Borrar ${I.trash}</span></div>
        <div class="row-slide">
          <div class="row-main static">
            <span class="kicon">${I.timer}</span>
            <span class="row-text"><strong>${sub ? esc(sub.name) : 'Estudio general'}</strong>
            <small>${when} · ${hour}${tp ? ' · ' + esc(tp.name) : ''}</small></span>
          </div>
          <b class="sess-min">${mins(x.minutes)}</b>
        </div>
      </div>`;
  }).join('')}</div>
  <p class="hint">Desliza una sesión a la izquierda para borrarla.</p>`;
}

function viewStudy() {
  const x = S.state.study;
  const today = St.minutesOn(S.ymd());
  const goal = +x.goal || 120;
  const streak = St.streak();
  const frac = Math.min(1, today / goal);
  const C = 2 * Math.PI * 22;
  return `
    <header class="top">
      <div><p class="eyebrow">${longDate(S.ymd())}</p><h1>Estudio</h1></div>
      <button class="icon-btn" data-action="study-settings" aria-label="Ajustes de estudio">${I.gear}</button>
    </header>

    <div class="goal-row">
      <div class="goal-ring">
        <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">
          <circle cx="26" cy="26" r="22" fill="none" stroke="var(--surface-3)" stroke-width="6"/>
          <circle class="arc" cx="26" cy="26" r="22" fill="none" stroke="${frac >= 1 ? 'var(--good)' : 'var(--accent)'}" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${C} ${C}" stroke-dashoffset="${C * (1 - frac)}" style="--len:${C}" transform="rotate(-90 26 26)"/>
        </svg>
      </div>
      <div class="goal-text">
        <strong><span data-count="${today}" data-dec="0">${today}</span> de ${goal} min hoy</strong>
        <small>${frac >= 1 ? '¡Objetivo cumplido!' : `Te faltan ${mins(goal - today)}`}</small>
      </div>
      <div class="streak ${streak ? 'on' : ''}">${I.flame}<b>${streak}</b><small>${streak === 1 ? 'día' : 'días'}</small></div>
    </div>

    ${timerCard()}

    <a class="card sp-cta" href="#/plan-estudio">
      <span class="coach-ico">${I.cal}</span>
      <span class="row-text"><strong>Plan hasta los exámenes</strong><small>${spCtaText()}</small></span>
      ${I.chevron}
    </a>

    <h2 class="section-title">Qué estudiar hoy</h2>
    ${planList()}

    <h2 class="section-title">Tu semana</h2>
    ${weekChart()}

    <h2 class="section-title">Sesiones <button class="link right" data-action="add-session">${I.plusSm} Añadir a mano</button></h2>
    ${sessionsList()}`;
}

// --- Tarjeta de estudio en Hoy ---

function studyHomeCard() {
  const x = S.state.study;
  const today = St.minutesOn(S.ymd());
  const goal = +x.goal || 120;
  const plan = St.todayPlan().find((t) => t.type === 'topics' || t.type === 'review');
  const frac = Math.min(1, today / goal);
  return `
    <a class="card study-home" href="#/estudio">
      <div class="sh-bar"><i style="width:${frac * 100}%"></i></div>
      <div class="sh-row">
        <div><strong>${today ? `${mins(today)} estudiados hoy` : 'Hoy aún no has estudiado'}</strong>
        <small>${plan ? `Toca: ${esc(plan.topics.map((t) => t.name).slice(0, 2).join(', '))} (${esc(S.shortName(plan.s))})` : `Objetivo: ${mins(goal)} al día`}</small></div>
        <button class="round-btn sm main" data-action="study-go" ${plan ? `data-s="${plan.s.id}" data-t="${plan.topics[0]?.id || ''}"` : ''} aria-label="Empezar a estudiar">${I.play}</button>
      </div>
    </a>`;
}

// --- Temporizador: cada segundo ---

let finishing = false;
function tickStudy() {
  const t = St.timer();
  document.body.classList.toggle('has-timer', !!t && route().name !== 'estudio');
  if (!t) { miniEl.hidden = true; return; }
  const left = St.remaining();
  if (left <= 0 && !finishing) { completeBlock(); return; }
  document.querySelectorAll('[data-timer-text]').forEach((el) => { el.textContent = clock(left); });
  document.querySelectorAll('[data-timer-arc]').forEach((el) => {
    el.setAttribute('stroke-dashoffset', TC * (left / t.duration));
    el.style.opacity = left >= t.duration - 0.5 ? 0 : 1;
  });
  // Barra pequeña en el resto de pantallas
  if (route().name === 'estudio' || !overlay.hidden && overlay.querySelector('.wizard')) { miniEl.hidden = true; return; }
  const sub = S.subject(t.subjectId);
  const running = t.pausedLeft == null;
  miniEl.hidden = false;
  miniEl.style.setProperty('--c', t.mode === 'break' ? 'var(--good)' : subjColor(sub));
  miniEl.style.setProperty('--p', `${St.progress() * 100}%`);
  const label = t.mode === 'break' ? 'Descanso' : sub ? esc(S.shortName(sub)) : 'Estudio';
  const html = `
    <a href="#/estudio" class="mt-main"><span class="mt-dot"></span><span>${label}</span><b>${clock(left)}</b></a>
    <button class="mt-btn" data-action="${running ? 'study-pause' : 'study-resume'}" aria-label="${running ? 'Pausa' : 'Seguir'}">${running ? I.pause : I.play}</button>`;
  if (miniEl.dataset.k !== `${label}|${running}`) {
    miniEl.innerHTML = html;
    miniEl.dataset.k = `${label}|${running}`;
  } else {
    miniEl.querySelector('b').textContent = clock(left);
  }
}
setInterval(tickStudy, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tickStudy(); });

/** Fin de un bloque: guarda la sesión y celebra */
function completeBlock() {
  finishing = true;
  const res = St.finish();
  finishing = false;
  if (!res) return;
  St.chime();
  haptic('success');
  render();
  if (res.mode === 'break') {
    toast('Descanso terminado. ¡A por otro bloque!');
    return;
  }
  confetti({ power: 0.8 });
  const sub = S.subject(res.subjectId);
  const tp = St.topicOf(res.subjectId, res.topicId);
  const today = St.minutesOn(S.ymd());
  openOverlay(`
    <div class="sheet auto done-sheet" role="dialog" aria-modal="true" aria-label="Bloque terminado">
      ${sheetHead('¡Bloque terminado!')}
      <div class="sheet-body">
        <p class="done-big">+${res.session ? res.session.minutes : 0} min</p>
        <p class="menu-sub center">${sub ? esc(sub.name) : 'Estudio general'} · llevas ${mins(today)} hoy</p>
        ${tp ? `
          <p class="field-label">¿Cómo llevas «${esc(tp.name)}»?</p>
          <div class="conf-pick">${St.CONF.map((c, i) =>
            `<button class="conf-opt c${i} ${St.confOf(tp) === i ? 'on' : ''}" data-action="set-conf" data-id="${sub.id}" data-t="${tp.id}" data-c="${i}"><span class="conf c${i}"><i></i><i></i><i></i></span>${c.label}</button>`).join('')}</div>` : ''}
        <button class="btn primary block mt" data-action="study-go" data-mode="break">${I.playBig} Descanso de ${mins(St.nextMinutes('break'))}</button>
        <button class="btn block" data-action="study-again">Otro bloque de estudio</button>
        <button class="btn text block" data-action="close">Terminar por hoy</button>
      </div>
    </div>`, 'bottom');
}

function removeSession(id) {
  const r = St.deleteSession(id);
  if (!r) return;
  haptic();
  render();
  undoable(`Sesión de ${mins(r.s.minutes)} borrada`, () => St.restoreSession(r));
}

// =============================================================
//  PLANNING DIARIO
// =============================================================

let planDate = S.ymd();
const M = S.minutes;
const BI = {
  study: svg('<path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5z"/><path d="M8 7h8M8 11h6"/>', 'width="16" height="16"'),
  task: svg('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/>', 'width="16" height="16"'),
  break: svg('<path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4z"/><path d="M6 1v3M10 1v3M14 1v3"/>', 'width="16" height="16"'),
  personal: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>', 'width="16" height="16"'),
  class: svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>', 'width="16" height="16"'),
};

const blockColor = (b) => {
  const s = S.subject(b.subjectId);
  if (b.kind === 'break') return 'var(--good)';
  if (b.kind === 'personal') return 'var(--muted)';
  if (s) return subjColor(s);
  return b.kind === 'task' ? 'var(--k-entrega)' : 'var(--accent)';
};

/** Fecha de un bloque guardado (para los gestos) */
function blockDate(id) {
  for (const [d, v] of Object.entries(S.state.plan.days)) if (v.blocks?.some((b) => b.id === id)) return d;
  return planDate;
}

function dayLabel(date) {
  const n = S.daysUntil(date);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  return cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(S.toDate(date)));
}

function blockRow(b, date, nowM) {
  const s = S.subject(b.subjectId);
  const today = S.ymd();
  const isNow = date === today && b.end && nowM >= M(b.start) && nowM < M(b.end);
  const past = date < today || (date === today && b.end && M(b.end) <= nowM);
  if (b.kind === 'class') {
    return `
      <a class="pb-row class ${S.slotArea(b.slotType)} ${isNow ? 'now' : ''} ${past ? 'past' : ''}" href="#/asignatura/${b.subjectId}" style="--c:${subjColor(s)}">
        <span class="pb-time"><b>${b.start}</b><small>${b.end}</small></span>
        <span class="pb-bar"></span>
        <span class="row-text"><strong>${esc(s?.name || b.title)}</strong><small>Clase de ${esc((b.slotType || '').toLowerCase())}${b.room ? ' · ' + esc(b.room) : ''}</small></span>
        <span class="pb-tag">${BI.class}</span>
      </a>`;
  }
  const dur = b.start && b.end ? M(b.end) - M(b.start) : null;
  const tp = St.topicOf(b.subjectId, b.topicId);
  const meta = [Pl.KINDS[b.kind]?.label, s && !b.title.includes(S.shortName(s)) ? S.shortName(s) : '', tp && !b.title.includes(tp.name) ? tp.name : '', dur ? mins(dur) : '']
    .filter(Boolean).map(esc).join(' · ');
  return `
    <div class="row-item swipe pb-swipe" data-id="${b.id}" data-right="block-done" data-left="del-block" data-left-out="1" style="--c:${blockColor(b)}">
      <div class="swipe-bg"><span class="sw-right done">${I.check} ${b.done ? 'Pendiente' : 'Hecho'}</span><span class="sw-left">Eliminar ${I.trash}</span></div>
      <div class="row-slide pb-row ${b.kind} ${b.done ? 'done' : ''} ${isNow ? 'now' : ''} ${past && !b.done ? 'past' : ''}">
        <span class="pb-time">${b.start ? `<b>${b.start}</b><small>${b.end || ''}</small>` : `<span class="pb-ic">${BI[b.kind] || BI.task}</span>`}</span>
        <span class="pb-bar"></span>
        <button class="row-text" data-action="edit-block" data-id="${b.id}"><strong>${esc(b.title)}</strong><small>${meta}</small></button>
        ${b.kind === 'study' && date === today && !b.done ? `<button class="icon-btn ghost sm" data-action="block-study" data-id="${b.id}" aria-label="Empezar a estudiar">${I.play}</button>` : ''}
        <button class="tick ${b.done ? 'on' : ''}" data-action="block-toggle" data-id="${b.id}" aria-label="${b.done ? 'Marcar pendiente' : 'Marcar hecho'}">${I.check}</button>
      </div>
    </div>`;
}

/** Línea del tiempo del día con huecos libres y la hora actual */
function timelineHTML(date, { compact = false, from = null } = {}) {
  const today = S.ymd();
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  let tl = Pl.timeline(date);
  if (from != null) tl = tl.filter((b) => !b.end || M(b.end) > from);
  const entries = tl.map((b) => ({ t: M(b.start), html: blockRow(b, date, nowM) }));
  if (!compact) {
    for (const [a, b] of Pl.freeSlots(date, 30)) {
      entries.push({ t: a, gap: true, html: `
        <button class="pb-gap" data-action="new-block" data-start="${Pl.hhmm(a)}" data-end="${Pl.hhmm(Math.min(b, a + 60))}">
          <span>Hueco libre ${Pl.hhmm(a)}–${Pl.hhmm(b)} · ${mins(b - a)}</span><b>${I.plusSm} Añadir</b>
        </button>` });
    }
  }
  if (date === today && !compact) entries.push({ t: nowM, now: true, html: `<div class="pb-now"><span>${Pl.hhmm(nowM)}</span></div>` });
  entries.sort((x, y) => x.t - y.t || (x.now ? -1 : y.now ? 1 : x.gap ? -1 : 0));
  return entries.map((e) => e.html).join('');
}

function viewPlan() {
  const date = planDate;
  const today = S.ymd();
  const tl = Pl.timeline(date);
  const un = Pl.untimed(date);
  const pr = Pl.progress(date);
  const own = Pl.dayBlocks(date);
  const studyMin = own.filter((b) => b.kind === 'study' && b.start && b.end).reduce((a, b) => a + M(b.end) - M(b.start), 0);
  return `
    ${topBar('Planning', { back: '#/inicio', action: `<button class="icon-btn" data-action="go-tutor" aria-label="Tutor IA">${I.sparkle}</button>` })}
    <div class="wk-nav">
      <button class="icon-btn sm" data-action="plan-day" data-v="-1" aria-label="Día anterior">${I.left}</button>
      <button class="wk-label" data-action="plan-day" data-v="0"><strong>${dayLabel(date)}</strong><small>${longDate(date)}</small></button>
      <button class="icon-btn sm" data-action="plan-day" data-v="1" aria-label="Día siguiente">${I.right}</button>
    </div>

    ${pr.total ? `
      <div class="plan-sum">
        <div class="progress"><i style="width:${(pr.done / pr.total) * 100}%;background:var(--good)"></i></div>
        <span>${pr.done} de ${pr.total} hechos${studyMin ? ` · ${mins(studyMin)} de estudio planificado` : ''}</span>
      </div>` : ''}

    <div class="two plan-actions">
      <button class="btn primary" data-action="plan-auto">${I.wand} Organízame el día</button>
      <button class="btn" data-action="plan-ai">${I.sparkle} Pedir a la IA</button>
    </div>
    <p class="hint">Organízame rellena los huecos con lo que más urge (exámenes, temas flojos, entregas y repasar las clases). Si lo vuelves a pulsar, rehace lo que no has marcado como hecho.</p>

    <div class="card flush pb-list mt" data-swipe-nav="plan">
      ${tl.length || Pl.freeSlots(date, 30).length ? timelineHTML(date) : `<p class="pad muted center">Este día ya ha pasado.</p>`}
    </div>
    <p class="hint">Desliza un bloque a la derecha para marcarlo hecho y a la izquierda para borrarlo. Desliza la lista para cambiar de día.</p>

    <h2 class="section-title">Tareas sin hora ${un.length ? `<span class="count">${un.filter((b) => b.done).length}/${un.length}</span>` : ''}</h2>
    <div class="card flush">
      ${un.map((b) => blockRow(b, date, -1)).join('')}
      <form class="topic-new" data-save="add-task">
        <input class="input" name="task" placeholder="Añadir tarea… (ej. Imprimir apuntes)" enterkeyhint="done" autocomplete="off">
        <button class="icon-btn sm" type="submit" aria-label="Añadir tarea">${I.plusSm}</button>
      </form>
    </div>
    <button class="btn ghost block mt" data-action="new-block">${I.plusSm} Añadir bloque con hora</button>
    <a class="card sp-cta mt" href="#/plan-estudio">
      <span class="coach-ico">${I.cal}</span>
      <span class="row-text"><strong>Plan hasta los exámenes</strong><small>Reparte el temario de varias semanas en tus días</small></span>
      ${I.chevron}
    </a>`;
}

/** Tarjeta "Tu día" en Hoy: qué toca ahora y lo siguiente */
function dayCard() {
  const today = S.ymd();
  const own = Pl.dayBlocks(today);
  const { cur, next, m } = Pl.nowAndNext(today);
  if (!own.length) {
    return `
      <div class="card plan-start">
        <div class="ps-head"><span class="opt-ic">${I.wand}</span><div><strong>Planifica tu día</strong><small>Te organizo los huecos entre clases con lo que más urge.</small></div></div>
        <div class="two mt">
          <button class="btn primary" data-action="plan-auto" data-today="1">Organízamelo</button>
          <button class="btn" data-action="plan-ai" data-today="1">${I.sparkle} Con la IA</button>
        </div>
        <a class="link center-link small-link" href="#/plan" data-action="plan-open">Lo hago yo</a>
      </div>`;
  }
  const guideB = cur || next;
  const s = guideB ? S.subject(guideB.subjectId) : null;
  const guide = guideB ? `
    <div class="guide" style="--c:${guideB.kind === 'class' ? subjColor(s) : blockColor(guideB)}">
      <span class="guide-label ${cur ? 'live' : ''}">${cur ? `Ahora · hasta las ${cur.end}` : `Siguiente · ${M(next.start) - m < 60 ? `en ${M(next.start) - m} min` : `a las ${next.start}`}`}</span>
      <strong>${esc(guideB.kind === 'class' ? `Clase de ${s?.name || guideB.title}` : guideB.title)}</strong>
      ${cur && cur.kind === 'study' ? `<button class="btn sm primary mt" data-action="block-study" data-id="${cur.id}">${I.play} Empezar pomodoro</button>` : ''}
      ${cur && cur.kind !== 'study' && cur.kind !== 'class' ? `<button class="btn sm mt" data-action="block-toggle" data-id="${cur.id}">${I.check} Hecho</button>` : ''}
    </div>` : `
    <div class="guide done"><span class="guide-label">Planning de hoy</span><strong>¡Has terminado lo que tenías! 🎉</strong></div>`;
  const pr = Pl.progress(today);
  const rest = timelineHTML(today, { compact: true, from: m }).trim();
  return `
    <h2 class="section-title">Tu día <span class="count">${pr.done}/${pr.total}</span><a class="link right" href="#/plan" data-action="plan-open">Ver todo</a></h2>
    <div class="card day-card">
      ${guide}
      ${rest ? `<div class="pb-list compact">${rest}</div>` : ''}
    </div>`;
}

function tutorCard() {
  return `
    <a class="card tutor-cta" href="#/tutor">
      <span class="coach-ico">${I.sparkle}</span>
      <span class="row-text"><strong>Tu tutor IA</strong><small>Te organiza el día y te dice qué estudiar ahora</small></span>
      ${I.chevron}
    </a>`;
}

// --- Hoja de un bloque ---

function topicOptions(subjectId) {
  const s = S.subject(subjectId);
  return [['', 'Ningún tema'], ...((s?.topics || []).map((t) => [t.id, `${t.name} (${St.CONF[St.confOf(t)].short.toLowerCase()})`]))];
}

function openBlockSheet(id, preset = {}) {
  const date = id ? blockDate(id) : planDate;
  const b = id ? Pl.block(date, id) : Pl.newBlock(preset);
  sheetCtx = { id, date };
  const subs = [['', 'Ninguna'], ...S.activeSubjects().map((x) => [x.id, x.name])];
  openSheet(id ? 'Editar bloque' : 'Nuevo bloque', `
    <div class="field"><span>Tipo</span>${segPick('kind', Object.entries(Pl.KINDS).map(([k, v]) => [k, v.label]), b.kind)}</div>
    ${field('Qué vas a hacer', text('title', b.title, 'placeholder="Ej. Ejercicios de grafos" autocapitalize="sentences"'))}
    ${field('Asignatura', select('subjectId', subs, b.subjectId))}
    ${field('Tema', `<span id="topic-sel">${select('topicId', topicOptions(b.subjectId), b.topicId)}</span>`)}
    <div class="two">
      ${field('Empieza', `<input class="input" type="time" name="start" value="${esc(b.start)}">`)}
      ${field('Termina', `<input class="input" type="time" name="end" value="${esc(b.end)}">`)}
    </div>
    <p class="hint">Sin hora queda como tarea del día.</p>
    <label class="check"><input type="checkbox" name="done" ${b.done ? 'checked' : ''}><span>Hecho</span></label>`,
  'save-block',
  id ? `<button class="btn text-danger block mt" type="button" data-action="del-block" data-id="${id}">${I.trash} Eliminar</button>` : '');
}

function toggleBlock(id, fromEl) {
  const date = blockDate(id);
  const b = Pl.block(date, id);
  if (!b) return;
  b.done = !b.done;
  S.save();
  const r = fromEl?.getBoundingClientRect();
  haptic(b.done ? 'success' : 'light');
  render();
  if (b.done && r) confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, power: 0.3 });
  const pr = Pl.progress(date);
  if (b.done && pr.total > 1 && pr.done === pr.total) {
    toast('¡Día completado! 🎉');
    confetti({ power: 1.2 });
  }
}

function removeBlockUndo(id) {
  const r = Pl.removeBlock(blockDate(id), id);
  if (!r) return;
  haptic();
  render();
  undoable(`"${r.b.title}" eliminado`, () => Pl.restoreBlock(r));
}

function runAutoPlan(date) {
  const res = Pl.autoPlan(date);
  planDate = date;
  haptic(res.added.length ? 'success' : 'heavy');
  if (route().name !== 'plan') go('#/plan'); else render();
  if (!res.added.length) {
    toast('No hay huecos libres o nada pendiente que meter');
    return;
  }
  const n = res.added.filter((b) => b.kind !== 'break').length;
  undoable(`${n} ${n === 1 ? 'bloque añadido' : 'bloques añadidos'}`, () => Pl.undoAuto(date, res));
}

// =============================================================
//  PLAN DE ESTUDIO (varios días hasta los exámenes)
// =============================================================

function spCtaText() {
  const sum = SP.settings().summary;
  if (!sum) return 'Reparte el temario de cada asignatura día a día hasta el examen';
  const short = sum.summary.filter((x) => x.left > 0).length;
  return short ? `${short} ${short === 1 ? 'examen no llega' : 'exámenes no llegan'} con tu tiempo: revísalo` : `Planificado hasta el ${dayMonth(sum.to)}`;
}

const hoursLabel = (h) => (h === 0 ? 'Nada' : `${fmt(h, 1)} h`);

function viewStudyPlan() {
  const cfg = SP.settings();
  const to = SP.horizonEnd(cfg.horizon);
  const exams = SP.planExams(to);
  const subs = S.activeSubjects().filter((s) => S.isThisYear(s) || !s.academicYear);
  const sum = cfg.summary;
  const today = S.ymd();
  const byId = new Map((sum?.summary || []).map((x) => [x.examId, x]));

  const syllabus = subs.map((s) => {
    const n = (s.topics || []).length;
    const h = (s.topics || []).reduce((a, t) => a + SP.topicHours(t), 0);
    const np = (s.topics || []).filter((t) => S.topicArea(t) === 'practicas').length;
    return `
      <div class="sp-sub" style="--c:${subjColor(s)}">
        <span class="row-text"><strong><b class="sdot"></b>${esc(s.name)}</strong>
          <small class="${n ? '' : 'text-bad'}">${n ? `${n - np} de teoría${np ? ` · ${np} de prácticas` : ''} · ~${fmt(h, 1)} h` : 'Sin temario: el plan no sabe qué estudiar'}</small></span>
        <button class="btn sm ${n ? 'ghost' : 'primary'}" data-action="paste-topics" data-id="${s.id}" data-area="${n && !np ? 'practicas' : 'teoria'}">${n ? 'Añadir' : 'Pegar temario'}</button>
      </div>`;
  }).join('');

  const examRows = exams.map((ex) => {
    const s = S.subject(ex.subjectId);
    const w = SP.examWork(ex);
    const r = byId.get(ex.id);
    const ok = r && r.left === 0;
    const pctDone = r && r.need ? Math.min(1, (r.need - r.left) / r.need) : 0;
    return `
      <div class="sp-exam" style="--c:${subjColor(s)}">
        <div class="sp-ex-head">
          <span class="plan-days ${S.daysUntil(ex.date) <= 7 ? 'soon' : ''}"><b>${S.daysUntil(ex.date)}</b>${S.daysUntil(ex.date) === 1 ? 'día' : 'días'}</span>
          <div class="row-text"><strong>${esc(s.name)}</strong><small>${ex.kind === 'practica' ? '<em class="ptag">Prácticas</em> ' : ''}${esc(ex.title)} · ${shortDate(ex.date)}</small></div>
          <button class="btn sm ghost" data-action="edit-item" data-id="${ex.id}">Temas</button>
        </div>
        <p class="sp-ex-info">${w.topics.length ? `${w.topics.length} temas${ex.topicIds?.length ? '' : ' (automático)'} · te faltan ~${mins(w.need)} según lo que dominas` : `<span class="text-bad">Sin temas: añade el temario de ${S.examArea(ex) === 'practicas' ? 'prácticas' : 'teoría'} o márcalos en el examen</span>`}</p>
        ${r && w.topics.length ? `
          <div class="progress"><i style="width:${pctDone * 100}%;background:${ok ? 'var(--good)' : 'var(--ok)'}"></i></div>
          <p class="sp-ex-info ${ok ? 'text-good' : 'text-bad'}">${ok ? `Planificado entero${r.review ? ` + ${mins(r.review)} de repaso` : ''}` : `Faltan ${mins(r.left)} sin hueco: sube tus horas o empieza antes`}</p>` : ''}
      </div>`;
  }).join('');

  // Calendario del periodo
  const days = [];
  for (let d = S.toDate(today); S.ymd(d) <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(S.ymd(d));
  const byDay = SP.plannedByDay(today, to);
  const examDays = new Map(exams.map((e) => [e.date, e]));
  const maxM = Math.max(60, ...Object.values(byDay).map((x) => x.total));
  const pad = S.weekday(S.toDate(today)) - 1;
  const cal = `
    <div class="sp-cal">
      ${S.DAYS_SHORT.map((x) => `<span class="mh">${x}</span>`).join('')}
      ${'<span></span>'.repeat(pad)}
      ${days.map((date) => {
        const x = byDay[date];
        const ex = examDays.get(date);
        return `
          <button class="sp-day ${date === today ? 'today' : ''} ${ex ? 'exam' : ''}" data-action="sp-day" data-v="${date}" ${ex ? `style="--c:${subjColor(S.subject(ex.subjectId))}"` : ''}>
            <b>${S.toDate(date).getDate()}</b>
            <span class="sp-stack">${x ? [...x.bySubject].map(([sid, m]) => `<i style="flex:${m};background:${subjColor(S.subject(sid))}"></i>`).join('') : ''}</span>
            <small>${ex ? 'Examen' : x ? mins(x.total).replace(' min', '′') : ''}</small>
            ${x ? `<span class="sp-fill" style="height:${(x.total / maxM) * 100}%"></span>` : ''}
          </button>`;
      }).join('')}
    </div>`;

  return `
    ${topBar('Plan de estudio', { back: '#/estudio', action: `<button class="icon-btn" data-action="sp-ai" aria-label="Revisar con la IA">${I.sparkle}</button>` })}
    <p class="lead">Mete el temario de cada asignatura, marca qué entra en cada examen y te reparto el estudio día a día, en los huecos entre tus clases.</p>

    <h2 class="section-title">1 · Temarios</h2>
    <div class="card flush">${syllabus || '<p class="pad muted">Añade primero tus asignaturas.</p>'}</div>

    <h2 class="section-title">2 · Tu tiempo para estudiar</h2>
    <div class="card form">
      <div class="field"><span>Entre semana (cada día)</span>
        <div class="chips">${[1, 2, 3, 4, 5, 6].map((h) => `<button class="chip ${+cfg.weekday === h ? 'on' : ''}" data-action="sp-set" data-k="weekday" data-v="${h}">${hoursLabel(h)}</button>`).join('')}</div></div>
      <div class="field"><span>Sábados y domingos</span>
        <div class="chips">${[0, 2, 3, 4, 5, 6].map((h) => `<button class="chip ${+cfg.weekend === h ? 'on' : ''}" data-action="sp-set" data-k="weekend" data-v="${h}">${hoursLabel(h)}</button>`).join('')}</div></div>
      <div class="field"><span>Planificar</span>
        <div class="seg">${[['2w', '2 semanas'], ['month', '1 mes'], ['all', 'Hasta el último examen']].map(([k, l]) =>
          `<button class="${cfg.horizon === k ? 'on' : ''}" data-action="sp-set" data-k="horizon" data-v="${k}">${l}</button>`).join('')}</div></div>
      <p class="hint">Solo se usa tu horario del día (${S.state.plan.start}–${S.state.plan.end}, en Ajustes), sin tocar clases, comidas ni lo que ya tengas planificado.</p>
    </div>

    <h2 class="section-title">3 · Exámenes hasta el ${dayMonth(to)} <span class="count">${exams.length}</span></h2>
    ${exams.length ? `<div class="stack">${examRows}</div>` : '<p class="hint">No tienes exámenes con fecha en este periodo. Añádelos en cada asignatura (Fechas) o desde Agenda.</p>'}

    <button class="btn primary block big-btn mt-lg" data-action="sp-generate">${I.wand} ${sum ? 'Rehacer el plan' : 'Hacer mi plan de estudio'}</button>
    <p class="hint center">${sum ? `Último plan: ${sum.blocks} bloques hasta el ${dayMonth(sum.to)}. Al rehacerlo se cambia lo que no has marcado como hecho.` : 'Lo puedes rehacer cuando quieras: lo que ya hayas hecho se respeta.'}</p>

    ${sum ? `
      <h2 class="section-title">Tu calendario de estudio</h2>
      <div class="card">${cal}<p class="hint">Toca un día para ver su planning con las horas.</p></div>
      <button class="btn block mt" data-action="sp-ai">${I.sparkle} Que la IA revise mi plan</button>` : ''}`;
}

function openPasteTopics(id, area = 'teoria') {
  const s = S.subject(id);
  sheetCtx = { id };
  const count = (a) => (s.topics || []).filter((t) => S.topicArea(t) === a).length;
  openSheet(`Temario de ${esc(S.shortName(s))}`, `
    <div class="field"><span>Es el temario de</span>${segPick('area', [['teoria', 'Teoría'], ['practicas', 'Prácticas']], area)}</div>
    <p class="hint">Pega la lista de temas (o de prácticas), uno por línea. Puedes copiarla del PDF de la guía docente o de la Enseñanza Virtual: quito solo los números y los «Tema 1.».</p>
    <textarea class="input area big-area" name="text" placeholder="Tema 1. Introducción a los grafos&#10;Tema 2. Recorridos en anchura y profundidad&#10;Tema 3. Caminos mínimos&#10;…"></textarea>
    <div class="two">
      ${field('Horas por tema (aprox.)', text('hours', '3', 'inputmode="decimal"'))}
      <div class="field"><span>Vista previa</span><div class="paste-count" id="paste-count">0 temas</div></div>
    </div>
    ${(s.topics || []).length ? `<label class="check"><input type="checkbox" name="replace"><span>Sustituir los temas que ya tiene en esa parte (teoría: ${count('teoria')}, prácticas: ${count('practicas')})</span></label>` : ''}`,
  'save-topics');
}

function openTopicSheet(subjectId, topicId) {
  const t = St.topicOf(subjectId, topicId);
  if (!t) return;
  sheetCtx = { subjectId, topicId };
  openSheet('Tema', `
    ${field('Nombre', text('name', t.name, 'autocapitalize="sentences"'))}
    <div class="field"><span>Es de</span>${segPick('area', [['teoria', 'Teoría'], ['practicas', 'Prácticas']], S.topicArea(t))}</div>
    ${field('Horas que le calculas', text('hours', fmt(SP.topicHours(t), 1), 'inputmode="decimal"'))}
    <div class="field"><span>Cómo lo llevas</span>${segPick('conf', St.CONF.map((c, i) => [i, c.short]), St.confOf(t))}</div>
    <p class="hint">El plan reparte las horas según lo que lo domines: un tema «bien» necesita menos de la mitad que uno sin empezar.</p>`, 'save-topic');
}

// =============================================================
//  TUTOR IA
// =============================================================

let aiBusy = false;
let aiError = null;
let aiOutdated = false;

const TUTOR_SUGGESTIONS = [
  'Organízame el día de hoy',
  '¿Qué estudio ahora?',
  '¿Cómo voy en cada asignatura?',
  'Hazme un plan para mi próximo examen',
  '¿Llego bien a los exámenes con mi plan?',
  'Estoy agobiado, ¿por dónde empiezo?',
];

function planCard(plan, i, applied) {
  const date = plan.date;
  return `
    <div class="ai-plan">
      <div class="ai-plan-head">${I.cal}<strong>Plan para ${dayLabel(date).toLowerCase() === 'hoy' ? 'hoy' : dayLabel(date).toLowerCase()}</strong></div>
      ${plan.blocks.map((b) => {
        const s = S.subject(b.subjectId);
        return `<div class="ai-plan-row" style="--c:${blockColor(b)}"><span>${b.start}–${b.end}</span><b>${esc(b.title)}</b>${s ? `<em>${esc(S.shortName(s))}</em>` : ''}</div>`;
      }).join('')}
      <button class="btn sm ${applied ? '' : 'primary'} block mt" data-action="ai-apply" data-i="${i}" ${applied ? 'disabled' : ''}>
        ${applied ? `${I.check} Añadido al planning` : `${I.plusSm} Añadir a mi planning`}
      </button>
    </div>`;
}

function chatMessage(m, i) {
  if (m.role === 'user') return `<div class="msg user"><div class="bubble">${esc(m.content)}</div></div>`;
  const { text, plan } = splitPlan(m.content);
  return `
    <div class="msg bot"><span class="bot-ico">${I.sparkle}</span>
      <div class="bubble">${renderMarkdown(text)}${plan ? planCard(plan, i, m.applied) : ''}</div>
    </div>`;
}

let tutorBack = '#/inicio';

function viewTutor() {
  const chat = S.state.chat;
  const empty = !chat.length;
  return `
    ${topBar('Tutor IA', {
      back: tutorBack,
      action: chat.length ? `<button class="icon-btn" data-action="ai-clear" aria-label="Borrar conversación">${I.trash}</button>` : '',
    })}
    ${empty ? `
      <div class="coach-hello">
        <span class="hello-ic">${I.sparkle}</span>
        <h2>¿Qué hacemos hoy${S.state.settings.name ? `, ${esc(S.state.settings.name)}` : ''}?</h2>
        <p class="hint">Conozco tus clases, tu planning, tus exámenes y entregas, tus notas y cómo llevas cada tema. Te organizo el día y te voy guiando.</p>
      </div>` : ''}
    <div class="chat">
      ${chat.map(chatMessage).join('')}
      ${aiBusy ? `<div class="msg bot"><span class="bot-ico">${I.sparkle}</span><div class="bubble typing"><i></i><i></i><i></i></div></div>` : ''}
      ${aiError ? `<div class="chat-error"><span>${esc(aiError)}</span>${aiOutdated ? '<a class="btn sm" href="#/ajustes">Ver pasos</a>' : '<button class="btn sm" data-action="ai-retry">Reintentar</button>'}</div>` : ''}
    </div>
    ${!aiBusy ? `
      <div class="suggest-chips">
        ${(empty ? TUTOR_SUGGESTIONS : ['¿Qué hago ahora?', 'Organízame mañana', 'Explícame cómo aprobar ' + (S.activeSubjects()[0] ? S.shortName(S.activeSubjects()[0]) : 'una asignatura')])
          .map((q) => `<button class="chip" data-action="ai-suggest" data-q="${esc(q)}">${esc(q)}</button>`).join('')}
      </div>` : ''}
    <p class="disclaimer">Respuestas generadas por IA: pueden equivocarse. Al preguntar se envía un resumen de tus datos de UniLog a tu servidor de Cloudflare.</p>
    <form class="composer" data-save="ai-send">
      <textarea id="ai-input" name="q" rows="1" maxlength="1500" placeholder="Escribe tu pregunta…" enterkeyhint="send"></textarea>
      <button class="send" type="submit" aria-label="Enviar" ${aiBusy ? 'disabled' : ''}>${I.send}</button>
    </form>`;
}

function scrollChatEnd() {
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
}

async function sendTutor(text) {
  text = (text || '').trim();
  if (!text || aiBusy) return;
  const chat = S.state.chat;
  if (text !== '__retry__') chat.push({ role: 'user', content: text, t: Date.now() });
  aiBusy = true;
  aiError = null;
  aiOutdated = false;
  S.save();
  if (route().name === 'tutor') { render(); scrollChatEnd(); }
  try {
    const reply = await askTutor(chat);
    chat.push({ role: 'assistant', content: reply, t: Date.now() });
    if (chat.length > 40) chat.splice(0, chat.length - 40);
    S.save();
    haptic();
  } catch (e) {
    aiError = e.message;
    aiOutdated = !!e.outdated;
  } finally {
    aiBusy = false;
  }
  if (route().name === 'tutor') { render(); scrollChatEnd(); }
}

function openTutor(question) {
  if (route().name !== 'tutor') tutorBack = location.hash || '#/inicio';
  go('#/tutor');
  if (question) setTimeout(() => sendTutor(question), 50);
}

// =============================================================
//  AJUSTES
// =============================================================

function viewSettings() {
  const st = S.state.settings;
  const opt = (v, cur, l) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${l}</option>`;
  return `
    ${topBar('Ajustes', { back: '#/inicio' })}

    <h2 class="section-title">Tú</h2>
    <div class="card form">
      <label class="field"><span>Tu nombre</span><input class="input" data-field="set" data-k="name" value="${esc(st.name)}" placeholder="Para saludarte" autocomplete="given-name"></label>
      <label class="field"><span>Titulación</span><input class="input" data-field="set" data-k="degree" value="${esc(st.degree)}"></label>
      <label class="field"><span>Universidad</span><input class="input" data-field="set" data-k="university" value="${esc(st.university)}"></label>
      <div class="two">
        <label class="field"><span>Créditos de la carrera</span><input class="input" data-field="set" data-k="totalCredits" value="${esc(st.totalCredits)}" inputmode="numeric"></label>
        <label class="field"><span>Nota para aprobar</span><input class="input" data-field="set" data-k="passMark" value="${fmt(st.passMark)}" inputmode="decimal"></label>
      </div>
    </div>

    <h2 class="section-title">Planning diario</h2>
    <div class="card form">
      <div class="two">
        <label class="field"><span>Empiezo el día a las</span><input class="input" type="time" data-field="plan-h" data-k="start" value="${esc(S.state.plan.start)}"></label>
        <label class="field"><span>Termino a las</span><input class="input" type="time" data-field="plan-h" data-k="end" value="${esc(S.state.plan.end)}"></label>
      </div>
      <p class="hint">Organízame y la IA solo ponen cosas dentro de este horario.</p>
    </div>

    <h2 class="section-title">Tutor IA</h2>
    <div class="card form">
      <label class="field"><span>Dirección del servidor (Cloudflare Worker)</span>
        <input class="input" data-field="set" data-k="aiUrl" value="${esc(st.aiUrl || '')}" placeholder="${esc(DEFAULT_AI_URL)}" inputmode="url" autocapitalize="off" spellcheck="false"></label>
      <p class="hint">Usa el mismo servidor que GymLog. Si lo dejas vacío, se usa el de GymLog.</p>
      <button class="btn block mt" data-action="ai-test">${I.sparkle} Probar el tutor</button>
      <details class="steps">
        <summary>Cómo actualizar el servidor para UniLog</summary>
        <ol>
          <li>Entra en el panel de Cloudflare → <b>Workers &amp; Pages</b> → <b>gymlog-ai</b>.</li>
          <li><b>Edit code</b> → borra todo y pega el archivo <code>worker/worker.js</code> del repositorio <code>uni-app</code> → <b>Deploy</b>.</li>
          <li>Listo: sirve a GymLog y a UniLog a la vez. El binding <b>AI</b> que ya tenías se queda igual.</li>
        </ol>
      </details>
    </div>

    <h2 class="section-title">Calendario</h2>
    <div class="card form">
      <label class="field"><span>Cuatrimestre actual</span>
        <select class="input" data-field="set" data-k="term">
          ${opt('auto', st.term, `Automático (ahora: ${S.TERMS[S.currentTermAuto?.() || S.currentTerm()]})`)}
          ${opt('C1', st.term, S.TERMS.C1)}${opt('C2', st.term, S.TERMS.C2)}
        </select>
      </label>
      <p class="hint">Decide qué clases salen en el horario. En automático, de septiembre a enero es el primero y de febrero a agosto el segundo.</p>
      <button class="btn block mt" data-action="export-ics">${I.calAdd} Añadir fechas al calendario del iPhone</button>
      <p class="hint">Crea un archivo con tus exámenes y entregas. Ábrelo y pulsa "Añadir todo". Los exámenes llevan un aviso el día anterior.</p>
    </div>

    <h2 class="section-title">Apariencia</h2>
    <div class="card">
      <div class="seg">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) =>
        `<button class="${st.theme === k ? 'on' : ''}" data-action="theme" data-v="${k}">${l}</button>`).join('')}</div>
    </div>

    <h2 class="section-title">Copia de seguridad</h2>
    <div class="card">
      <p class="muted small">Los datos solo están en este móvil. Guarda una copia de vez en cuando (en Archivos o iCloud).</p>
      <div class="two mt">
        <button class="btn" data-action="export">${I.download} Exportar</button>
        <label class="btn">${I.upload} Importar<input type="file" accept="application/json,.json" data-field="import" hidden></label>
      </div>
    </div>

    <h2 class="section-title">Datos</h2>
    <div class="card">
      ${S.state.subjects.length ? '' : '<button class="btn block" data-action="load-demo">Cargar datos de ejemplo</button>'}
      <button class="btn text-danger block" data-action="reset">${I.trash} Borrar todos los datos</button>
    </div>

    <p class="foot">UniLog ${APP_VERSION} · Hecho para ${esc(st.name || 'ti')}</p>`;
}

// =============================================================
//  VENTANAS EMERGENTES
// =============================================================

let pending = null; // resolve del diálogo abierto
let sheetCtx = null; // datos del formulario abierto

function openOverlay(html, mode) {
  overlay.className = mode;
  overlay.innerHTML = html;
  overlay.hidden = false;
  document.body.classList.add('locked');
}

function closeOverlay() {
  document.activeElement?.blur();
  overlay.hidden = true;
  overlay.innerHTML = '';
  overlay.className = '';
  document.body.classList.remove('locked');
  sheetCtx = null;
  wz = null;
  pad = null;
  if (pending) { const p = pending; pending = null; p(false); }
}

const sheetHead = (title) => `
  <div class="grabber"></div>
  <div class="sheet-head">
    <h2>${title}</h2>
    <button class="icon-btn" type="button" data-action="close" aria-label="Cerrar">${I.x}</button>
  </div>`;

function openSheet(title, body, save, extra = '') {
  openOverlay(`
    <div class="sheet auto" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      ${sheetHead(title)}
      <form class="sheet-body form" data-save="${save}" novalidate>
        ${body}
        <button class="btn primary block mt" type="submit">Guardar</button>
        ${extra}
      </form>
    </div>`, 'bottom');
}

/** Diálogo de confirmación. Devuelve una promesa con true/false */
function ask(message, { ok = 'Aceptar', cancel = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    openOverlay(`
      <div class="dialog" role="alertdialog" aria-modal="true">
        <p>${esc(message)}</p>
        <div class="dialog-actions">
          <button class="btn" data-answer="0">${cancel}</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-answer="1">${ok}</button>
        </div>
      </div>`, 'center');
    pending = resolve;
  });
}

// --- Piezas de formulario ---

const field = (label, input, cls = '') => `<label class="field ${cls}"><span>${label}</span>${input}</label>`;
const text = (name, value = '', attrs = '') =>
  `<input class="input" name="${name}" value="${esc(value ?? '')}" autocomplete="off" ${attrs}>`;
const select = (name, options, value) =>
  `<select class="input" name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const segPick = (name, options, value) => `
  <input type="hidden" name="${name}" value="${esc(value)}">
  <div class="seg" data-pick="${name}">${options.map(([v, l]) =>
    `<button type="button" class="${String(v) === String(value) ? 'on' : ''}" data-action="pick" data-value="${esc(v)}">${l}</button>`).join('')}</div>`;
const swatches = (value) => `
  <input type="hidden" name="color" value="${esc(value)}">
  <div class="swatches" data-pick="color">${S.PALETTE.map((c) =>
    `<button type="button" class="swatch ${c === value ? 'on' : ''}" style="--c:${c}" data-action="pick" data-value="${c}" aria-label="Color"></button>`).join('')}</div>`;
const formData = () => Object.fromEntries(new FormData(overlay.querySelector('form')));

// --- Menú rápido ---

function openQuickAdd() {
  const has = S.state.subjects.some((s) => !s.final);
  const opt = (action, icon, title, sub, data = '') => `
    <button class="qa" data-action="${action}" ${data}>
      <span class="kicon ${icon.startsWith('k-') ? icon : ''}">${I[icon.replace('k-', '')] || icon}</span>
      <span class="row-text"><strong>${title}</strong><small>${sub}</small></span>
    </button>`;
  openOverlay(`
    <div class="sheet auto" role="dialog" aria-modal="true" aria-label="Añadir">
      ${sheetHead('Añadir')}
      <div class="sheet-body">
        ${has ? `
          ${opt('new-item', 'k-examen', 'Examen', 'Fecha, aula y apartado de evaluación', 'data-k="examen"')}
          ${opt('new-item', 'k-practica', 'Práctica', 'Con fecha de entrega y nota', 'data-k="practica"')}
          ${opt('new-item', 'k-entrega', 'Entrega o trabajo', 'Tareas, proyectos, memorias', 'data-k="entrega"')}
          ${opt('new-item', 'k-otro', 'Otro evaluable', 'Participación, test, exposición…', 'data-k="otro"')}` : ''}
        ${opt('new-subject', 'book', 'Asignatura', 'Que estás cursando')}
        ${opt('add-past', 'cap', 'Asignatura aprobada', 'Para tu expediente y tu media')}
      </div>
    </div>`, 'bottom');
}

// --- Asignatura ---

function openSubjectSheet(id, term) {
  const s = id ? S.subject(id) : S.newSubject(term ? { term } : {});
  sheetCtx = { id };
  const years = [1, 2, 3, 4, 5, 6].map((y) => [y, `${y}.º`]);
  openSheet(id ? 'Editar asignatura' : 'Nueva asignatura', `
    ${field('Nombre', text('name', s.name, 'placeholder="Ej. Estructuras de Datos" autocapitalize="sentences"'))}
    <div class="two">
      ${field('Abreviatura', text('short', s.short, 'placeholder="Ej. ED" maxlength="8"'))}
      ${field('Código', text('code', s.code, 'placeholder="Opcional"'))}
    </div>
    <div class="three">
      ${field('Créditos', text('credits', fmt(s.credits, 1), 'inputmode="decimal"'))}
      ${field('Curso', select('year', years, s.year))}
      ${field('Curso acad.', text('academicYear', s.academicYear, 'placeholder="2026/27"'))}
    </div>
    <div class="field"><span>Cuatrimestre</span>${segPick('term', [['C1', '1.º'], ['C2', '2.º'], ['A', 'Anual']], s.term)}</div>

    <div class="only-annual sub-card" ${s.term === 'A' ? '' : 'hidden'}>
      <label class="check"><input type="checkbox" name="split" ${s.split || !id ? 'checked' : ''}><span>Nota en cada cuatrimestre</span></label>
      <div class="tp-grid flat">
        <span></span><b>1.er cuatri</b><b>2.º cuatri</b>
        <small>Peso %</small>${text('p1w', fmt(s.periods?.C1?.weight ?? 50), 'inputmode="decimal"')}${text('p2w', fmt(s.periods?.C2?.weight ?? 50), 'inputmode="decimal"')}
        <small>Mínimo</small>${text('p1m', s.periods?.C1?.min == null ? '' : fmt(s.periods.C1.min), 'inputmode="decimal" placeholder="—"')}${text('p2m', s.periods?.C2?.min == null ? '' : fmt(s.periods.C2.min), 'inputmode="decimal" placeholder="—"')}
      </div>
      <p class="hint">Cada cuatrimestre tiene su nota (con sus parciales y exámenes de prácticas) y la final sale de las dos. Pon la mínima si hay que sacar, por ejemplo, un 4 en cada cuatri para hacer media.</p>
    </div>

    <div class="tp-grid">
      <span></span><b class="teoria">Teoría</b><b class="practicas">Prácticas</b>
      <small>Grupo</small>${text('groupT', S.groupOf(s, 'teoria'), 'placeholder="Ej. T1"')}${text('groupP', s.groupP, 'placeholder="Ej. L3"')}
      <small>Aula</small>${text('room', s.room, 'placeholder="Ej. A3.10"')}${text('roomP', s.roomP, 'placeholder="Ej. L2.05"')}
      ${id ? '' : `
      <small>Peso %</small>${text('wt', '70', 'inputmode="decimal"')}${text('wp', '30', 'inputmode="decimal"')}
      <small>Mínimo</small>${text('mt', '', 'inputmode="decimal" placeholder="—"')}${text('mp', '', 'inputmode="decimal" placeholder="—"')}`}
    </div>
    ${id ? '' : '<p class="hint">Pon el peso de teoría y prácticas en la nota final según la guía docente, y la nota mínima si la hay para hacer media. Si se evalúa de otra forma, deja prácticas a 0 y lo cambias luego en Evaluación.</p>'}

    <div class="field"><span>Color</span>${swatches(s.color)}</div>`, 'save-subject');
}

// --- Asistente para crear una asignatura paso a paso ---

let wz = null;

function openWizard(term) {
  const active = S.activeSubjects();
  const years = active.map((x) => x.year);
  const year = years.length ? years.sort((a, b) => years.filter((y) => y === b).length - years.filter((y) => y === a).length)[0] : 1;
  wz = {
    step: 0,
    d: {
      name: '', short: '', color: S.PALETTE[S.state.subjects.length % S.PALETTE.length],
      credits: 6, year, term: term || S.currentTerm(), split: true,
      p1w: 50, p2w: 50, p1m: '', p2m: '',
      groupT: '', groupP: '', room: '', roomP: '',
      slots: [], slotType: 'Teoría', slotDay: 1, slotStart: '09:00', slotEnd: '10:30',
      evalMode: 'tp', wt: 70, mt: '', mp: '',
    },
  };
  openOverlay('<div class="wizard" role="dialog" aria-modal="true" aria-label="Nueva asignatura"></div>', 'full');
  renderWizard();
}

const wzSteps = () => ['name', 'basics', ...(wz.d.term === 'A' ? ['annual'] : []), 'groups', 'schedule', 'eval', 'summary'];

const optCard = (k, v, cur, title, sub, icon = '') => `
  <button type="button" class="opt-card ${String(cur) === String(v) ? 'on' : ''}" data-action="wz-set" data-k="${k}" data-v="${esc(v)}">
    ${icon ? `<span class="opt-ic">${icon}</span>` : ''}<span class="opt-text"><strong>${title}</strong>${sub ? `<small>${sub}</small>` : ''}</span>
    <span class="opt-check">${I.check}</span>
  </button>`;

const wzChips = (k, list, cur) => `<div class="chips">${list.map(([v, l]) =>
  `<button type="button" class="chip ${String(cur) === String(v) ? 'on' : ''}" data-action="wz-set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;

const wzIn = (k, attrs = '') => `<input class="input" data-wz="${k}" value="${esc(wz.d[k] ?? '')}" autocomplete="off" ${attrs}>`;

function wzStepHTML(step) {
  const d = wz.d;
  switch (step) {
    case 'name': return `
      <h2>¿Cómo se llama?</h2>
      <p class="wz-sub">El nombre completo, como sale en la matrícula.</p>
      ${wzIn('name', 'placeholder="Ej. Análisis y Diseño de Datos y Algoritmos" autocapitalize="sentences" enterkeyhint="next" data-autofocus')}
      ${field('Abreviatura (para el horario)', wzIn('short', `placeholder="${esc(d.name ? S.shortName({ name: d.name }) : 'Ej. ADDA')}" maxlength="8" enterkeyhint="next"`))}
      <div class="field"><span>Color</span><div class="swatches">${S.PALETTE.map((c) =>
        `<button type="button" class="swatch ${c === d.color ? 'on' : ''}" style="--c:${c}" data-action="wz-set" data-k="color" data-v="${c}" aria-label="Color"></button>`).join('')}</div></div>
      <button type="button" class="link center-link" data-action="wz-form">Prefiero el formulario completo</button>`;
    case 'basics': return `
      <h2>Lo básico</h2>
      <div class="field"><span>Créditos</span>${wzChips('credits', [[3, '3'], [4.5, '4,5'], [6, '6'], [9, '9'], [12, '12']], d.credits)}</div>
      <div class="field"><span>Curso</span>${wzChips('year', [1, 2, 3, 4, 5].map((y) => [y, `${y}.º`]), d.year)}</div>
      <div class="field"><span>¿Cuándo se da?</span>
        <div class="opt-list">
          ${optCard('term', 'C1', d.term, '1.er cuatrimestre', 'De septiembre a enero')}
          ${optCard('term', 'C2', d.term, '2.º cuatrimestre', 'De febrero a junio')}
          ${optCard('term', 'A', d.term, 'Anual', 'Todo el curso, como ADDA')}
        </div>
      </div>`;
    case 'annual': return `
      <h2>¿Cómo se evalúa durante el año?</h2>
      <p class="wz-sub">Así sé cómo calcular tu nota.</p>
      <div class="opt-list">
        ${optCard('split', 'false', String(d.split), 'Una evaluación para todo el curso', 'Teoría y prácticas con parciales en cada cuatri que hacen media al final (como ADDA)')}
        ${optCard('split', 'true', String(d.split), 'Una nota en cada cuatrimestre', 'Cada cuatri se aprueba por separado y la final sale de las dos')}
      </div>
      ${d.split ? `
        <div class="tp-grid flat mt">
          <span></span><b>1.er cuatri</b><b>2.º cuatri</b>
          <small>Peso %</small>${wzIn('p1w', 'inputmode="decimal"')}${wzIn('p2w', 'inputmode="decimal"')}
          <small>Mínimo</small>${wzIn('p1m', 'inputmode="decimal" placeholder="—"')}${wzIn('p2m', 'inputmode="decimal" placeholder="—"')}
        </div>` : ''}`;
    case 'groups': return `
      <h2>Grupos y aulas</h2>
      <p class="wz-sub">Tus grupos de teoría y de prácticas, y dónde son las clases. Puedes saltártelo.</p>
      <div class="tp-grid">
        <span></span><b class="teoria">Teoría</b><b class="practicas">Prácticas</b>
        <small>Grupo</small>${wzIn('groupT', 'placeholder="Ej. T1"')}${wzIn('groupP', 'placeholder="Ej. L3"')}
        <small>Aula</small>${wzIn('room', 'placeholder="Ej. A3.10"')}${wzIn('roomP', 'placeholder="Ej. L2.05"')}
      </div>`;
    case 'schedule': {
      const sorted = [...d.slots].sort((a, b) => a.day - b.day || S.minutes(a.start) - S.minutes(b.start));
      const h = d.slots.reduce((a, x) => a + (S.minutes(x.end) - S.minutes(x.start)) / 60, 0);
      return `
      <h2>¿Cuándo tienes clase?</h2>
      <p class="wz-sub">Añade cada clase de la semana. Puedes saltártelo y ponerlo luego.</p>
      <div class="card wz-slot">
        ${wzChips('slotType', [['Teoría', 'Teoría'], ['Prácticas', 'Prácticas'], ['Laboratorio', 'Laboratorio']], d.slotType)}
        <div class="day-pick">${[1, 2, 3, 4, 5].map((n) =>
          `<button type="button" class="${+d.slotDay === n ? 'on' : ''}" data-action="wz-set" data-k="slotDay" data-v="${n}">${S.DAYS_SHORT[n - 1]}</button>`).join('')}</div>
        <div class="two">
          ${field('Empieza', `<input class="input" type="time" data-wz="slotStart" value="${esc(d.slotStart)}">`)}
          ${field('Termina', `<input class="input" type="time" data-wz="slotEnd" value="${esc(d.slotEnd)}">`)}
        </div>
        <button type="button" class="btn block mt" data-action="wz-add-slot">${I.plusSm} Añadir ${S.DAYS[d.slotDay - 1].toLowerCase()} ${esc(d.slotStart)}</button>
      </div>
      ${sorted.length ? `
        <div class="card flush mt">${sorted.map((x) => `
          <div class="tl-row" style="--c:${d.color}">
            <span class="tl-time"><b>${S.DAYS[x.day - 1].slice(0, 3)}</b><small>${x.start}</small></span>
            <span class="tl-bar ${S.slotArea(x.type)}"></span>
            <span class="row-text"><strong>${esc(x.type)} · ${x.start}–${x.end}</strong></span>
            <button type="button" class="icon-btn ghost sm" data-action="wz-del-slot" data-i="${d.slots.indexOf(x)}" aria-label="Quitar">${I.xs}</button>
          </div>`).join('')}
        </div>
        <p class="hint">${fmt(h, 1)} h de clase a la semana</p>` : ''}`;
    }
    case 'eval': {
      const annualWhole = d.term === 'A' && !d.split;
      const presetIdx = S.PRESETS.findIndex((x) => x.annual);
      return `
      <h2>¿Cómo se evalúa?</h2>
      <p class="wz-sub">Mira la guía docente. Luego puedes ajustar cada apartado.</p>
      <div class="opt-list">
        ${annualWhole ? optCard('evalMode', presetIdx, d.evalMode, 'Como ADDA', 'Teoría 60 % y prácticas 40 % con parciales y controles en cada cuatri, y cuestionarios opcionales', I.wand) : ''}
        ${optCard('evalMode', 'tp', d.evalMode, 'Teoría + prácticas', 'Tú eliges el peso de cada una')}
        ${d.evalMode === 'tp' ? `
          <div class="card tp-slider">
            <div class="tp-labels"><span class="teoria">Teoría <b data-wt-t>${d.wt} %</b></span><span class="practicas">Prácticas <b data-wt-p>${100 - d.wt} %</b></span></div>
            <input type="range" min="0" max="100" step="5" data-wz="wt" value="${d.wt}" class="range" style="--v:${d.wt}%">
            <div class="two mt">
              ${field('Mínimo teoría', wzIn('mt', 'inputmode="decimal" placeholder="—"'))}
              ${field('Mínimo prácticas', wzIn('mp', 'inputmode="decimal" placeholder="—"'))}
            </div>
          </div>` : ''}
        ${S.PRESETS.map((x, i) => (x.annual || x.name === 'Teoría + prácticas' ? '' : optCard('evalMode', i, d.evalMode, x.name, x.desc || x.comps.map((c) => `${c.name} ${c.weight} %`).join(' · ')))).join('')}
        ${optCard('evalMode', 'later', d.evalMode, 'Lo configuro después', '')}
      </div>`;
    }
    case 'summary': {
      const ev = d.evalMode === 'tp' ? `Teoría ${d.wt} % + prácticas ${100 - d.wt} %` : d.evalMode === 'later' ? 'Sin configurar' : S.PRESETS[+d.evalMode].name;
      const rows = [
        ['Créditos y curso', `${fmt(d.credits, 1)} ECTS · ${d.year}.º`],
        ['Cuándo', S.TERMS[d.term] + (d.term === 'A' ? (d.split ? ' · nota por cuatri' : ' · todo el curso') : '')],
        ['Grupos', [d.groupT && `T: ${esc(d.groupT)}`, d.groupP && `P: ${esc(d.groupP)}`].filter(Boolean).join(' · ') || '—'],
        ['Clases', d.slots.length ? `${d.slots.length} a la semana` : '—'],
        ['Evaluación', ev],
      ];
      return `
      <div class="wz-hero" style="--c:${d.color}">
        <span class="wz-badge">${esc(d.short || S.shortName({ name: d.name }))}</span>
        <h2>${esc(d.name)}</h2>
      </div>
      <div class="card flush">${rows.map(([k, v]) => `<div class="sum-row"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <p class="hint center">Todo se puede cambiar después desde la asignatura.</p>`;
    }
    default: return '';
  }
}

function renderWizard(dir = 0) {
  const box = overlay.querySelector('.wizard');
  if (!box || !wz) return;
  const steps = wzSteps();
  wz.step = Math.min(wz.step, steps.length - 1);
  const step = steps[wz.step];
  const last = wz.step === steps.length - 1;
  const skippable = ['groups', 'schedule'].includes(step);
  box.innerHTML = `
    <div class="wz-top">
      <button class="icon-btn" data-action="${wz.step ? 'wz-back' : 'close'}" aria-label="${wz.step ? 'Atrás' : 'Cerrar'}">${wz.step ? I.back : I.x}</button>
      <div class="wz-progress"><i style="width:${((wz.step + 1) / steps.length) * 100}%"></i></div>
      <span class="wz-count">${wz.step + 1}/${steps.length}</span>
    </div>
    <form class="wz-body ${dir > 0 ? 'in-fwd' : dir < 0 ? 'in-back' : ''}" data-save="wz-next" novalidate>${wzStepHTML(step)}</form>
    <div class="wz-foot">
      <button class="btn primary block" data-action="wz-next">${last ? `${I.check} Crear asignatura` : 'Siguiente'}</button>
      ${skippable ? '<button class="btn text block" data-action="wz-skip">Saltar</button>' : ''}
    </div>`;
  const af = box.querySelector('[data-autofocus]');
  if (af && dir >= 0 && !af.value) setTimeout(() => af.focus(), 320);
}

function wzNext(skip = false) {
  const steps = wzSteps();
  const step = steps[wz.step];
  const d = wz.d;
  if (step === 'name' && !d.name.trim()) {
    haptic('heavy');
    overlay.querySelector('[data-wz="name"]')?.focus();
    toast('Ponle un nombre');
    return;
  }
  if (step === 'schedule' && skip) d.slots = [];
  if (wz.step === steps.length - 1) return wzCreate();
  haptic();
  wz.step++;
  renderWizard(1);
}

function wzCreate() {
  const d = wz.d;
  const roomFor = (type) => (S.slotArea(type) === 'practicas' ? d.roomP : d.room);
  const s = S.newSubject({
    name: d.name.trim(),
    short: d.short.trim(),
    color: d.color,
    credits: +d.credits || 6,
    year: +d.year || 1,
    term: d.term,
    groupT: d.groupT.trim(),
    groupP: d.groupP.trim(),
    room: d.room.trim(),
    roomP: d.roomP.trim(),
    split: d.term === 'A' && d.split,
    periods: {
      C1: { weight: parseNum(d.p1w) ?? 50, min: parseNum(d.p1m) },
      C2: { weight: parseNum(d.p2w) ?? 50, min: parseNum(d.p2m) },
    },
    slots: d.slots.map((x) => ({ id: S.uid(), ...x, room: roomFor(x.type) || '', group: '' })),
  });
  S.state.subjects.push(s);
  if (d.evalMode === 'tp') S.setupTheoryPractice(s, { wt: +d.wt, wp: 100 - d.wt, mt: parseNum(d.mt), mp: parseNum(d.mp) });
  else if (d.evalMode !== 'later') S.applyPreset(s, S.PRESETS[+d.evalMode]);
  S.save();
  wz = null;
  closeOverlay();
  subjTab[s.id] = 'eval';
  go(`#/asignatura/${s.id}`);
  haptic('success');
  confetti({ power: 1, colors: [s.color, '#ffffff', '#f7c948'] });
  toast(`${s.short || S.shortName(s)} creada`);
}

// --- Asignatura ya aprobada (para el expediente) ---

function openPastSheet() {
  sheetCtx = {};
  const prev = S.academicYear(new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1));
  openSheet('Asignatura aprobada', `
    ${field('Nombre', text('name', '', 'placeholder="Ej. Cálculo" autocapitalize="sentences"'))}
    <div class="three">
      ${field('Nota', text('grade', '', 'inputmode="decimal" placeholder="7,5"'))}
      ${field('Créditos', text('credits', '6', 'inputmode="decimal"'))}
      ${field('Curso', select('year', [1, 2, 3, 4, 5, 6].map((y) => [y, `${y}.º`]), 1))}
    </div>
    <div class="field"><span>Cuatrimestre</span>${segPick('term', [['C1', '1.º'], ['C2', '2.º'], ['A', 'Anual']], 'C1')}</div>
    ${field('Curso académico', text('academicYear', prev))}
    <label class="check"><input type="checkbox" name="honors"><span>Matrícula de Honor</span></label>
    <p class="hint">Si la suspendiste y la vuelves a cursar, añádela mejor como asignatura en curso.</p>`, 'save-past');
}

// --- Evaluable ---

function compOptions(subjectId) {
  const s = S.subject(subjectId);
  return [['', 'No cuenta para la nota'], ...(s?.comps || []).map((c) => [c.id, `${c.name} (${fmt(c.weight)} %)`])];
}

function openItemSheet(id, preset = {}) {
  const it = id ? S.item(id) : S.newItem(preset);
  if (!it.subjectId) {
    const r = route();
    it.subjectId = r.name === 'asignatura' ? r.id : (S.activeSubjects()[0]?.id || S.state.subjects[0]?.id || '');
  }
  if (!id && !it.compId) {
    it.compId = defaultComp(S.subject(it.subjectId), it.kind);
  }
  sheetCtx = { id };
  const subs = S.state.subjects.filter((s) => !s.final || s.id === it.subjectId).map((s) => [s.id, s.name]);
  if (!subs.length) {
    closeOverlay();
    toast('Primero añade una asignatura');
    return openSubjectSheet();
  }
  const kinds = Object.entries(S.KINDS).map(([k, v]) => [k, v.label]);
  openSheet(id ? 'Editar' : `Nuevo: ${S.KINDS[it.kind].label.toLowerCase()}`, `
    <div class="field"><span>Tipo</span>${segPick('kind', kinds, it.kind)}</div>
    ${field('Asignatura', select('subjectId', subs, it.subjectId))}
    ${field('Título', text('title', it.title, `placeholder="${placeholderFor(it.kind)}" autocapitalize="sentences"`))}
    <div class="two">
      <label class="field"><span>Fecha ${it.date ? '<button type="button" class="link" data-action="clear-date">Quitar</button>' : ''}</span><input class="input" type="date" name="date" value="${esc(it.date)}"></label>
      ${field(it.kind === 'examen' ? 'Hora' : 'Hora límite', `<input class="input" type="time" name="time" value="${esc(it.time)}">`)}
    </div>
    ${field('Lugar', text('place', it.place, 'placeholder="Aula, laboratorio, online…"'))}
    <div class="only-annual-item" ${annualNoSplit(it.subjectId) ? '' : 'hidden'}>
      <div class="field"><span>Cuatrimestre</span>${segPick('period', [['', 'Por la fecha'], ['C1', '1.er cuatri'], ['C2', '2.º cuatri']], it.period || '')}</div>
    </div>
    <div class="only-exam" ${it.kind === 'examen' ? '' : 'hidden'}>${field('Convocatoria', select('call', [['', '—'], ...S.CALLS.map((c) => [c, c])], it.call))}</div>

    <div class="sub-card">
      ${field('Cuenta en la nota como', `<span id="comp-sel">${select('compId', compOptions(it.subjectId), it.compId)}</span>`)}
      <div class="two">
        ${field('Nota', text('grade', it.grade == null ? '' : fmt(it.grade), 'inputmode="decimal" placeholder="—"'))}
        ${field('Nota mínima', text('min', it.min == null || it.min === '' ? '' : fmt(it.min), 'inputmode="decimal" placeholder="Sin mínimo"'))}
      </div>
      <div class="two">
        ${field('Sobre', text('max', fmt(it.max || 10), 'inputmode="decimal"'))}
        ${field('Peso', text('weight', fmt(it.weight || 1), 'inputmode="decimal"'))}
      </div>
      <p class="hint">"Nota mínima": lo que tienes que sacar en esta prueba para que haga media (por ejemplo, un 4 en cada parcial). "Peso": si dentro del mismo apartado unas pruebas cuentan más que otras (la práctica 3 vale el doble: peso 2).</p>
    </div>
    <label class="check only-pexam" ${it.kind === 'practica' ? '' : 'hidden'}><input type="checkbox" name="exam" ${(it.exam ?? S.looksLikeExam(it.title)) ? 'checked' : ''}><span>Es un examen o control de prácticas</span></label>
    <label class="check only-deliv" ${(it.kind === 'practica' && !it.exam) || it.kind === 'entrega' ? '' : 'hidden'}><input type="checkbox" name="done" ${it.done ? 'checked' : ''}><span>Entregada</span></label>
    <div class="only-exam-topics" ${S.isExamItem(it) ? '' : 'hidden'}><div id="exam-topics">${examTopicsField(it.subjectId, it)}</div></div>
    ${field('Notas', `<textarea class="input area" name="notes" placeholder="Material permitido, tipo de examen…">${esc(it.notes)}</textarea>`)}`,
  'save-item',
  id ? `
    <div class="two mt">
      ${it.date ? `<button class="btn" type="button" data-action="item-ics" data-id="${it.id}">${I.calAdd} Calendario</button>` : ''}
      <button class="btn text-danger" type="button" data-action="del-item" data-id="${it.id}">${I.trash} Eliminar</button>
    </div>` : '');
}

/** Vuelve a pintar los temas del examen con lo que hay en el formulario */
function refreshExamTopics(form) {
  const it = sheetCtx?.id ? S.item(sheetCtx.id) : null;
  const draft = {
    ...(it || {}),
    subjectId: form.elements.subjectId.value,
    kind: form.elements.kind.value,
    exam: form.elements.exam?.checked,
    compId: form.elements.compId?.value,
    topicIds: new FormData(form).getAll('topicIds'),
  };
  if (it && draft.subjectId !== it.subjectId) draft.topicIds = [];
  document.getElementById('exam-topics').innerHTML = examTopicsField(draft.subjectId, draft);
}

/** Casillas con los temas que entran en un examen */
function examTopicsField(subjectId, it) {
  const s = S.subject(subjectId);
  const topics = s?.topics || [];
  const area = it ? S.examArea({ ...it, subjectId }) : 'teoria';
  if (!topics.length) {
    return `<p class="hint">Cuando añadas el temario de la asignatura (Info → Temario) podrás marcar qué temas entran en este examen.</p>`;
  }
  const sel = new Set(it?.topicIds || []);
  const auto = it && it.date && !sel.size ? new Set(S.examTopics({ ...it, subjectId }).map((t) => t.id)) : null;
  const groups = (area === 'practicas' ? ['practicas', 'teoria'] : ['teoria', 'practicas'])
    .map((a) => [a, topics.filter((t) => S.topicArea(t) === a)])
    .filter(([, l]) => l.length);
  return `
    <div class="field"><span>Temas que entran ${sel.size ? `<b class="muted">${sel.size} de ${topics.length}</b>` : ''}</span>
      <div class="topic-checks">${groups.map(([a, list]) => `
        ${groups.length > 1 ? `<div class="tc-group">${a === 'teoria' ? 'Teoría' : 'Prácticas'}</div>` : ''}
        ${list.map((t) => `
        <label class="tcheck"><input type="checkbox" name="topicIds" value="${t.id}" ${sel.has(t.id) ? 'checked' : ''}><span>${esc(t.name)}</span>${auto?.has(t.id) ? '<em>auto</em>' : ''}</label>`).join('')}`).join('')}
      </div>
    </div>
    <p class="hint">Si no marcas ninguno, entran los de ${area === 'practicas' ? 'prácticas' : 'teoría'} que no estén en otros exámenes${auto ? ' (los marcados «auto»)' : ''}.${area === 'practicas' && !topics.some((t) => S.topicArea(t) === 'practicas') ? ' Añade el temario de prácticas en Info → Temario.' : ''}</p>`;
}

/** Anual evaluada en todo el curso: sus pruebas se reparten por cuatrimestre */
const annualNoSplit = (id) => {
  const s = S.subject(id);
  return !!s && s.term === 'A' && !s.split;
};

/** Apartado que mejor encaja con el tipo: el del mismo tipo o el del mismo bloque */
function defaultComp(s, kind) {
  if (!s) return '';
  const area = kind === 'examen' ? 'teoria' : kind === 'otro' ? 'otro' : 'practicas';
  return (s.comps.find((c) => c.kind === kind) || s.comps.find((c) => S.areaOf(c) === area))?.id || '';
}

/** Suma minutos a una hora HH:MM */
function addMin(hhmm, m) {
  const t = S.minutes(hhmm) + m;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

const placeholderFor = (k) => ({
  examen: 'Ej. Primer parcial', practica: 'Ej. Práctica 2 · Árboles', entrega: 'Ej. Memoria del proyecto', otro: 'Ej. Exposición en clase',
}[k]);

// --- Apartado de evaluación ---

function openCompSheet(subjectId, compId, period = 'C1') {
  const s = S.subject(subjectId);
  const split = S.isSplit(s);
  const c = compId ? s.comps.find((x) => x.id === compId) : { name: '', kind: 'examen', area: 'teoria', weight: '', min: null, period };
  const same = (x) => !split || S.periodOf(x) === S.periodOf(c);
  const used = s.comps.filter((x) => x.id !== compId && same(x) && !S.isOptional(x)).reduce((a, x) => a + (+x.weight || 0), 0);
  if (!compId) c.weight = Math.max(0, 100 - used);
  sheetCtx = { subjectId, compId };
  const kinds = Object.entries(S.KINDS).map(([k, v]) => [k, v.label]);
  openSheet(compId ? 'Editar apartado' : 'Nuevo apartado', `
    ${field('Nombre', text('name', c.name, 'placeholder="Ej. Examen de teoría, Prácticas…" autocapitalize="sentences"'))}
    ${split ? `<div class="field"><span>Cuatrimestre</span>${segPick('period', [['C1', '1.er cuatrimestre'], ['C2', '2.º cuatrimestre']], S.periodOf(c))}</div>` : ''}
    <div class="field"><span>Pertenece a</span>${segPick('area', S.AREA_ORDER.map((a) => [a, S.AREAS[a].label]), S.areaOf(c))}</div>
    <div class="field"><span>Se evalúa con</span>${segPick('kind', kinds, c.kind || 'examen')}</div>
    <div class="two">
      ${field(split ? 'Peso en el cuatri (%)' : 'Peso en la nota (%)', text('weight', c.weight === '' ? '' : fmt(c.weight), 'inputmode="decimal"'))}
      ${field('Nota mínima', text('min', c.min == null ? '' : fmt(c.min), 'inputmode="decimal" placeholder="Sin mínimo"'))}
    </div>
    <div class="sub-card adv">
      <div class="field"><span>Cómo se calcula su nota</span>${segPick('agg', [['media', 'Media'], ['best', 'Las mejores'], ['max', 'Solo la mejor']], c.agg || 'media')}</div>
      <div class="only-best" ${c.agg === 'best' ? '' : 'hidden'}>${field('Porcentaje de las mejores que cuentan', text('bestPct', fmt(c.bestPct || 80), 'inputmode="decimal"'))}
        <p class="hint">Ej.: 80 % de 5 cuestionarios = cuentan los 4 mejores.</p></div>
      ${s.term === 'A' && !split ? `
      <label class="check"><input type="checkbox" name="byPeriod" ${c.byPeriod ? 'checked' : ''}><span>Nota en cada cuatrimestre y luego media de los dos</span></label>
      ${field('Mínimo en cada cuatrimestre', text('periodMin', c.periodMin == null || c.periodMin === '' ? '' : fmt(c.periodMin), 'inputmode="decimal" placeholder="Sin mínimo"'))}` : ''}
      <label class="check"><input type="checkbox" name="points" ${c.points ? 'checked' : ''}><span>Nota mínima en puntos (ej. 1 sobre 3 en un apartado del 30 %)</span></label>
      <label class="check"><input type="checkbox" name="req" ${c.req ? 'checked' : ''}><span>Requisito: no cuenta en la nota, solo hay que llegar al mínimo</span></label>
      <label class="check"><input type="checkbox" name="optional" ${c.optional ? 'checked' : ''}><span>Opcional: solo cuenta si te sube la nota</span></label>
      <div class="only-opt" ${c.optional ? '' : 'hidden'}>
        ${field('Sustituye parte de', select('replaces', s.comps.filter((x) => x.id !== compId && !x.optional).map((x) => [x.id, x.name]), c.replaces))}
        <p class="hint">Ej.: cuestionarios con peso 20 que sustituyen parte de Teoría (60): la nota es la mejor entre 0,6·Teoría y 0,4·Teoría + 0,2·Cuestionarios.</p>
      </div>
    </div>
    <p class="hint">El resto de apartados${split ? ' de ese cuatrimestre' : ''} suman ${fmt(used)} %. Si la guía exige sacar al menos un 4 en este apartado para hacer media, pon 4 en nota mínima.</p>`,
  'save-comp',
  compId ? `<button class="btn text-danger block mt" type="button" data-action="del-comp" data-id="${subjectId}" data-c="${compId}">${I.trash} Eliminar apartado</button>` : '');
}

// --- Clase del horario ---

function openSlotSheet(subjectId, slotId, area = 'teoria') {
  const s = S.subject(subjectId);
  const same = s.slots.filter((y) => S.slotArea(y.type) === area);
  const last = same[same.length - 1];
  const x = slotId ? s.slots.find((y) => y.id === slotId)
    : {
      day: last ? Math.min(5, +last.day + 1) : 1,
      start: last?.start || '09:00',
      end: last?.end || (area === 'practicas' ? '11:00' : '10:30'),
      type: area === 'practicas' ? 'Prácticas' : 'Teoría',
      room: area === 'practicas' ? s.roomP || '' : s.room || '',
      group: '',
    };
  sheetCtx = { subjectId, slotId };
  openSheet(slotId ? 'Editar clase' : `Nueva clase de ${area === 'practicas' ? 'prácticas' : 'teoría'}`, `
    <div class="field"><span>Día</span>${segPick('day', [1, 2, 3, 4, 5, 6].map((d) => [d, S.DAYS_SHORT[d - 1]]), x.day)}</div>
    <div class="two">
      ${field('Empieza', `<input class="input" type="time" name="start" value="${esc(x.start)}">`)}
      ${field('Termina', `<input class="input" type="time" name="end" value="${esc(x.end)}">`)}
    </div>
    ${field('Tipo', select('type', S.SLOT_TYPES.map((t) => [t, t]), x.type))}
    <div class="two">
      ${field('Aula', text('room', x.room, 'placeholder="Ej. A3.10"'))}
      ${field('Grupo', text('group', x.group, `placeholder="${esc(S.groupOf(s, S.slotArea(x.type)) || 'El de la asignatura')}"`))}
    </div>`,
  'save-slot',
  slotId ? `<button class="btn text-danger block mt" type="button" data-action="del-slot" data-id="${subjectId}" data-x="${slotId}">${I.trash} Eliminar clase</button>` : '');
}

// --- Profesor ---

function openTeacherSheet(subjectId, tId) {
  const s = S.subject(subjectId);
  const t = tId ? s.teachers.find((x) => x.id === tId) : { name: '', email: '', office: '', hours: '' };
  sheetCtx = { subjectId, tId };
  openSheet(tId ? 'Editar profesor' : 'Nuevo profesor', `
    ${field('Nombre', text('name', t.name, 'autocapitalize="words"'))}
    ${field('Correo', text('email', t.email, 'type="email" inputmode="email" autocapitalize="off"'))}
    <div class="two">
      ${field('Despacho', text('office', t.office))}
      ${field('Tutorías', text('hours', t.hours, 'placeholder="Ej. Martes 11-13"'))}
    </div>`,
  'save-teacher',
  tId ? `<button class="btn text-danger block mt" type="button" data-action="del-teacher" data-id="${subjectId}" data-t="${tId}">${I.trash} Eliminar</button>` : '');
}

// --- Enlace ---

function openLinkSheet(subjectId) {
  sheetCtx = { subjectId };
  openSheet('Nuevo enlace', `
    ${field('Nombre', text('label', '', 'placeholder="Ej. Enseñanza Virtual"'))}
    ${field('Dirección', text('url', '', 'type="url" inputmode="url" autocapitalize="off" placeholder="https://…"'))}`, 'save-link');
}

// --- Nota final ---

function openFinalSheet(subjectId) {
  const s = S.subject(subjectId);
  const c = S.calc(s);
  const f = s.final || { grade: c.final ?? c.current ?? '', honors: false, call: 'Primera convocatoria' };
  sheetCtx = { subjectId };
  openSheet('Nota del acta', `
    ${field('Nota final', text('grade', f.grade === '' || f.grade == null ? '' : fmt(f.grade), 'inputmode="decimal" placeholder="Ej. 7,4"'))}
    ${c.current != null && !s.final ? `<p class="hint">Según tus notas te sale un ${fmt(c.final ?? c.current)}. Pon la nota oficial cuando salga el acta.</p>` : ''}
    ${field('Convocatoria', select('call', S.CALLS.filter((x) => x !== 'Parcial').map((x) => [x, x]), f.call))}
    <label class="check"><input type="checkbox" name="honors" ${f.honors ? 'checked' : ''}><span>Matrícula de Honor</span></label>`,
  'save-final',
  s.final ? `<button class="btn text-danger block mt" type="button" data-action="del-final" data-id="${subjectId}">Quitar nota final</button>` : '');
}

// ---------- Compartir / descargar archivos ----------

async function shareFile(name, content, type) {
  const file = new File([content], name, { type });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// =============================================================
//  INTERACCIÓN: gestos, menús, teclado de notas y deshacer
// =============================================================

// --- Deshacer ---

let lastUndo = null;
let snackTimer;
function undoable(msg, undo) {
  lastUndo = undo;
  snackEl.innerHTML = `<span>${esc(msg)}</span><button data-action="undo">Deshacer</button>`;
  snackEl.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => { snackEl.classList.remove('show'); lastUndo = null; }, 5000);
}

function removeItem(id) {
  const i = S.state.items.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [it] = S.state.items.splice(i, 1);
  S.save();
  haptic();
  render();
  undoable(`"${it.title}" eliminado`, () => {
    S.state.items.splice(i, 0, it);
    S.save();
  });
}

/** "Práctica 2" → "Práctica 3" al duplicar */
const nextTitle = (t = '') => (/\d+(?!.*\d)/.test(t) ? t.replace(/(\d+)(?!.*\d)/, (n) => +n + 1) : `${t} (copia)`);

function toggleDone(id, fromEl) {
  const it = S.item(id);
  if (!it) return;
  it.done = !it.done;
  S.save();
  const r = fromEl?.getBoundingClientRect();
  haptic(it.done ? 'success' : 'light');
  render();
  if (it.done && r) confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, power: 0.35 });
  undoable(it.done ? `"${it.title}" entregada` : 'Marcada como pendiente', () => {
    it.done = !it.done;
    S.save();
  });
}

// --- Gestos ---

onGestures({
  swipe: (row, act) => {
    const id = row.dataset.id;
    if (act === 'done') toggleDone(id, row);
    else if (act === 'grade') openGradePad(id);
    else if (act === 'delete') removeItem(id);
    else if (act === 'del-session') removeSession(id);
    else if (act === 'block-done') toggleBlock(id, row);
    else if (act === 'del-block') removeBlockUndo(id);
  },
  long: (el) => {
    if (el.dataset.long === 'item') itemMenu(el.dataset.id);
    else if (el.dataset.long === 'subject') subjectMenu(el.dataset.id);
  },
  nav: (el, dir) => {
    if (el.dataset.swipeNav === 'plan') {
      planDate = S.ymd(new Date(S.toDate(planDate).getTime() + dir * 864e5));
      renderTab();
      return;
    }
    if (el.dataset.swipeNav === 'week') {
      weekOffset += dir;
    } else {
      monthOffset += dir;
      const t = new Date();
      selDay = monthOffset === 0 ? S.ymd() : S.ymd(new Date(t.getFullYear(), t.getMonth() + monthOffset, 1));
    }
    renderTab();
  },
});

// --- Menús al mantener pulsado ---

function menu(title, sub, options, extra = '') {
  openOverlay(`
    <div class="sheet auto menu" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      ${sheetHead(esc(title))}
      <div class="sheet-body">
        ${sub ? `<p class="menu-sub">${sub}</p>` : ''}
        ${extra}
        <div class="menu-list">${options.filter(Boolean).map((o) => `
          <button class="menu-item ${o.danger ? 'danger' : ''}" data-action="${o.action}" ${o.data || ''}>
            <span class="menu-ic">${o.icon || ''}</span><span>${o.label}</span>
          </button>`).join('')}
        </div>
      </div>
    </div>`, 'bottom');
}

function itemMenu(id) {
  const it = S.item(id);
  if (!it) return;
  const s = S.subject(it.subjectId);
  const deliv = it.kind === 'practica' || it.kind === 'entrega';
  menu(it.title || S.KINDS[it.kind].label,
    `${s ? esc(s.name) : ''}${it.date ? ' · ' + shortDate(it.date) + (it.time ? ' · ' + it.time : '') : ''}`, [
      { icon: I.edit, label: it.grade == null ? 'Poner nota' : `Cambiar nota (${fmt(it.grade)})`, action: 'grade-pad', data: `data-id="${id}"` },
      deliv && { icon: it.done ? I.undo : I.check, label: it.done ? 'Marcar como pendiente' : 'Marcar como entregada', action: 'toggle-done', data: `data-id="${id}"` },
      s && !s.final && { icon: I.timer, label: `Estudiar ${esc(S.shortName(s))} ahora`, action: 'study-now', data: `data-s="${s.id}"` },
      { icon: I.list, label: 'Editar', action: 'edit-item', data: `data-id="${id}"` },
      { icon: I.copy, label: 'Duplicar', action: 'dup-item', data: `data-id="${id}"` },
      it.date && { icon: I.calAdd, label: 'Añadir al calendario', action: 'item-ics', data: `data-id="${id}"` },
      { icon: I.trash, label: 'Eliminar', action: 'del-item', data: `data-id="${id}"`, danger: true },
    ]);
}

function subjectMenu(id) {
  const s = S.subject(id);
  if (!s) return;
  const c = S.calc(s);
  menu(s.name, `${fmt(s.credits, 1)} ECTS · ${S.TERMS[s.term]}${c.current != null ? ` · llevas un ${fmt(c.current)}` : ''}`, [
    !s.final && { icon: I.timer, label: 'Estudiar ahora', action: 'study-now', data: `data-s="${s.id}"` },
    !s.final && { icon: I.examen, label: 'Añadir examen', action: 'new-item', data: `data-s="${s.id}" data-k="examen"` },
    !s.final && { icon: I.practica, label: 'Añadir práctica', action: 'new-item', data: `data-s="${s.id}" data-k="practica"` },
    !s.final && { icon: I.entrega, label: 'Añadir entrega', action: 'new-item', data: `data-s="${s.id}" data-k="entrega"` },
    { icon: I.edit, label: 'Editar asignatura', action: 'edit-subject', data: `data-id="${s.id}"` },
  ], `<div class="swatches menu-colors">${S.PALETTE.map((col) =>
    `<button type="button" class="swatch ${col === s.color ? 'on' : ''}" style="--c:${col}" data-action="set-color" data-id="${s.id}" data-c="${col}" aria-label="Color"></button>`).join('')}</div>`);
}

// --- Teclado para poner notas ---

let pad = null;

function openGradePad(id) {
  const it = S.item(id);
  if (!it) return;
  const s = S.subject(it.subjectId);
  pad = { id, value: it.grade == null ? '' : fmt(it.grade) };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];
  const max = +it.max || 10;
  openOverlay(`
    <div class="sheet auto pad-sheet" role="dialog" aria-modal="true" aria-label="Poner nota">
      ${sheetHead(esc(it.title || 'Nota'))}
      <div class="sheet-body">
        <p class="menu-sub">${s ? `<b class="sdot" style="--c:${subjColor(s)}"></b>${esc(s.name)} · ` : ''}sobre ${fmt(max)}${it.min != null && it.min !== '' ? ` · mínimo ${fmt(it.min)}` : ''}</p>
        <div class="pad-display" id="pad-display"></div>
        <p class="pad-impact" id="pad-impact"></p>
        <div class="pad-quick">${[5, 6, 7, 8, 9, 10].map((n) => {
          const v = (n / 10) * max;
          return `<button class="chip" data-action="pad-key" data-k="=${v}">${fmt(v)}</button>`;
        }).join('')}</div>
        <div class="keypad">${keys.map((k) =>
          `<button class="key ${k === 'del' ? 'fn' : ''}" data-action="pad-key" data-k="${k}">${k === 'del' ? I.undo : k}</button>`).join('')}</div>
        <div class="two mt">
          <button class="btn" data-action="pad-clear">Quitar nota</button>
          <button class="btn primary" data-action="pad-save">Guardar</button>
        </div>
      </div>
    </div>`, 'bottom');
  updatePad();
}

function padKey(k) {
  if (!pad) return;
  const it = S.item(pad.id);
  const max = +it.max || 10;
  let v = pad.value;
  if (k.startsWith('=')) v = fmt(+k.slice(1));
  else if (k === 'del') v = v.slice(0, -1);
  else if (k === ',') { if (!v.includes(',')) v = (v || '0') + ','; } else {
    const next = v === '0' ? k : v + k;
    const dec = next.split(',')[1];
    if (dec && dec.length > 2) return;
    if (parseNum(next) > max) { haptic('heavy'); shake(); return; }
    v = next;
  }
  pad.value = v;
  haptic();
  updatePad();
}

function shake() {
  const d = document.getElementById('pad-display');
  d?.classList.remove('shake');
  void d?.offsetWidth;
  d?.classList.add('shake');
}

function updatePad() {
  const it = S.item(pad.id);
  const s = S.subject(it.subjectId);
  const n = parseNum(pad.value);
  const min = it.min === '' || it.min == null ? null : +it.min;
  const d = document.getElementById('pad-display');
  const tone = n == null ? 'none' : S.gradeTone((n / (+it.max || 10)) * 10);
  d.className = `pad-display t-${tone} ${min != null && n != null && n < min ? 'low' : ''}`;
  d.innerHTML = pad.value ? esc(pad.value) : '<span>—</span>';
  // Cómo quedaría la asignatura con esta nota
  const imp = document.getElementById('pad-impact');
  if (!s || n == null) { imp.textContent = 'Escribe la nota o elige una rápida.'; return; }
  const c = S.calc(s, { [it.id]: n });
  const parts = [];
  if (min != null && n < min) parts.push(`<b class="text-bad">Por debajo del mínimo (${fmt(min)})</b>`);
  if (c.current != null) parts.push(`Tu nota quedaría en <b class="t-${S.gradeTone(c.current)}">${fmt(c.current)}</b>`);
  if (c.need != null && c.need > 0 && c.status !== 'start') parts.push(`necesitarías un ${fmt(c.need)} en lo que queda`);
  if (c.status === 'secured') parts.push('<b class="text-good">aprobado asegurado</b>');
  imp.innerHTML = parts.join(' · ');
}

function padSave() {
  const it = S.item(pad.id);
  const n = parseNum(pad.value);
  it.grade = n;
  if (n != null && it.kind !== 'examen') it.done = true;
  S.save();
  const max = +it.max || 10;
  closeOverlay();
  render();
  if (n == null) { toast('Nota quitada'); return; }
  const g10 = (n / max) * 10;
  const min = it.min === '' || it.min == null ? null : +it.min;
  if (min != null && n < min) { haptic('heavy'); toast(`${fmt(n)}: no llegas al mínimo`); return; }
  haptic('success');
  toast(`Nota guardada: ${fmt(n)}`);
  if (g10 >= 9) confetti({ power: 0.9 });
}

// =============================================================
//  ACCIONES
// =============================================================

const subjectOf = (el) => S.subject(el.dataset.id);

const actions = {
  nav: (el) => go(el.dataset.to),
  close: () => closeOverlay(),

  'quick-add': () => openQuickAdd(),
  'go-week': () => { agendaView = 'week'; weekOffset = 0; },

  pick: (el) => {
    const box = el.closest('[data-pick]');
    const form = el.closest('form');
    const name = box.dataset.pick;
    form.elements[name].value = el.dataset.value;
    box.querySelectorAll('[data-value]').forEach((b) => b.classList.toggle('on', b === el));
    if (name === 'agg' && form.dataset.save === 'save-comp') {
      form.querySelector('.only-best').hidden = el.dataset.value !== 'best';
    }
    if (name === 'term' && form.dataset.save === 'save-subject') {
      form.querySelector('.only-annual').hidden = el.dataset.value !== 'A';
    }
    if (name === 'kind' && form.dataset.save === 'save-item') {
      const k = el.dataset.value;
      form.querySelector('.only-exam').hidden = k !== 'examen';
      const pex = k === 'practica' && form.elements.exam.checked;
      form.querySelector('.only-pexam').hidden = k !== 'practica';
      form.querySelector('.only-exam-topics').hidden = !(k === 'examen' || pex);
      form.querySelector('.only-deliv').hidden = !((k === 'practica' && !pex) || k === 'entrega');
      refreshExamTopics(form);
      form.elements.title.placeholder = placeholderFor(k);
      // Ajusta el apartado al tipo si no se ha tocado
      const match = defaultComp(S.subject(form.elements.subjectId.value), k);
      if (match && !sheetCtx?.id) form.elements.compId.value = match;
    }
  },
  'clear-date': (el) => {
    const f = el.closest('form');
    f.elements.date.value = '';
    f.elements.time.value = '';
    el.remove();
  },

  // --- Asignaturas ---
  'subj-filter': (el) => { subjFilter = el.dataset.v; haptic(); render(); },
  'subj-tab': (el) => { subjTab[el.dataset.id] = el.dataset.v; simOn = false; haptic(); renderTab(); },
  'new-subject': (el) => openWizard(el?.dataset?.term),
  'wz-next': () => wzNext(),
  'wz-skip': () => wzNext(true),
  'wz-back': () => { haptic(); wz.step = Math.max(0, wz.step - 1); renderWizard(-1); },
  'wz-form': () => {
    const term = wz?.d.term;
    closeOverlay();
    openSubjectSheet(null, term);
  },
  'wz-set': (el) => {
    const { k, v } = el.dataset;
    const d = wz.d;
    if (k === 'split') d.split = v === 'true';
    else if (['credits', 'year', 'slotDay'].includes(k)) d[k] = +v;
    else d[k] = v;
    // Al pasar a anual de todo el curso, propone la evaluación tipo ADDA
    if ((k === 'split' || k === 'term') && d.term === 'A' && !d.split) d.evalMode = String(S.PRESETS.findIndex((x) => x.annual));
    if ((k === 'split' || k === 'term') && (d.term !== 'A' || d.split) && S.PRESETS[+d.evalMode]?.annual) d.evalMode = 'tp';
    if (k === 'slotType') {
      d.slotEnd = v === 'Teoría' ? addMin(d.slotStart, 90) : addMin(d.slotStart, 120);
    }
    haptic();
    renderWizard();
  },
  'wz-add-slot': () => {
    const d = wz.d;
    if (!d.slotStart || !d.slotEnd || S.minutes(d.slotEnd) <= S.minutes(d.slotStart)) { haptic('heavy'); return toast('Revisa las horas'); }
    d.slots.push({ day: d.slotDay, start: d.slotStart, end: d.slotEnd, type: d.slotType });
    d.slotDay = Math.min(5, d.slotDay + 1);
    haptic('success');
    renderWizard();
  },
  'wz-del-slot': (el) => { wz.d.slots.splice(+el.dataset.i, 1); haptic(); renderWizard(); },
  'edit-subject': (el) => openSubjectSheet(el.dataset.id),
  'save-subject': () => {
    const d = formData();
    if (!d.name.trim()) return toast('Ponle un nombre');
    const isNew = !sheetCtx.id;
    const s = isNew ? S.newSubject() : S.subject(sheetCtx.id);
    Object.assign(s, {
      name: d.name.trim(),
      short: d.short.trim(),
      code: d.code.trim(),
      credits: parseNum(d.credits) ?? 6,
      year: +d.year,
      term: d.term,
      academicYear: d.academicYear.trim(),
      group: '',
      groupT: d.groupT.trim(),
      groupP: d.groupP.trim(),
      room: d.room.trim(),
      roomP: d.roomP.trim(),
      color: d.color,
      split: d.term === 'A' && !!d.split,
      periods: {
        C1: { weight: parseNum(d.p1w) ?? 50, min: parseNum(d.p1m) },
        C2: { weight: parseNum(d.p2w) ?? 50, min: parseNum(d.p2m) },
      },
    });
    if (isNew) {
      const wt = parseNum(d.wt) ?? 0;
      const wp = parseNum(d.wp) ?? 0;
      if (wt + wp > 0) S.setupTheoryPractice(s, { wt, wp, mt: parseNum(d.mt), mp: parseNum(d.mp) });
      S.state.subjects.push(s);
    }
    S.save();
    closeOverlay();
    if (isNew) {
      subjTab[s.id] = 'eval';
      toast('Asignatura creada');
      go(`#/asignatura/${s.id}`);
    } else {
      toast('Guardado');
      render();
    }
  },
  'del-subject': async (el) => {
    const s = subjectOf(el);
    if (!(await ask(`¿Eliminar ${s.name} con todas sus notas y fechas?`, { ok: 'Eliminar', danger: true }))) return;
    S.deleteSubject(s.id);
    toast('Asignatura eliminada');
    go('#/asignaturas');
  },
  'add-past': () => openPastSheet(),
  'save-past': () => {
    const d = formData();
    const g = parseNum(d.grade);
    if (!d.name.trim()) return toast('Ponle un nombre');
    if (g == null || g < 0 || g > 10) return toast('La nota tiene que estar entre 0 y 10');
    S.state.subjects.push(S.newSubject({
      name: d.name.trim(),
      credits: parseNum(d.credits) ?? 6,
      year: +d.year,
      term: d.term,
      academicYear: d.academicYear.trim(),
      final: { grade: g, honors: !!d.honors, call: 'Primera convocatoria' },
    }));
    S.save();
    closeOverlay();
    toast('Añadida al expediente');
    render();
  },

  // --- Evaluación ---
  presets: (el) => {
    const s = subjectOf(el);
    openOverlay(`
      <div class="sheet auto" role="dialog" aria-modal="true" aria-label="Plantillas">
        ${sheetHead('Plantillas de evaluación')}
        <div class="sheet-body">
          <p class="muted small">Se sustituyen los apartados actuales. Las notas que ya tengas se quedan, pero sin apartado: tendrás que asignarlas al nuevo.</p>
          <div class="presets">${S.PRESETS.map((p, i) => `
            <button class="preset" data-action="apply-preset" data-id="${s.id}" data-i="${i}" data-confirm="1">
              <strong>${p.name}</strong>
              <small>${p.desc || p.comps.map((x) => `${x.name} ${x.weight} %`).join(' · ')}</small>
            </button>`).join('')}
          </div>
        </div>
      </div>`, 'bottom');
  },
  'apply-preset': async (el) => {
    const s = subjectOf(el);
    if (el.dataset.confirm) {
      const i = +el.dataset.i;
      closeOverlay();
      if (!(await ask(`¿Cambiar la evaluación de ${s.name} a "${S.PRESETS[i].name}"?`, { ok: 'Cambiar' }))) return;
    }
    S.applyPreset(s, S.PRESETS[+el.dataset.i]);
    S.save();
    toast('Ajusta los porcentajes si tu guía es distinta');
    render();
  },
  'new-comp': (el) => openCompSheet(el.dataset.id, null, el.dataset.p || 'C1'),
  'edit-comp': (el) => openCompSheet(el.dataset.id, el.dataset.c),
  'save-comp': () => {
    const d = formData();
    const s = S.subject(sheetCtx.subjectId);
    if (!d.name.trim()) return toast('Ponle un nombre');
    const w = parseNum(d.weight);
    if (!d.req && (w == null || w < 0 || w > 100)) return toast('El peso va de 0 a 100');
    const min = parseNum(d.min);
    if (d.req && min == null) return toast('Pon la nota mínima del requisito');
    const data = {
      points: !!d.points,
      req: !!d.req,
      agg: d.agg,
      bestPct: parseNum(d.bestPct) || 80,
      byPeriod: !!d.byPeriod,
      periodMin: parseNum(d.periodMin),
      optional: !!d.optional && !!d.replaces,
      replaces: d.optional ? d.replaces : '',
      name: d.name.trim(), kind: d.kind, area: d.area, period: d.period || '', weight: w, min: min == null ? null : Math.min(d.points ? (w || 0) / 10 : 10, Math.max(0, min)) };
    if (data.req) { data.weight = 0; data.optional = false; data.replaces = ''; }
    if (sheetCtx.compId) Object.assign(s.comps.find((c) => c.id === sheetCtx.compId), data);
    else s.comps.push({ id: S.uid(), ...data });
    S.save();
    closeOverlay();
    render();
  },
  'del-comp': async (el) => {
    const s = subjectOf(el);
    const c = s.comps.find((x) => x.id === el.dataset.c);
    if (!(await ask(`¿Eliminar el apartado "${c.name}"? Sus evaluables se quedan, pero dejan de contar para la nota.`, { ok: 'Eliminar', danger: true }))) return;
    s.comps = s.comps.filter((x) => x.id !== c.id);
    S.state.items.forEach((i) => { if (i.compId === c.id) i.compId = ''; });
    S.save();
    render();
  },
  final: (el) => openFinalSheet(el.dataset.id),
  'save-final': () => {
    const d = formData();
    const g = parseNum(d.grade);
    if (g == null || g < 0 || g > 10) return toast('La nota tiene que estar entre 0 y 10');
    const s = S.subject(sheetCtx.subjectId);
    s.final = { grade: g, honors: !!d.honors, call: d.call };
    S.save();
    closeOverlay();
    const passed = g >= (+S.state.settings.passMark || 5);
    toast(passed ? '¡Enhorabuena! Añadida al expediente' : 'Nota guardada');
    render();
    if (passed) {
      haptic('success');
      confetti({ power: g >= 9 ? 1.6 : 1 });
    }
  },
  'del-final': async (el) => {
    const s = subjectOf(el);
    s.final = null;
    S.save();
    closeOverlay();
    render();
  },

  // --- Evaluables ---
  'new-item': (el) => {
    const preset = { kind: el.dataset.k || 'examen' };
    if (el.dataset.s) preset.subjectId = el.dataset.s;
    if (el.dataset.c) preset.compId = el.dataset.c;
    if (el.dataset.d) preset.date = el.dataset.d;
    if (el.dataset.p) preset.period = el.dataset.p;
    if (!S.state.subjects.some((s) => !s.final)) {
      closeOverlay();
      toast('Primero añade una asignatura');
      return openSubjectSheet();
    }
    openItemSheet(null, preset);
  },
  'edit-item': (el) => openItemSheet(el.dataset.id),
  'save-item': () => {
    const d = formData();
    const isNew = !sheetCtx.id;
    const it = isNew ? S.newItem() : S.item(sheetCtx.id);
    const g = parseNum(d.grade);
    const max = parseNum(d.max) || 10;
    if (g != null && (g < 0 || g > max)) return toast(`La nota tiene que estar entre 0 y ${fmt(max)}`);
    if (!d.subjectId) return toast('Elige una asignatura');
    Object.assign(it, {
      kind: d.kind,
      subjectId: d.subjectId,
      title: d.title.trim() || S.KINDS[d.kind].label,
      date: d.date,
      time: d.time,
      place: d.place.trim(),
      call: d.kind === 'examen' ? d.call : '',
      compId: d.compId,
      grade: g,
      max,
      min: parseNum(d.min),
      period: d.period || '',
      weight: parseNum(d.weight) || 1,
      done: !!d.done || (g != null && d.kind !== 'examen'),
      notes: d.notes.trim(),
      exam: d.kind === 'practica' && !!d.exam,
      topicIds: d.kind === 'examen' || (d.kind === 'practica' && d.exam) ? new FormData(overlay.querySelector('form')).getAll('topicIds') : [],
    });
    if (isNew) S.state.items.push(it);
    S.save();
    closeOverlay();
    toast(isNew ? 'Añadido' : 'Guardado');
    render();
  },
  'del-item': (el) => {
    closeOverlay();
    removeItem(el.dataset.id);
  },
  'dup-item': (el) => {
    const it = S.item(el.dataset.id);
    const copy = { ...it, id: S.uid(), grade: null, done: false, title: nextTitle(it.title) };
    S.state.items.splice(S.state.items.indexOf(it) + 1, 0, copy);
    S.save();
    haptic();
    openItemSheet(copy.id);
  },
  'grade-pad': (el) => openGradePad(el.dataset.id),
  'eval-period': (el) => { evalPeriod[el.dataset.id] = el.dataset.v; renderTab(); },

  // --- Estudio ---
  'study-subj': (el) => { studySubj = el.dataset.v; studyTopic = ''; render(); },
  'study-topic': (el) => { studyTopic = studyTopic === el.dataset.v ? '' : el.dataset.v; render(); },
  'study-dur': (el) => { S.state.study.focus = +el.dataset.v; S.save(); render(); },
  'study-go': (el) => {
    St.unlockAudio();
    const x = S.state.study;
    if (overlay.querySelector('.done-sheet')) closeOverlay();
    const mode = el.dataset.mode || 'focus';
    if (el.dataset.s !== undefined) { studySubj = el.dataset.s; studyTopic = el.dataset.t || ''; }
    if (mode === 'focus') x.next = 'focus';
    if (x.timer) { toast('Ya tienes un bloque en marcha'); if (route().name !== 'estudio') go('#/estudio'); return; }
    St.start({ mode, subjectId: mode === 'focus' ? studySubj : '', topicId: mode === 'focus' ? studyTopic : '' });
    haptic('heavy');
    if (route().name !== 'estudio') go('#/estudio'); else render();
  },
  'study-again': () => {
    St.unlockAudio();
    closeOverlay();
    S.state.study.next = 'focus';
    St.start({ mode: 'focus', subjectId: studySubj, topicId: studyTopic });
    haptic('heavy');
    render();
  },
  'study-now': (el) => {
    St.unlockAudio();
    if (St.timer()) { go('#/estudio'); toast('Ya tienes un bloque en marcha'); return; }
    studySubj = el.dataset.s;
    studyTopic = '';
    S.state.study.next = 'focus';
    St.start({ mode: 'focus', subjectId: studySubj });
    haptic('heavy');
    go('#/estudio');
  },
  'study-pause': () => { St.pause(); haptic(); render(); },
  'study-resume': () => { St.unlockAudio(); St.resume(); haptic(); render(); },
  'study-plus': () => {
    const t = St.timer();
    if (!t) return;
    t.duration += 300;
    S.save();
    haptic();
    render();
  },
  'study-skip': () => { St.skipBreak(); haptic(); render(); },
  'study-stop': async () => {
    const t = St.timer();
    if (!t) return;
    if (t.mode === 'break') { St.skipBreak(); render(); return; }
    const m = St.elapsedMinutes();
    if (m < 1) { St.cancel(); render(); return; }
    if (await ask(`¿Guardar los ${m} min que llevas?`, { ok: 'Guardar', cancel: 'Descartar' })) {
      St.finish({ minutes: m });
      haptic('success');
      toast(`+${m} min guardados`);
    } else {
      St.cancel();
    }
    render();
  },
  'topic-conf': (el) => {
    const t = St.topicOf(el.dataset.id, el.dataset.t);
    if (!t) return;
    St.setConf(t, (St.confOf(t) + 1) % 4);
    S.save();
    haptic(St.confOf(t) === 3 ? 'success' : 'light');
    if (St.confOf(t) === 3) burstFrom(el, 0.3);
    render();
  },
  'set-conf': (el) => {
    const t = St.topicOf(el.dataset.id, el.dataset.t);
    if (!t) return;
    St.setConf(t, +el.dataset.c);
    S.save();
    haptic();
    el.parentElement.querySelectorAll('.conf-opt').forEach((b) => b.classList.toggle('on', b === el));
  },
  'go-topics': (el) => {
    subjTab[el.dataset.id] = 'info';
    go(`#/asignatura/${el.dataset.id}`);
  },
  // --- Planning ---
  'plan-open': () => { planDate = S.ymd(); },
  'plan-day': (el) => {
    const v = +el.dataset.v;
    planDate = v === 0 ? S.ymd() : S.ymd(new Date(S.toDate(planDate).getTime() + v * 864e5 + 3600e3));
    haptic();
    renderTab();
  },
  'plan-auto': (el) => runAutoPlan(el.dataset.today ? S.ymd() : planDate),
  'plan-ai': (el) => {
    const date = el.dataset.today ? S.ymd() : planDate;
    const q = date === S.ymd() ? 'Organízame el día de hoy' : `Organízame el ${longDate(date).toLowerCase()} (${date})`;
    openTutor(q);
  },
  'new-block': (el) => openBlockSheet(null, { start: el.dataset.start || '', end: el.dataset.end || '' }),
  'edit-block': (el) => openBlockSheet(el.dataset.id),
  'save-block': () => {
    const d = formData();
    const { id, date } = sheetCtx;
    if ((d.start && !d.end) || (!d.start && d.end)) return toast('Pon las dos horas o ninguna');
    if (d.start && M(d.end) <= M(d.start)) return toast('La hora de fin tiene que ser después');
    const s = S.subject(d.subjectId);
    const tp = St.topicOf(d.subjectId, d.topicId);
    const title = d.title.trim() || (tp ? `${S.shortName(s)}: ${tp.name}` : s ? `${Pl.KINDS[d.kind].label} ${S.shortName(s)}` : Pl.KINDS[d.kind].label);
    const data = { kind: d.kind, title, subjectId: d.subjectId, topicId: d.topicId, start: d.start, end: d.end, done: !!d.done };
    if (id) Object.assign(Pl.block(date, id), data, { auto: false });
    else Pl.addBlock(date, data);
    S.save();
    closeOverlay();
    haptic('success');
    render();
  },
  'del-block': (el) => { closeOverlay(); removeBlockUndo(el.dataset.id); },
  'block-toggle': (el) => toggleBlock(el.dataset.id, el),
  'block-study': (el) => {
    const b = Pl.block(blockDate(el.dataset.id), el.dataset.id);
    if (!b) return;
    St.unlockAudio();
    if (St.timer()) { toast('Ya tienes un bloque en marcha'); go('#/estudio'); return; }
    studySubj = b.subjectId;
    studyTopic = b.topicId || '';
    S.state.study.next = 'focus';
    St.start({ mode: 'focus', subjectId: studySubj, topicId: studyTopic });
    haptic('heavy');
    go('#/estudio');
  },
  'add-task': (form) => {
    const title = form.elements.task.value.trim();
    if (!title) return;
    Pl.addBlock(planDate, { title, kind: 'task' });
    haptic();
    render();
    app.querySelector('[data-save="add-task"] input')?.focus();
  },

  // --- Plan de estudio ---
  'paste-topics': (el) => openPasteTopics(el.dataset.id, el.dataset.area || 'teoria'),
  'save-topics': () => {
    const d = formData();
    const names = SP.parseSyllabus(d.text);
    if (!names.length) return toast('Pega al menos un tema');
    const s = S.subject(sheetCtx.id);
    const n = SP.addTopics(s, names, parseNum(d.hours) || 3, !!d.replace, d.area);
    closeOverlay();
    haptic('success');
    toast(n ? `${n} ${n === 1 ? 'tema añadido' : 'temas añadidos'}` : 'Esos temas ya estaban');
    render();
  },
  'edit-topic': (el) => openTopicSheet(el.dataset.id, el.dataset.t),
  'save-topic': () => {
    const d = formData();
    const t = St.topicOf(sheetCtx.subjectId, sheetCtx.topicId);
    if (!d.name.trim()) return toast('Ponle un nombre');
    t.name = d.name.trim();
    t.hours = Math.min(100, Math.max(0.25, parseNum(d.hours) || 3));
    t.area = d.area === 'practicas' ? 'practicas' : 'teoria';
    St.setConf(t, +d.conf);
    S.save();
    closeOverlay();
    render();
  },
  'sp-set': (el) => {
    const cfg = SP.settings();
    cfg[el.dataset.k] = el.dataset.k === 'horizon' ? el.dataset.v : +el.dataset.v;
    S.save();
    haptic();
    render();
  },
  'sp-generate': () => {
    const res = SP.generate();
    const n = res.added.length;
    haptic(n ? 'success' : 'heavy');
    render();
    if (!n) { toast('No he podido meter nada: revisa temarios, exámenes y horas'); return; }
    const short = res.summary.filter((x) => x.left > 0).length;
    if (!short) confetti({ power: 0.8 });
    undoable(`${n} bloques de estudio hasta el ${dayMonth(res.to)}`, () => SP.undoGenerate(res));
    setTimeout(() => app.querySelector('.sp-cal')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  },
  'sp-day': (el) => { planDate = el.dataset.v; go('#/plan'); },
  'sp-ai': () => openTutor('Revisa mi plan de estudio hasta los exámenes: ¿llego bien a todos? ¿Qué cambiarías?'),

  // --- Tutor IA ---
  'go-tutor': () => openTutor(),
  'ai-send': (form) => {
    const q = form.elements.q.value;
    form.elements.q.value = '';
    sendTutor(q);
  },
  'ai-suggest': (el) => sendTutor(el.dataset.q),
  'ai-retry': () => {
    const last = S.state.chat[S.state.chat.length - 1];
    if (last?.role === 'user') sendTutor('__retry__');
  },
  'ai-clear': async () => {
    if (!(await ask('¿Borrar la conversación con el tutor?', { ok: 'Borrar', danger: true }))) return;
    S.state.chat = [];
    aiError = null;
    S.save();
    render();
  },
  'ai-apply': (el) => {
    const m = S.state.chat[+el.dataset.i];
    const { plan } = splitPlan(m?.content || '');
    if (!plan) return;
    const res = Pl.applyPlan(plan.date, plan.blocks);
    m.applied = true;
    S.save();
    planDate = plan.date;
    haptic('success');
    go('#/plan');
    undoable(`Plan añadido (${plan.blocks.length} bloques)`, () => { Pl.undoAuto(plan.date, res); m.applied = false; S.save(); });
  },
  'ai-test': async (el) => {
    el.disabled = true;
    el.textContent = 'Probando…';
    try {
      await askTutor([{ role: 'user', content: 'Responde solo: "Conectado".' }]);
      toast('¡El tutor funciona!');
      haptic('success');
    } catch (e) {
      toast(e.message, 5000);
      haptic('heavy');
    }
    render();
  },

  'study-settings': () => {
    const x = S.state.study;
    sheetCtx = {};
    openSheet('Ajustes de estudio', `
      ${field('Objetivo diario (minutos)', text('goal', x.goal, 'inputmode="numeric"'))}
      <div class="three">
        ${field('Estudio', text('focus', x.focus, 'inputmode="numeric"'))}
        ${field('Descanso', text('brk', x.brk, 'inputmode="numeric"'))}
        ${field('Descanso largo', text('longBrk', x.longBrk, 'inputmode="numeric"'))}
      </div>
      <p class="hint">Cada 4 bloques de estudio toca un descanso largo. Todo en minutos.</p>`, 'save-study');
  },
  'save-study': () => {
    const d = formData();
    const x = S.state.study;
    const n = (v, def, lo, hi) => Math.min(hi, Math.max(lo, parseNum(v) ?? def));
    x.goal = n(d.goal, 120, 10, 720);
    x.focus = n(d.focus, 25, 5, 120);
    x.brk = n(d.brk, 5, 1, 30);
    x.longBrk = n(d.longBrk, 15, 5, 60);
    S.save();
    closeOverlay();
    toast('Guardado');
    render();
  },
  'add-session': () => {
    sheetCtx = {};
    const subs = [['', 'Estudio general'], ...studySubjects().map((s) => [s.id, s.name])];
    openSheet('Añadir tiempo de estudio', `
      ${field('Asignatura', select('subjectId', subs, studySubj))}
      <div class="two">
        ${field('Minutos', text('minutes', '60', 'inputmode="numeric"'))}
        ${field('Día', `<input class="input" type="date" name="date" value="${S.ymd()}">`)}
      </div>
      <p class="hint">Para cuando estudias sin el temporizador (biblioteca, clases particulares…).</p>`, 'save-session');
  },
  'save-session': () => {
    const d = formData();
    const m = parseNum(d.minutes);
    if (!m || m < 1 || m > 720) return toast('Pon los minutos (1-720)');
    const date = d.date || S.ymd();
    St.logSession({ subjectId: d.subjectId, minutes: m, date, start: S.toDate(date, '12:00').getTime() });
    closeOverlay();
    haptic('success');
    toast(`+${m} min`);
    render();
  },
  'pad-key': (el) => padKey(el.dataset.k),
  'pad-save': () => padSave(),
  'pad-clear': () => { pad.value = ''; padSave(); },
  undo: () => {
    const u = lastUndo;
    lastUndo = null;
    snackEl.classList.remove('show');
    if (!u) return;
    u();
    haptic();
    render();
  },
  'set-color': (el) => {
    const s = subjectOf(el);
    s.color = el.dataset.c;
    S.save();
    haptic();
    closeOverlay();
    render();
  },
  'toggle-done': (el) => toggleDone(el.dataset.id, el),
  'item-ics': (el) => {
    const it = S.item(el.dataset.id);
    shareFile(`${(it.title || 'evento').replace(/[^\wáéíóúñ ]+/gi, '').trim() || 'evento'}.ics`, S.toICS([it]), 'text/calendar');
  },

  // --- Horario ---
  'new-slot': (el) => openSlotSheet(el.dataset.id, null, el.dataset.area || 'teoria'),
  'edit-slot': (el) => openSlotSheet(el.dataset.id, el.dataset.x),
  'save-slot': () => {
    const d = formData();
    if (!d.start || !d.end || S.minutes(d.end) <= S.minutes(d.start)) return toast('Revisa las horas');
    const s = S.subject(sheetCtx.subjectId);
    const data = { day: +d.day, start: d.start, end: d.end, type: d.type, room: d.room.trim(), group: d.group.trim() };
    if (sheetCtx.slotId) Object.assign(s.slots.find((x) => x.id === sheetCtx.slotId), data);
    else s.slots.push({ id: S.uid(), ...data });
    S.save();
    closeOverlay();
    render();
  },
  'del-slot': (el) => {
    const s = subjectOf(el);
    s.slots = s.slots.filter((x) => x.id !== el.dataset.x);
    S.save();
    closeOverlay();
    render();
  },

  // --- Info ---
  'new-teacher': (el) => openTeacherSheet(el.dataset.id),
  'edit-teacher': (el) => openTeacherSheet(el.dataset.id, el.dataset.t),
  'save-teacher': () => {
    const d = formData();
    if (!d.name.trim()) return toast('Ponle un nombre');
    const s = S.subject(sheetCtx.subjectId);
    s.teachers = s.teachers || [];
    const data = { name: d.name.trim(), email: d.email.trim(), office: d.office.trim(), hours: d.hours.trim() };
    if (sheetCtx.tId) Object.assign(s.teachers.find((x) => x.id === sheetCtx.tId), data);
    else s.teachers.push({ id: S.uid(), ...data });
    S.save();
    closeOverlay();
    render();
  },
  'del-teacher': (el) => {
    const s = subjectOf(el);
    s.teachers = s.teachers.filter((x) => x.id !== el.dataset.t);
    S.save();
    closeOverlay();
    render();
  },
  'new-link': (el) => openLinkSheet(el.dataset.id),
  'save-link': () => {
    const d = formData();
    let url = d.url.trim();
    if (!url) return toast('Pon la dirección');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const s = S.subject(sheetCtx.subjectId);
    s.links = s.links || [];
    s.links.push({ id: S.uid(), label: d.label.trim(), url });
    S.save();
    closeOverlay();
    render();
  },
  'del-link': (el) => {
    const s = subjectOf(el);
    s.links = s.links.filter((x) => x.id !== el.dataset.l);
    S.save();
    render();
  },
  'add-topic': (form) => {
    const name = form.elements.topic.value.trim();
    if (!name) return;
    const s = S.subject(form.dataset.id);
    s.topics = s.topics || [];
    const area = form.dataset.area === 'practicas' ? 'practicas' : 'teoria';
    s.topics.push({ id: S.uid(), name, done: false, area });
    S.save();
    render();
    app.querySelector(`.topic-new[data-area="${area}"] input`)?.focus();
  },
  'toggle-topic': (el) => {
    const s = subjectOf(el);
    const t = s.topics.find((x) => x.id === el.dataset.t);
    t.done = !t.done;
    S.save();
    render();
  },
  'del-topic': (el) => {
    const s = subjectOf(el);
    s.topics = s.topics.filter((x) => x.id !== el.dataset.t);
    S.save();
    render();
  },

  // --- Agenda ---
  'agenda-view': (el) => { agendaView = el.dataset.v; haptic(); renderTab(); },
  'agenda-kind': (el) => { agendaKind = el.dataset.v; render(); },
  'toggle-past': () => { showPast = !showPast; render(); },
  week: (el) => { weekOffset = +el.dataset.v === 0 ? 0 : weekOffset + +el.dataset.v; render(); },
  month: (el) => {
    monthOffset = +el.dataset.v === 0 ? 0 : monthOffset + +el.dataset.v;
    const t = new Date();
    const first = new Date(t.getFullYear(), t.getMonth() + monthOffset, 1);
    selDay = monthOffset === 0 ? S.ymd() : S.ymd(first);
    render();
  },
  'sel-day': (el) => { selDay = el.dataset.v; render(); },
  'export-ics': () => {
    const list = S.state.items.filter((i) => i.date && i.date >= S.ymd() && S.subject(i.subjectId));
    if (!list.length) return toast('No hay fechas próximas que exportar');
    shareFile('unilog-fechas.ics', S.toICS(list), 'text/calendar');
  },

  // --- Ajustes ---
  theme: (el) => {
    S.state.settings.theme = el.dataset.v;
    S.save();
    applyTheme();
    render();
  },
  export: () => {
    const name = `unilog-copia-${S.ymd()}.json`;
    shareFile(name, JSON.stringify(S.state, null, 2), 'application/json');
  },
  reset: async () => {
    if (!(await ask('Se borrarán todas tus asignaturas, notas y fechas. No se puede deshacer.', { ok: 'Borrar todo', danger: true }))) return;
    S.resetAll();
    applyTheme();
    toast('Datos borrados');
    go('#/inicio');
  },
  'load-demo': () => {
    S.loadDemo();
    closeOverlay();
    toast('Datos de ejemplo cargados');
    go('#/inicio');
  },
  'clear-demo': async () => {
    if (!(await ask('Se borrarán los datos de ejemplo para empezar con los tuyos.', { ok: 'Empezar de cero' }))) return;
    const keep = { ...S.state.settings };
    S.resetAll();
    Object.assign(S.state.settings, keep);
    S.save();
    go('#/inicio');
  },
};

// ---------- Toques ----------

document.addEventListener('click', (e) => {
  const answer = e.target.closest('[data-answer]');
  if (answer && pending) {
    const p = pending;
    pending = null;
    closeOverlay();
    p(answer.dataset.answer === '1');
    return;
  }
  if (e.target === overlay) return closeOverlay();

  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const a = el.dataset.action;
  // Los enlaces con acción también navegan
  if (el.tagName !== 'A') e.preventDefault();
  if (a === 'go-week') { actions[a](el); return; }
  if (el.closest('#overlay') && ['new-item', 'new-subject', 'add-past'].includes(a) && overlay.querySelector('.qa')) closeOverlay();
  if (el.closest('.menu') && a !== 'close' && a !== 'set-color') closeOverlay();
  if (el.closest('#tabbar, .seg, .chip')) haptic();
  actions[a]?.(el, e);
});

// Enviar un formulario (botón Guardar o Intro)
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const a = form.dataset.save;
  if (a === 'add-topic') return actions[a](form);
  actions[a]?.(form);
});

// ---------- Campos ----------

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.name === 'text' && t.closest('form[data-save="save-topics"]')) {
    const n = SP.parseSyllabus(t.value).length;
    document.getElementById('paste-count').textContent = `${n} ${n === 1 ? 'tema' : 'temas'}`;
    return;
  }
  if (t.dataset.wz && wz) {
    wz.d[t.dataset.wz] = t.value;
    if (t.dataset.wz === 'wt') {
      t.style.setProperty('--v', `${t.value}%`);
      overlay.querySelector('[data-wt-t]').textContent = `${t.value} %`;
      overlay.querySelector('[data-wt-p]').textContent = `${100 - t.value} %`;
      if (+t.value % 10 === 0) haptic();
    }
    if (t.dataset.wz === 'slotStart' && t.value) {
      wz.d.slotEnd = addMin(t.value, wz.d.slotType === 'Teoría' ? 90 : 120);
      const end = overlay.querySelector('[data-wz="slotEnd"]');
      if (end) end.value = wz.d.slotEnd;
    }
    return;
  }
  const r = route();
  if (r.name !== 'asignatura') return;
  const s = S.subject(r.id);
  if (!s) return;

  if (t.dataset.grade) {
    const it = S.item(t.dataset.grade);
    const g = parseNum(t.value);
    if (t.value.trim() !== '' && (g == null || g < 0 || g > (+it.max || 10))) {
      t.classList.add('bad');
      return;
    }
    t.classList.remove('bad');
    it.grade = g;
    if (g != null && it.kind !== 'examen') it.done = true;
    S.save();
    refreshLive(s);
  } else if (t.dataset.sim) {
    const it = S.item(t.dataset.sim);
    const g = parseNum(t.value);
    const map = sims[s.id] || (sims[s.id] = {});
    if (g == null || g < 0 || g > (+it.max || 10)) delete map[it.id];
    else map[it.id] = g;
    refreshLive(s);
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  const f = t.dataset.field;
  const st = S.state.settings;

  if (t.name === 'exam' && t.closest('form[data-save="save-item"]')) {
    const form = t.closest('form');
    form.querySelector('.only-exam-topics').hidden = !t.checked;
    form.querySelector('.only-deliv').hidden = t.checked;
    refreshExamTopics(form);
    return;
  }
  if (t.name === 'subjectId' && t.closest('form[data-save="save-block"]')) {
    document.getElementById('topic-sel').innerHTML = select('topicId', topicOptions(t.value), '');
    return;
  }
  if (t.dataset.field === 'plan-h' && t.value) {
    S.state.plan[t.dataset.k] = t.value;
    S.save();
    toast('Guardado', 1400);
    return;
  }
  if (t.name === 'optional' && t.closest('#overlay form')) {
    t.closest('form').querySelector('.only-opt').hidden = !t.checked;
    return;
  }

  // Al cambiar la asignatura en el formulario, actualizar sus apartados
  if (t.name === 'subjectId' && t.closest('#overlay form')) {
    const form = t.closest('form');
    const kind = form.elements.kind.value;
    const opts = compOptions(t.value);
    const pickId = defaultComp(S.subject(t.value), kind);
    document.getElementById('comp-sel').innerHTML = select('compId', opts, pickId);
    form.querySelector('.only-annual-item').hidden = !annualNoSplit(t.value);
    refreshExamTopics(form);
    return;
  }

  if (f === 'sim') {
    simOn = t.checked;
    render();
  } else if (f === 'notes') {
    const s = S.subject(t.dataset.id);
    s.notes = t.value;
    S.save();
    toast('Apuntes guardados', 1400);
  } else if (f === 'set') {
    const k = t.dataset.k;
    let v = t.value.trim();
    if (k === 'totalCredits') v = parseNum(v) || 240;
    if (k === 'passMark') v = parseNum(v) ?? 5;
    st[k] = v;
    S.save();
    toast('Guardado', 1400);
    if (k === 'term') render();
  } else if (f === 'import' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!(await ask('Se sustituirán tus datos actuales por los de la copia. ¿Continuar?', { ok: 'Importar' }))) return;
      S.replaceState(data);
      applyTheme();
      toast('Copia importada');
      go('#/inicio');
    } catch (err) {
      toast(err.message.includes('UniLog') ? err.message : 'El archivo no es válido');
    } finally {
      t.value = '';
    }
  }
});

// Intro en el chat del tutor envía (Mayús+Intro, nueva línea)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'ai-input') {
    e.preventDefault();
    e.target.form.requestSubmit();
  }
});
// El cuadro de texto del chat crece con lo que escribes
document.addEventListener('input', (e) => {
  if (e.target.id !== 'ai-input') return;
  e.target.style.height = 'auto';
  e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
});

// Intro en el asistente pasa al siguiente paso
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && wz && e.target.matches('[data-wz]:not([type="range"])')) {
    e.preventDefault();
    e.target.blur();
    wzNext();
  }
});

// Vibración al cambiar de pestaña
document.getElementById('tabbar').addEventListener('click', (e) => {
  if (e.target.closest('a')) haptic();
});

// Intro en un campo de nota cierra el teclado
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.grade-in')) {
    e.preventDefault();
    e.target.blur();
  }
});

// Refresca Inicio cada minuto (clase actual)
setInterval(() => {
  if (['inicio', 'agenda'].includes(route().name) && overlay.hidden && !app.contains(document.activeElement)) render();
}, 60000);

// ---------- Arranque ----------

applyTheme();
render();

// ---------- Animación de apertura ----------

(function splashOut() {
  const el = document.getElementById('splash');
  if (!el) return;
  const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const greet = el.querySelector('.sp-greet');
  const name = S.state.settings.name;
  if (greet) greet.textContent = `${greeting()}${name ? `, ${name}` : ''}`;
  setTimeout(() => {
    el.classList.add('out');
    document.body.classList.remove('splashing');
    playEnter('fade');
    setTimeout(() => el.remove(), 550);
  }, quick ? 250 : 1500);
})();

if ('serviceWorker' in navigator) {
  // Cuando hay una versión nueva, se recarga sola una vez
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update();
        // Busca actualizaciones al volver a la app
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
      })
      .catch(() => {});
  });
}
