// =============================================================
//  app.js — Interfaz: navegación, pantallas y acciones
// =============================================================

import * as S from './store.js';

const APP_VERSION = '1.3';

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const toastEl = document.getElementById('toast');

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
};
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
  if (key !== lastRouteKey) window.scrollTo(0, 0);
  lastRouteKey = key;
  afterRender(r);
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
      ${done + pending > 0.005 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-opacity=".28" stroke-width="${stroke}"
        stroke-dasharray="${(done + pending) * C} ${C}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/>` : ''}
      ${done > 0.005 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${done * C} ${C}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/>` : ''}
      ${tick(pass)}
    </svg>`;
}

/** Barra apilada con los apartados de evaluación */
function compBar(c, s) {
  if (!c.parts.length) return '';
  return `<div class="cbar" style="--c:${subjColor(s)}">${c.parts.map((p) => `
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
    case 'secured': return { tone: 'good', title: 'Aprobado asegurado', text: c.minsPending.length ? 'Te falta llegar a las notas mínimas que quedan.' : 'Aunque saques un 0 en lo que queda.' };
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
        : m ? `No llegas a la nota mínima en ${m.comp.name} (${fmt(m.avg)} de ${fmt(m.min)}).`
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
  const deliverable = it.kind === 'practica' || it.kind === 'entrega';
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
  return `
    <div class="row-item" style="--c:${subjColor(s)}">
      <button class="row-main" data-action="edit-item" data-id="${it.id}">
        <span class="kicon k-${it.kind}">${I[it.kind]}</span>
        <span class="row-text">
          <strong>${esc(it.title || S.KINDS[it.kind].label)}</strong>
          <small>${showSubject && s ? `<b class="sdot"></b>${esc(S.shortName(s))}${meta ? '<i class="dot"></i>' : ''}` : ''}${meta}</small>
        </span>
      </button>
      ${right}
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
  const exams = S.upcoming({ kinds: ['examen'] }).slice(0, 4);
  if (!exams.length) return '';
  return `
    <h2 class="section-title">Próximos exámenes</h2>
    <div class="exam-scroll">${exams.map((it) => {
      const s = S.subject(it.subjectId);
      const n = S.daysUntil(it.date);
      return `
        <button class="exam-card ${n <= 7 ? 'soon' : ''}" data-action="edit-item" data-id="${it.id}" style="--c:${subjColor(s)}">
          <span class="exam-days"><b>${n === 0 ? 'Hoy' : n}</b>${n === 0 ? '' : n === 1 ? 'día' : 'días'}</span>
          <strong>${esc(s.name)}</strong>
          <small>${esc(it.title)}</small>
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
      <a class="stat" href="#/notas"><strong>${fmt(r.weighted)}</strong><span>Media</span></a>
      <a class="stat" href="#/notas"><strong>${fmt(r.credits, 1)}</strong><span>Créditos</span></a>
      <a class="stat" href="#/asignaturas"><strong>${active.length}</strong><span>En curso</span></a>
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
        <a class="glance-item" href="#/asignatura/${s.id}" style="--c:${subjColor(s)}">
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
    ${nowCard()}
    ${todayList()}
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
    <a class="card subj" href="#/asignatura/${s.id}" style="--c:${subjColor(s)}">
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
          <strong class="t-${S.gradeTone(g)}">${fmt(g)}</strong>
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
        </div>`}
      </div>
    </div>
    ${s.final ? '' : c.split ? periodTiles(c) : areaTiles(c)}
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
            <small>${p.comps.map((x) => `${x.name} ${x.weight} %`).join(' · ')}</small>
          </button>`).join('')}
        </div>
        <button class="btn ghost block mt" data-action="new-comp" data-id="${s.id}">${I.plusSm} Crear desde cero</button>
      </div>`;
  }

  const warnings = [...c.weightIssues];
  const alerts = c.itemFails.map((f) => `${esc(f.item.title)}: sacaste ${fmt(f.grade)} y el mínimo es ${fmt(f.min)}.`);
  for (const p of c.atRiskMin) warnings.push(`En ${esc(p.name)} llevas ${fmt(p.avg)} y la mínima es ${fmt(p.min)}.`);
  if (!s.final) {
    for (const p of c.minsPending) {
      const min10 = p.scale ? (p.min / p.scale) * 10 : p.min;
      if (p.avg == null && (c.need == null || min10 > c.need)) warnings.push(`En ${esc(p.name)} necesitas al menos un ${fmt(p.min)}${c.need != null && c.need > 0 ? ' aunque la media te pida menos' : ''}.`);
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
            <strong>${esc(p.comp.name)}</strong>
            <small>${fmt(p.comp.weight)} %${p.min != null ? ` · mínimo ${fmt(p.min)}` : ''} · ${I.edit}</small>
          </button>
          <span class="comp-avg" data-comp-avg="${p.comp.id}">${gradeBadge(p.avg)}</span>
        </div>
        ${p.items.length ? `<div class="comp-items">${p.items.sort(S.byDate).map((it) => gradeRow(it, sim, p.items.length)).join('')}</div>` : '<p class="muted small">Sin evaluables. Añade el examen o las prácticas de este apartado.</p>'}
        <button class="btn sm ghost mt" data-action="new-item" data-s="${s.id}" data-c="${p.comp.id}" data-k="${p.comp.kind || 'examen'}">${I.plusSm} Añadir ${addLabel(p.comp)}</button>
      </div>`).join('')}
    </div>`).join('')}
    ${pr.period ? `<button class="add-term mt" data-action="new-comp" data-id="${s.id}" data-p="${pr.period}">${I.plusSm} Añadir apartado al ${S.PERIOD_SHORT[pr.period]}</button>` : ''}
    `).join('')}

    ${c.split ? '' : `<button class="btn ghost block mt" data-action="new-comp" data-id="${s.id}">${I.plusSm} Añadir apartado de evaluación</button>`}

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
  const done = topics.filter((t) => t.done).length;
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
    <div class="card flush topics">
      ${topics.map((t) => `
        <div class="topic ${t.done ? 'done' : ''}">
          <button class="tick ${t.done ? 'on' : ''}" data-action="toggle-topic" data-id="${s.id}" data-t="${t.id}" aria-label="Marcar tema">${I.check}</button>
          <span>${esc(t.name)}</span>
          <button class="icon-btn ghost sm" data-action="del-topic" data-id="${s.id}" data-t="${t.id}" aria-label="Quitar tema">${I.xs}</button>
        </div>`).join('')}
      <form class="topic-new" data-save="add-topic" data-id="${s.id}">
        <input class="input" name="topic" placeholder="Añadir tema…" enterkeyhint="done" autocomplete="off">
        <button class="icon-btn sm" type="submit" aria-label="Añadir tema">${I.plusSm}</button>
      </form>
    </div>
    <p class="hint">Marca los temas que ya llevas estudiados.</p>

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
    if (el) el.innerHTML = gradeBadge(p.avg);
  }
  for (const p of c.periods) {
    const el = app.querySelector(`[data-period-avg="${p.period}"]`);
    if (el) el.innerHTML = gradeBadge(p.avg, { size: 'lg' });
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
  const all = S.state.items.filter((i) => S.subject(i.subjectId)).filter((i) => !kinds || kinds.includes(i.kind));
  const next = all.filter((i) => i.date && i.date >= today).sort(S.byDate);
  const nodate = all.filter((i) => !i.date && S.isPending(i));
  const past = all.filter((i) => i.date && i.date < today).sort(S.byDate).reverse();
  const late = past.filter((i) => S.isPending(i) && (i.kind === 'practica' || i.kind === 'entrega'));

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
    <div class="card wk-card">
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
    <div class="card month">
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
        <strong class="big t-${S.gradeTone(r.weighted)}">${fmt(r.weighted)}</strong>
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
    <label class="check only-deliv" ${it.kind === 'practica' || it.kind === 'entrega' ? '' : 'hidden'}><input type="checkbox" name="done" ${it.done ? 'checked' : ''}><span>Entregada</span></label>
    ${field('Notas', `<textarea class="input area" name="notes" placeholder="Temario, material permitido…">${esc(it.notes)}</textarea>`)}`,
  'save-item',
  id ? `
    <div class="two mt">
      ${it.date ? `<button class="btn" type="button" data-action="item-ics" data-id="${it.id}">${I.calAdd} Calendario</button>` : ''}
      <button class="btn text-danger" type="button" data-action="del-item" data-id="${it.id}">${I.trash} Eliminar</button>
    </div>` : '');
}

/** Apartado que mejor encaja con el tipo: el del mismo tipo o el del mismo bloque */
function defaultComp(s, kind) {
  if (!s) return '';
  const area = kind === 'examen' ? 'teoria' : kind === 'otro' ? 'otro' : 'practicas';
  return (s.comps.find((c) => c.kind === kind) || s.comps.find((c) => S.areaOf(c) === area))?.id || '';
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
  const used = s.comps.filter((x) => x.id !== compId && same(x)).reduce((a, x) => a + (+x.weight || 0), 0);
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
    if (name === 'term' && form.dataset.save === 'save-subject') {
      form.querySelector('.only-annual').hidden = el.dataset.value !== 'A';
    }
    if (name === 'kind' && form.dataset.save === 'save-item') {
      const k = el.dataset.value;
      form.querySelector('.only-exam').hidden = k !== 'examen';
      form.querySelector('.only-deliv').hidden = !(k === 'practica' || k === 'entrega');
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
  'subj-filter': (el) => { subjFilter = el.dataset.v; render(); },
  'subj-tab': (el) => { subjTab[el.dataset.id] = el.dataset.v; simOn = false; render(); },
  'new-subject': (el) => openSubjectSheet(null, el?.dataset?.term),
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
  'apply-preset': (el) => {
    const s = subjectOf(el);
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
    if (w == null || w < 0 || w > 100) return toast('El peso va de 0 a 100');
    const min = parseNum(d.min);
    const data = { name: d.name.trim(), kind: d.kind, area: d.area, period: d.period || '', weight: w, min: min == null ? null : Math.min(10, Math.max(0, min)) };
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
    toast(g >= (+S.state.settings.passMark || 5) ? '¡Enhorabuena! Añadida al expediente' : 'Nota guardada');
    render();
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
      weight: parseNum(d.weight) || 1,
      done: !!d.done || (g != null && d.kind !== 'examen'),
      notes: d.notes.trim(),
    });
    if (isNew) S.state.items.push(it);
    S.save();
    closeOverlay();
    toast(isNew ? 'Añadido' : 'Guardado');
    render();
  },
  'del-item': async (el) => {
    const it = S.item(el.dataset.id);
    if (!(await ask(`¿Eliminar "${it.title}"?`, { ok: 'Eliminar', danger: true }))) return;
    S.state.items = S.state.items.filter((i) => i.id !== it.id);
    S.save();
    toast('Eliminado');
    render();
  },
  'toggle-done': (el) => {
    const it = S.item(el.dataset.id);
    it.done = !it.done;
    S.save();
    if (it.done) navigator.vibrate?.(15);
    toast(it.done ? '¡Entregada!' : 'Marcada como pendiente');
    render();
  },
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
    s.topics.push({ id: S.uid(), name, done: false });
    S.save();
    render();
    app.querySelector('.topic-new input')?.focus();
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
  'agenda-view': (el) => { agendaView = el.dataset.v; render(); },
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

  // Al cambiar la asignatura en el formulario, actualizar sus apartados
  if (t.name === 'subjectId' && t.closest('#overlay form')) {
    const form = t.closest('form');
    const kind = form.elements.kind.value;
    const opts = compOptions(t.value);
    const pickId = defaultComp(S.subject(t.value), kind);
    document.getElementById('comp-sel').innerHTML = select('compId', opts, pickId);
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
