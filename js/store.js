// =============================================================
//  store.js — Datos de la app y lógica de notas
//  Todo se guarda en localStorage (en el propio móvil).
// =============================================================

const KEY = 'unilog:v1';

/** Genera un id único corto */
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Normaliza un texto para comparar: sin tildes, minúsculas */
export const norm = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Colores para las asignaturas */
export const PALETTE = [
  '#7c9cff', '#ff8a5c', '#3ddc97', '#f7c948', '#c084fc',
  '#ff6b8b', '#2dd4bf', '#60a5fa', '#a3e635', '#fb7185',
];

/** Tipos de evaluable */
export const KINDS = {
  examen: { label: 'Examen', plural: 'Exámenes' },
  practica: { label: 'Práctica', plural: 'Prácticas' },
  entrega: { label: 'Entrega', plural: 'Entregas' },
  otro: { label: 'Otro', plural: 'Otros' },
};

/** Tipos de clase del horario */
export const SLOT_TYPES = ['Teoría', 'Prácticas', 'Laboratorio', 'Seminario', 'Tutoría'];

/** Bloques de una asignatura: teoría, prácticas y lo demás */
export const AREAS = {
  teoria: { label: 'Teoría', short: 'T' },
  practicas: { label: 'Prácticas', short: 'P' },
  otro: { label: 'Otros', short: 'O' },
};
export const AREA_ORDER = ['teoria', 'practicas', 'otro'];

/** Bloque al que pertenece un apartado de evaluación */
export const areaOf = (c) =>
  c.area || (c.kind === 'examen' ? 'teoria' : c.kind === 'practica' || c.kind === 'entrega' ? 'practicas' : 'otro');

/** Bloque al que pertenece una clase del horario */
export const slotArea = (type = '') =>
  type === 'Teoría' ? 'teoria' : type === 'Prácticas' || type === 'Laboratorio' ? 'practicas' : 'otro';

/** Grupo de una asignatura para teoría o prácticas */
export const groupOf = (s, area) =>
  area === 'practicas' ? s.groupP || '' : s.groupT || s.group || '';

/** Convocatorias habituales */
export const CALLS = ['Parcial', 'Primera convocatoria', 'Segunda convocatoria', 'Tercera convocatoria', 'Extraordinaria'];

export const TERMS = { C1: '1.er cuatrimestre', C2: '2.º cuatrimestre', A: 'Anual' };
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ---------- Fechas ----------

const pad = (n) => String(n).padStart(2, '0');

/** Fecha local en formato AAAA-MM-DD */
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Convierte AAAA-MM-DD (y opcionalmente HH:MM) a Date local */
export function toDate(str, time = '') {
  const [y, m, d] = str.split('-').map(Number);
  const [h = 0, mi = 0] = time ? time.split(':').map(Number) : [];
  return new Date(y, m - 1, d, h, mi);
}

/** Días naturales entre hoy y una fecha (negativo si ya pasó) */
export function daysUntil(str) {
  const a = toDate(ymd());
  const b = toDate(str);
  return Math.round((b - a) / 864e5);
}

/** Día de la semana 1 (lunes) … 7 (domingo) */
export const weekday = (d) => ((d.getDay() + 6) % 7) + 1;

export const minutes = (hhmm = '0:0') => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Curso académico de una fecha: "2026/27" */
export function academicYear(d = new Date()) {
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}/${String(y + 1).slice(-2)}`;
}

/** Cuatrimestre actual según el mes (o el fijado en Ajustes) */
export function currentTerm() {
  const t = state.settings.term;
  if (t === 'C1' || t === 'C2') return t;
  return currentTermAuto();
}

/** Cuatrimestre según el mes: septiembre-enero el 1.º, febrero-agosto el 2.º */
export function currentTermAuto() {
  const m = new Date().getMonth(); // 0 = enero
  return m >= 8 || m === 0 ? 'C1' : 'C2';
}

// ---------- Estado ----------

const defaults = () => ({
  app: 'UniLog',
  version: 1,
  subjects: [],
  items: [],
  settings: {
    name: '',
    degree: 'Grado en Ingeniería Informática',
    university: 'Universidad de Sevilla',
    totalCredits: 240,
    passMark: 5,
    term: 'auto',
    theme: 'auto',
  },
  demo: false,
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...data, settings: { ...d.settings, ...data.settings } };
  } catch {
    return defaults();
  }
}

export let state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function replaceState(data) {
  if (!data || data.app !== 'UniLog' || !Array.isArray(data.subjects)) {
    throw new Error('El archivo no es una copia de UniLog');
  }
  const d = defaults();
  state = { ...d, ...data, settings: { ...d.settings, ...data.settings } };
  save();
}

export function resetAll() {
  state = defaults();
  save();
}

// ---------- Asignaturas ----------

export const subject = (id) => state.subjects.find((s) => s.id === id);

export function newSubject(data = {}) {
  return {
    id: uid(),
    name: '',
    short: '',
    code: '',
    color: PALETTE[state.subjects.length % PALETTE.length],
    credits: 6,
    year: 1,
    term: currentTerm(),
    academicYear: academicYear(),
    group: '',
    groupT: '',
    groupP: '',
    room: '',
    roomP: '',
    teachers: [],
    links: [],
    notes: '',
    slots: [],
    comps: [],
    topics: [],
    split: false,
    periods: { C1: { weight: 50, min: null }, C2: { weight: 50, min: null } },
    final: null,
    ...data,
  };
}

/** Abreviatura que se muestra en tarjetas pequeñas */
export function shortName(s) {
  if (!s) return '';
  if (s.short) return s.short;
  const words = s.name.split(/\s+/).filter((w) => w.length > 2 && !/^(de|del|la|las|los|el|y|en|para)$/i.test(w));
  if (s.name.length <= 12) return s.name;
  return words.map((w) => w[0].toUpperCase()).join('').slice(0, 5) || s.name.slice(0, 8);
}

/** Asignaturas que se están cursando (sin nota final) */
export const activeSubjects = () => state.subjects.filter((s) => !s.final);

/** ¿La asignatura tiene clase este cuatrimestre? */
/** ¿Es del curso académico actual? */
export const isThisYear = (s) => (s.academicYear || '').replace(/\s/g, '') === academicYear();

/** ¿Tiene clase ahora? Solo las de este curso y este cuatrimestre */
export const inCurrentTerm = (s) => !s.final && isThisYear(s) && (s.term === 'A' || s.term === currentTerm());

export function deleteSubject(id) {
  state.subjects = state.subjects.filter((s) => s.id !== id);
  state.items = state.items.filter((i) => i.subjectId !== id);
  save();
}

// ---------- Evaluables (exámenes, prácticas, entregas) ----------

export const item = (id) => state.items.find((i) => i.id === id);
export const itemsOf = (subjectId) => state.items.filter((i) => i.subjectId === subjectId);

export function newItem(data = {}) {
  return {
    id: uid(),
    subjectId: '',
    compId: '',
    kind: 'examen',
    title: '',
    date: '',
    time: '',
    place: '',
    call: '',
    grade: null,
    max: 10,
    min: null,
    weight: 1,
    done: false,
    notes: '',
    ...data,
  };
}

/** Nota sobre 10 de un evaluable (o null si no tiene) */
export function grade10(it, sim) {
  const raw = sim && sim[it.id] != null ? sim[it.id] : it.grade;
  if (raw == null || raw === '' || Number.isNaN(+raw)) return null;
  const max = +it.max || 10;
  return Math.max(0, Math.min(10, (+raw / max) * 10));
}

/** ¿Está pendiente? Exámenes sin nota o entregas sin entregar */
export function isPending(it) {
  if (it.kind === 'examen' || it.kind === 'otro') return it.grade == null;
  return !it.done && it.grade == null;
}

/** Evaluables con fecha de hoy en adelante, ordenados */
export function upcoming({ kinds, days = 3650, pendingOnly = true } = {}) {
  const today = ymd();
  return state.items
    .filter((i) => i.date && i.date >= today && daysUntil(i.date) <= days)
    .filter((i) => !kinds || kinds.includes(i.kind))
    .filter((i) => !pendingOnly || isPending(i))
    .filter((i) => subject(i.subjectId))
    .sort(byDate);
}

/** Prácticas/entregas pasadas de fecha y sin entregar */
export function overdue() {
  const today = ymd();
  return state.items
    .filter((i) => i.date && i.date < today && (i.kind === 'practica' || i.kind === 'entrega') && !i.done && i.grade == null)
    .filter((i) => subject(i.subjectId) && !subject(i.subjectId).final)
    .sort(byDate);
}

export const byDate = (a, b) =>
  (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '99').localeCompare(b.time || '99');

// ---------- Cálculo de notas ----------

const wt = (i) => (Number(i.weight) > 0 ? Number(i.weight) : 1);

/**
 * Calcula la situación de una asignatura.
 * sim: notas simuladas { itemId: nota } que no se guardan.
 */
/** ¿La asignatura anual tiene nota por cuatrimestre? */
export const isSplit = (s) => s.term === 'A' && !!s.split;

export const PERIODS = { C1: '1.er cuatrimestre', C2: '2.º cuatrimestre' };
export const PERIOD_SHORT = { C1: '1.er cuatri', C2: '2.º cuatri' };

/** Cuatrimestre al que pertenece un apartado (solo en anuales divididas) */
export const periodOf = (c) => (c.period === 'C2' ? 'C2' : 'C1');

const numOrNull = (v) => (v === '' || v == null || Number.isNaN(+v) ? null : +v);

/** Agrupa apartados y calcula su media, lo evaluado y la mínima */
function summarize(parts, weight = null, min = null) {
  let num = 0;
  let den = 0;
  let w = 0;
  let mins = null;
  for (const p of parts) {
    w += p.weight;
    if (p.min != null) mins = mins == null ? p.min : Math.max(mins, p.min);
    if (p.avg != null) {
      num += p.avg * p.weight * p.share;
      den += p.weight * p.share;
    }
  }
  const total = weight ?? w;
  const avg = den ? num / den : null;
  const complete = parts.length > 0 && parts.every((p) => p.complete);
  return {
    parts, weight: total, avg, done: total ? den / total : 0, complete,
    min: min ?? mins,
    belowMin: min != null && avg != null && avg < min,
    failsMin: min != null && avg != null && complete && avg < min,
  };
}

function byAreas(parts) {
  return AREA_ORDER
    .map((a) => ({ area: a, ...summarize(parts.filter((p) => areaOf(p.comp) === a)) }))
    .filter((x) => x.parts.length);
}

/**
 * Calcula la situación de una asignatura.
 * sim: notas simuladas { itemId: nota } que no se guardan.
 */
export function calc(s, sim = null) {
  const pass = +state.settings.passMark || 5;
  const comps = s.comps || [];
  const items = itemsOf(s.id);
  const split = isSplit(s);

  // Peso real de cada apartado en la nota final (0-1)
  const totalW = comps.reduce((a, c) => a + (+c.weight || 0), 0);
  const per = { C1: 0, C2: 0 };
  for (const c of comps) per[periodOf(c)] += +c.weight || 0;
  const pw = split ? { C1: +(s.periods?.C1?.weight ?? 50), C2: +(s.periods?.C2?.weight ?? 50) } : null;
  const pwTotal = split ? pw.C1 + pw.C2 || 1 : 1;
  const weightOf = (c) => {
    if (!split) return totalW ? (+c.weight || 0) / totalW : 0;
    const k = periodOf(c);
    return per[k] ? (pw[k] / pwTotal) * ((+c.weight || 0) / per[k]) : 0;
  };

  let points = 0; // puntos conseguidos (sobre 10)
  let doneW = 0; // peso ya evaluado (0-1)
  let simulated = false;
  const itemFails = []; // pruebas por debajo de su nota mínima
  const itemRisk = []; // pruebas pendientes con mínimo

  const parts = comps.map((c) => {
    const its = items.filter((i) => i.compId === c.id);
    const iw = its.reduce((a, i) => a + wt(i), 0);
    let share = 0;
    let sum = 0;
    for (const i of its) {
      const g = grade10(i, sim);
      const min = numOrNull(i.min);
      if (g == null) {
        if (min != null) itemRisk.push({ item: i, min });
        continue;
      }
      if (sim && sim[i.id] != null && i.grade == null) simulated = true;
      if (min != null) {
        const raw = sim && sim[i.id] != null ? +sim[i.id] : +i.grade;
        if (raw < min) itemFails.push({ item: i, grade: raw, min });
      }
      share += wt(i) / iw;
      sum += (g * wt(i)) / iw;
    }
    const w = weightOf(c);
    const avg = share > 0 ? sum / share : null;
    points += sum * w;
    doneW += share * w;
    const min = numOrNull(c.min);
    return {
      comp: c,
      items: its,
      weight: w,
      avg,
      share,
      complete: its.length > 0 && share > 0.9999,
      min,
      belowMin: min != null && avg != null && avg < min,
      failsMin: min != null && avg != null && share > 0.9999 && avg < min,
    };
  });

  // Nota de cada cuatrimestre (anuales)
  const periods = split
    ? ['C1', 'C2'].map((k) => {
      const ps = parts.filter((p) => periodOf(p.comp) === k);
      const x = summarize(ps, pw[k] / pwTotal, numOrNull(s.periods?.[k]?.min));
      return { period: k, ...x, areas: byAreas(ps) };
    })
    : [];

  const pendingW = Math.max(0, 1 - doneW);
  const current = doneW > 0 ? points / doneW : null;
  const failsMin = parts.some((p) => p.failsMin) || periods.some((p) => p.failsMin);
  const atRiskMin = [
    ...parts.filter((p) => p.belowMin && !p.failsMin).map((p) => ({ name: p.comp.name, avg: p.avg, min: p.min })),
    ...periods.filter((p) => p.belowMin && !p.failsMin).map((p) => ({ name: PERIODS[p.period], avg: p.avg, min: p.min })),
  ];

  let need = null; // media necesaria en lo que queda para aprobar
  let status;
  if (s.final) {
    status = +s.final.grade >= pass ? 'passed' : 'failed';
  } else if (!comps.length) {
    status = 'nodata';
  } else if (doneW === 0) {
    status = 'start';
    need = pass;
  } else if (pendingW < 1e-6) {
    status = points >= pass && !failsMin && !itemFails.length ? 'passed' : 'failed';
  } else {
    need = (pass - points) / pendingW;
    if (failsMin) status = 'failed';
    else if (itemFails.length) status = 'retake';
    else if (need <= 0) status = 'secured';
    else if (need > 10) status = 'impossible';
    else if (need >= 7) status = 'hard';
    else status = 'ontrack';
  }

  // Mínimos que quedan por cumplir
  const minsPending = [
    ...parts.filter((p) => p.min != null && !p.complete).map((p) => ({ name: p.comp.name, min: p.min, avg: p.avg })),
    ...periods.filter((p) => p.min != null && !p.complete).map((p) => ({ name: PERIODS[p.period], min: p.min, avg: p.avg })),
    ...itemRisk.map((r) => ({ name: r.item.title, min: r.min, avg: null, scale: +r.item.max || 10 })),
  ];

  return {
    parts,
    split,
    periods,
    totalW,
    weightIssues: weightIssues(s, comps, per, pw),
    points,
    doneW,
    pendingW,
    current,
    need,
    status,
    failsMin,
    itemFails,
    atRiskMin,
    minsPending,
    areas: byAreas(parts),
    simulated,
    final: s.final ? +s.final.grade : pendingW < 1e-6 && comps.length ? points : null,
  };
}

/** Avisos si los porcentajes no suman 100 */
function weightIssues(s, comps, per, pw) {
  const out = [];
  const near = (a, b) => Math.abs(a - b) < 0.01;
  if (!comps.length) return out;
  if (pw) {
    if (!near(pw.C1 + pw.C2, 100)) out.push(`Los dos cuatrimestres suman ${pw.C1 + pw.C2} % en vez de 100 %.`);
    for (const k of ['C1', 'C2']) {
      if (per[k] && !near(per[k], 100)) out.push(`Los apartados del ${PERIODS[k]} suman ${Math.round(per[k] * 100) / 100} % en vez de 100 %.`);
    }
  } else {
    const t = per.C1 + per.C2;
    if (!near(t, 100)) out.push(`Los porcentajes suman ${Math.round(t * 100) / 100} % en vez de 100 %. La nota se calcula en proporción.`);
  }
  return out;
}

/** Nota que se muestra para una asignatura (final si la hay, si no la actual) */
export function displayGrade(s) {
  if (s.final) return +s.final.grade;
  return calc(s).current;
}

/** Calificación cualitativa */
export function gradeLabel(g, honors = false) {
  if (g == null) return '';
  if (honors) return 'Matrícula de Honor';
  if (g < 5) return 'Suspenso';
  if (g < 7) return 'Aprobado';
  if (g < 9) return 'Notable';
  return 'Sobresaliente';
}

export function gradeTone(g) {
  if (g == null) return 'none';
  const pass = +state.settings.passMark || 5;
  if (g < pass) return 'bad';
  if (g < 7) return 'ok';
  if (g < 9) return 'good';
  return 'top';
}

// ---------- Expediente ----------

export function record() {
  const pass = +state.settings.passMark || 5;
  const closed = state.subjects.filter((s) => s.final && s.final.grade !== '' && s.final.grade != null);
  const passed = closed.filter((s) => +s.final.grade >= pass);
  const failed = closed.filter((s) => +s.final.grade < pass);
  const credits = passed.reduce((a, s) => a + (+s.credits || 0), 0);
  const value = (s) => (s.final.honors ? 10 : +s.final.grade);
  const weighted = credits ? passed.reduce((a, s) => a + value(s) * (+s.credits || 0), 0) / credits : null;
  const simple = passed.length ? passed.reduce((a, s) => a + value(s), 0) / passed.length : null;
  const dist = { mh: 0, sb: 0, nt: 0, ap: 0 };
  for (const s of passed) {
    const g = +s.final.grade;
    if (s.final.honors) dist.mh++;
    else if (g >= 9) dist.sb++;
    else if (g >= 7) dist.nt++;
    else dist.ap++;
  }
  const best = [...passed].sort((a, b) => value(b) - value(a))[0] || null;
  return {
    closed, passed, failed, credits, weighted, simple, dist, best,
    total: +state.settings.totalCredits || 240,
    inProgress: activeSubjects(),
    inProgressCredits: activeSubjects().reduce((a, s) => a + (+s.credits || 0), 0),
  };
}

// ---------- Horario ----------

/** Clases de un día concreto, ordenadas por hora */
export function classesOn(date = new Date()) {
  const wd = weekday(date);
  const out = [];
  for (const s of state.subjects) {
    if (!inCurrentTerm(s)) continue;
    for (const sl of s.slots || []) {
      if (+sl.day === wd) out.push({ s, slot: sl });
    }
  }
  return out.sort((a, b) => minutes(a.slot.start) - minutes(b.slot.start));
}

/** Todas las clases del cuatrimestre actual, por día */
export function weekSlots() {
  const out = [];
  for (const s of state.subjects) {
    if (!inCurrentTerm(s)) continue;
    for (const sl of s.slots || []) out.push({ s, slot: sl });
  }
  return out;
}

// ---------- Exportar calendario (.ics) ----------

const icsEsc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
const icsDate = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

export function toICS(list = state.items.filter((i) => i.date)) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UniLog//ES', 'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:UniLog',
  ];
  const stamp = icsDate(new Date());
  for (const it of list) {
    const s = subject(it.subjectId);
    const title = `${KINDS[it.kind]?.label || ''}: ${it.title || ''}${s ? ' · ' + shortName(s) : ''}`;
    lines.push('BEGIN:VEVENT', `UID:${it.id}@unilog`, `DTSTAMP:${stamp}`);
    if (it.time) {
      const start = toDate(it.date, it.time);
      const end = new Date(start.getTime() + (it.kind === 'examen' ? 120 : 60) * 60000);
      lines.push(`DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`);
    } else {
      const d = toDate(it.date);
      const n = new Date(d.getTime() + 864e5);
      lines.push(`DTSTART;VALUE=DATE:${it.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${ymd(n).replace(/-/g, '')}`);
    }
    lines.push(`SUMMARY:${icsEsc(title)}`);
    if (it.place) lines.push(`LOCATION:${icsEsc(it.place)}`);
    if (it.notes) lines.push(`DESCRIPTION:${icsEsc(it.notes)}`);
    if (it.kind === 'examen') {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'TRIGGER:-P1D', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------- Plantillas de evaluación ----------

export const PRESETS = [
  {
    name: 'Solo examen',
    comps: [{ name: 'Examen final', kind: 'examen', area: 'teoria', weight: 100, min: null }],
  },
  {
    name: 'Teoría + prácticas',
    comps: [
      { name: 'Teoría', kind: 'examen', area: 'teoria', weight: 70, min: 4 },
      { name: 'Prácticas', kind: 'practica', area: 'practicas', weight: 30, min: 4 },
    ],
  },
  {
    name: 'Dos parciales + prácticas',
    comps: [
      { name: 'Parciales', kind: 'examen', area: 'teoria', weight: 60, min: 4 },
      { name: 'Prácticas', kind: 'practica', area: 'practicas', weight: 30, min: null },
      { name: 'Participación', kind: 'otro', area: 'otro', weight: 10, min: null },
    ],
  },
  {
    name: 'Proyecto',
    comps: [
      { name: 'Examen', kind: 'examen', area: 'teoria', weight: 50, min: 4 },
      { name: 'Proyecto', kind: 'entrega', area: 'practicas', weight: 50, min: 5 },
    ],
  },
];

/** Crea la evaluación típica: un bloque de teoría y otro de prácticas */
export function setupTheoryPractice(s, { wt = 70, wp = 30, mt = null, mp = null } = {}) {
  const make = (period, label) => {
    const t = { id: uid(), name: 'Teoría', kind: 'examen', area: 'teoria', weight: wt, min: mt, period };
    const p = { id: uid(), name: 'Prácticas', kind: 'practica', area: 'practicas', weight: wp, min: mp, period };
    if (+wt > 0) state.items.push(newItem({ subjectId: s.id, compId: t.id, kind: 'examen', title: label ? `Parcial de teoría (${label})` : 'Examen de teoría', call: label ? 'Parcial' : '' }));
    return [t, p].filter((c) => +c.weight > 0);
  };
  s.comps = isSplit(s) ? [...make('C1', '1.er cuatri'), ...make('C2', '2.º cuatri')] : make('', '');
}

export function applyPreset(s, preset) {
  s.comps = preset.comps.map((c) => ({ id: uid(), ...c }));
  // Crea los evaluables básicos de cada apartado
  for (const c of s.comps) {
    if (c.name === 'Parciales') {
      state.items.push(newItem({ subjectId: s.id, compId: c.id, kind: 'examen', title: 'Primer parcial', call: 'Parcial' }));
      state.items.push(newItem({ subjectId: s.id, compId: c.id, kind: 'examen', title: 'Segundo parcial', call: 'Parcial' }));
    } else if (c.kind === 'examen' || c.kind === 'entrega') {
      state.items.push(newItem({ subjectId: s.id, compId: c.id, kind: c.kind, title: c.name === 'Teoría' ? 'Examen de teoría' : c.name }));
    }
  }
}

// ---------- Datos de ejemplo ----------

export function loadDemo() {
  const t = new Date();
  const d = (n) => ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
  const term = currentTerm();
  const year = academicYear();

  const mk = (data, comps, items, slots) => {
    const s = newSubject({ ...data, term, academicYear: year });
    s.comps = comps.map((c) => ({ id: uid(), min: null, ...c }));
    s.slots = slots.map((x) => ({ id: uid(), group: '', ...x }));
    state.subjects.push(s);
    for (const it of items) {
      state.items.push(newItem({ subjectId: s.id, compId: it.c != null ? s.comps[it.c].id : '', ...it, c: undefined }));
    }
    return s;
  };

  mk(
    { name: 'Estructuras de Datos', short: 'ED', color: PALETTE[0], credits: 6, year: 2, room: 'A3.10', groupT: 'T1', groupP: 'L3', roomP: 'L2.05',
      teachers: [{ id: uid(), name: 'Prof. García', email: 'garcia@ejemplo.es', office: 'F1.45', hours: 'Martes 11:00-13:00' }],
      topics: ['Listas y pilas', 'Árboles', 'Grafos', 'Tablas hash'].map((n, i) => ({ id: uid(), name: n, done: i < 2 })) },
    [
      { name: 'Parciales de teoría', kind: 'examen', area: 'teoria', weight: 60, min: 4 },
      { name: 'Prácticas', kind: 'practica', area: 'practicas', weight: 40, min: 4 },
    ],
    [
      { c: 0, kind: 'examen', title: 'Primer parcial', date: d(-20), time: '10:00', place: 'Aula A1.12', grade: 6.4, call: 'Parcial' },
      { c: 0, kind: 'examen', title: 'Segundo parcial', date: d(12), time: '10:00', place: 'Aula A1.12', call: 'Parcial' },
      { c: 1, kind: 'practica', title: 'Práctica 1 · Listas', date: d(-15), grade: 8.5, done: true },
      { c: 1, kind: 'practica', title: 'Práctica 2 · Árboles', date: d(3), time: '23:59' },
    ],
    [
      { day: 1, start: '09:00', end: '10:30', type: 'Teoría', room: 'A3.10' },
      { day: 3, start: '09:00', end: '10:30', type: 'Teoría', room: 'A3.10' },
      { day: 4, start: '15:30', end: '17:30', type: 'Laboratorio', room: 'L2.05' },
    ],
  );

  mk(
    { name: 'Bases de Datos', short: 'BD', color: PALETTE[1], credits: 6, year: 2, room: 'A2.14', groupT: 'T1', groupP: 'L1', roomP: 'L1.03' },
    [
      { name: 'Teoría', kind: 'examen', area: 'teoria', weight: 60, min: 4.5 },
      { name: 'Proyecto de prácticas', kind: 'entrega', area: 'practicas', weight: 30, min: 5 },
      { name: 'Participación', kind: 'otro', area: 'otro', weight: 10 },
    ],
    [
      { c: 0, kind: 'examen', title: 'Examen final', date: d(40), time: '16:00', place: 'Aula B2.01', call: 'Primera convocatoria' },
      { c: 1, kind: 'entrega', title: 'Entrega del proyecto', date: d(26), time: '23:59' },
      { c: 2, kind: 'otro', title: 'Participación en clase', grade: 9 },
    ],
    [
      { day: 2, start: '11:00', end: '12:30', type: 'Teoría', room: 'A2.14' },
      { day: 5, start: '11:00', end: '13:00', type: 'Prácticas', room: 'L1.03' },
    ],
  );

  mk(
    { name: 'Redes de Computadores', short: 'RC', color: PALETTE[2], credits: 6, year: 2, room: 'A1.08', groupT: 'T2', groupP: 'L4', roomP: 'L0.02' },
    [
      { name: 'Teoría', kind: 'examen', area: 'teoria', weight: 70, min: 4 },
      { name: 'Prácticas', kind: 'practica', area: 'practicas', weight: 30 },
    ],
    [
      { c: 1, kind: 'practica', title: 'Práctica Wireshark', date: d(-6), grade: 7, done: true },
      { c: 1, kind: 'practica', title: 'Práctica de subredes', date: d(8), time: '14:00' },
      { c: 0, kind: 'examen', title: 'Examen de teoría', date: d(45), time: '09:00', call: 'Primera convocatoria' },
    ],
    [
      { day: 1, start: '12:30', end: '14:00', type: 'Teoría', room: 'A1.08' },
      { day: 3, start: '12:30', end: '14:30', type: 'Laboratorio', room: 'L0.02' },
    ],
  );

  // Asignatura anual con nota en cada cuatrimestre
  const pa = newSubject({
    name: 'Programación Avanzada', short: 'PA', color: PALETTE[4], credits: 12, year: 2, term: 'A', academicYear: year,
    room: 'A0.30', roomP: 'L1.10', groupT: 'T1', groupP: 'L2', split: true,
    periods: { C1: { weight: 50, min: 4 }, C2: { weight: 50, min: 4 } },
  });
  const pc = (period, name, kind, area, weight) => ({ id: uid(), name, kind, area, weight, min: null, period });
  pa.comps = [
    pc('C1', 'Parciales de teoría', 'examen', 'teoria', 60), pc('C1', 'Exámenes de prácticas', 'practica', 'practicas', 40),
    pc('C2', 'Parciales de teoría', 'examen', 'teoria', 60), pc('C2', 'Exámenes de prácticas', 'practica', 'practicas', 40),
  ];
  pa.slots = [
    { id: uid(), day: 2, start: '09:00', end: '11:00', type: 'Teoría', room: 'A0.30', group: '' },
    { id: uid(), day: 4, start: '11:00', end: '13:00', type: 'Prácticas', room: 'L1.10', group: '' },
  ];
  state.subjects.push(pa);
  [
    [0, 'examen', 'Primer parcial', d(-10), 5.8, 4],
    [0, 'examen', 'Segundo parcial', d(30), null, 4],
    [1, 'practica', 'Examen de prácticas 1', d(-2), 7.5, null],
    [1, 'practica', 'Examen de prácticas 2', d(24), null, null],
    [2, 'examen', 'Tercer parcial', d(110), null, 4],
    [3, 'practica', 'Examen de prácticas 3', d(100), null, null],
  ].forEach(([ci, kind, title, date, grade, min]) => state.items.push(newItem({
    subjectId: pa.id, compId: pa.comps[ci].id, kind, title, date, time: kind === 'examen' ? '10:00' : '11:00',
    grade, min, done: grade != null, call: kind === 'examen' ? 'Parcial' : '',
  })));

  // Asignaturas ya superadas del curso anterior
  const prev = academicYear(new Date(t.getFullYear() - 1, t.getMonth(), 1));
  [
    ['Fundamentos de Programación', 12, 7.8, false],
    ['Cálculo', 6, 6.2, false],
    ['Álgebra Lineal', 6, 9.5, true],
    ['Estadística', 6, 5.6, false],
    ['Física', 6, 8.1, false],
  ].forEach(([name, credits, grade, honors], i) => {
    state.subjects.push(newSubject({
      name, credits, year: 1, term: i % 2 ? 'C2' : 'C1', academicYear: prev,
      color: PALETTE[(i + 4) % PALETTE.length],
      final: { grade, honors, call: 'Primera convocatoria' },
    }));
  });

  state.demo = true;
  save();
}
