// =============================================================
//  studyplan.js — Plan de estudio de varios días: reparte los
//  temas de cada examen entre los días que quedan, según las
//  horas que tienes, y lo encaja en el planning de cada día
// =============================================================

import * as S from './store.js';
import * as St from './study.js';
import * as Pl from './plan.js';

const M = S.minutes;
const DEFAULT_HOURS = 3; // horas por tema si no se dice otra cosa
const CHUNK = 50; // minutos por bloque de estudio
const FACTOR = [1, 0.6, 0.3, 0.1]; // lo que queda por estudiar según el dominio (0-3)

const L = () => {
  const p = S.state.plan;
  if (!p.long) p.long = { weekday: 3, weekend: 4, horizon: 'month', summary: null };
  return p.long;
};
export const settings = L;

export const topicHours = (t) => (Number(t.hours) > 0 ? Number(t.hours) : DEFAULT_HOURS);

// ---------- Temarios ----------

/** Convierte un temario pegado (una línea por tema) en nombres de temas */
export function parseSyllabus(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l
      .replace(/^\s*[-–—•*·>]+\s*/, '')
      .replace(/^\s*(tema|t|unidad|ud|bloque|lecci[oó]n|cap[ií]tulo)\s*\d+(\.\d+)*\s*[.:\-–)]?\s*/i, '')
      .replace(/^\s*\d+(\.\d+)*\s*[.:\-–)]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((l) => l.length >= 3)
    .map((l) => l.slice(0, 90));
}

/** Añade temas a una asignatura sin repetir. Devuelve cuántos se han añadido */
export function addTopics(s, names, hours, replace = false, area = 'teoria') {
  s.topics = s.topics || [];
  if (replace) s.topics = s.sharedTopics ? [] : s.topics.filter((t) => S.topicArea(t) !== area);
  const have = new Set(s.topics.map((t) => S.norm(t.name)));
  let n = 0;
  for (const name of names) {
    const k = S.norm(name);
    if (have.has(k)) continue;
    have.add(k);
    s.topics.push({ id: S.uid(), name, done: false, conf: 0, hours: hours || DEFAULT_HOURS, area });
    n++;
  }
  S.save();
  return n;
}

// ---------- Qué entra en cada examen ----------

export const examTopics = S.examTopics;

/** Minutos que faltan para preparar un examen (según el dominio de cada tema) */
export function examWork(exam) {
  const topics = examTopics(exam);
  const s = S.subject(exam.subjectId);
  const share = s?.sharedTopics && S.examArea(exam) === 'practicas' ? 0.5 : 1;
  const units = topics.map((t) => ({ topic: t, min: Math.round(topicHours(t) * 60 * FACTOR[St.confOf(t)] * share) }));
  return { topics, units, need: units.reduce((a, u) => a + u.min, 0) };
}

/** Exámenes que entran en el plan */
export function planExams(to) {
  return S.upcoming({ exams: true, days: 400 })
    .filter((i) => i.date <= to && !S.subject(i.subjectId)?.final);
}

export function horizonEnd(h = L().horizon) {
  const t = new Date();
  if (h === '2w') return S.ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 14));
  if (h === 'month') return S.ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 30));
  const last = S.upcoming({ exams: true, days: 150 }).pop();
  return last ? last.date : S.ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 30));
}

// ---------- Generar ----------

const addDays = (date, n) => {
  const d = S.toDate(date);
  return S.ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** Huecos de un día sin las horas de comer y cenar */
function slotsFor(date) {
  const meals = [[M('14:00'), M('15:00')], [M('21:00'), M('21:45')]];
  let out = Pl.freeSlots(date, 25);
  for (const [a, b] of meals) {
    out = out.flatMap(([x, y]) => (y <= a || x >= b ? [[x, y]] : [[x, a], [b, y]].filter(([p, q]) => q - p >= 25)));
  }
  return out;
}

/**
 * Genera el plan desde hoy hasta el final del horizonte. Sustituye lo
 * que generó la vez anterior y no está hecho. Devuelve un resumen.
 */
export function generate() {
  const cfg = L();
  const today = S.ymd();
  const to = horizonEnd(cfg.horizon);

  // Quita lo generado antes (pendiente) desde hoy
  const removed = [];
  // (también lo atrasado de días pasados: se vuelve a repartir desde hoy)
  for (const [date, day] of Object.entries(S.state.plan.days)) {
    const keep = [];
    for (const b of day.blocks || []) {
      if (b.auto === 'long' && !b.done) removed.push({ date, b });
      else keep.push(b);
    }
    day.blocks = keep;
  }

  const exams = planExams(to);
  const jobs = exams.map((ex) => {
    const w = examWork(ex);
    const s = S.subject(ex.subjectId);
    const queue = [];
    for (const u of w.units) {
      let left = u.min;
      while (left > 0) {
        const len = Math.min(CHUNK, left);
        if (len < 15 && queue.length) { queue[queue.length - 1].min += len; break; }
        queue.push({ topic: u.topic, min: Math.max(25, len) });
        left -= len;
      }
    }
    return { ex, s, need: w.need, topics: w.topics, queue, planned: 0, review: 0, reviewIdx: 0 };
  });

  const added = [];
  let days = 0;
  for (let date = today; date <= to; date = addDays(date, 1)) {
    days++;
    const wd = S.weekday(S.toDate(date));
    let cap = Math.round((wd >= 6 ? +cfg.weekend : +cfg.weekday) * 60);
    // Lo que ya tienes de estudio planificado ese día cuenta
    cap -= Pl.dayBlocks(date).filter((b) => b.kind === 'study' && b.start && b.end).reduce((a, b) => a + M(b.end) - M(b.start), 0);
    if (date === today) cap -= St.minutesOn(today);
    if (cap < 25) continue;

    const slots = slotsFor(date);
    if (!slots.length) continue;
    let si = 0;
    let t = slots[0][0];
    const place = (len, data) => {
      while (si < slots.length) {
        if (t < slots[si][0]) t = slots[si][0];
        if (t + len <= slots[si][1]) {
          const b = Pl.newBlock({ ...data, start: Pl.hhmm(t), end: Pl.hhmm(t + len), auto: 'long' });
          Pl.dayBlocks(date, true).push(b);
          added.push({ date, b });
          t += len + 10; // descanso entre bloques
          return true;
        }
        si++;
      }
      return false;
    };

    // 1. Repaso general el día antes de cada examen
    for (const j of jobs) {
      if (addDays(date, 1) !== j.ex.date || cap < 25) continue;
      const len = Math.min(90, cap);
      if (place(len, { title: `Repaso general ${S.examArea(j.ex) === 'practicas' ? 'de prácticas ' : ''}${S.shortName(j.s)} (examen mañana)`, kind: 'study', subjectId: j.s.id, examId: j.ex.id })) {
        j.planned += len;
        cap -= len;
      }
    }

    // 2. Temas pendientes: primero lo que más aprieta
    let guard = 0;
    while (cap >= 25 && guard++ < 30) {
      const open = jobs.filter((j) => j.ex.date > date && j.queue.length);
      if (!open.length) break;
      const pressure = (j) => j.queue.reduce((a, q) => a + q.min, 0) / Math.max(1, S.daysUntil(j.ex.date) - S.daysUntil(date) - 1);
      open.sort((a, b) => pressure(b) - pressure(a) || a.ex.date.localeCompare(b.ex.date));
      const j = open[0];
      const q = j.queue[0];
      const len = Math.min(q.min, cap);
      if (len < 25) break;
      const ok = place(len, {
        title: `${S.shortName(j.s)}: ${q.topic.name}`,
        kind: 'study', subjectId: j.s.id, topicId: q.topic.id, examId: j.ex.id,
      });
      if (!ok) break;
      q.min -= len;
      if (q.min < 25) j.queue.shift(); // lo que sobra es poco: se da por visto
      j.planned += len;
      cap -= len;
    }

    // 3. Si sobra tiempo: repasos cortos del examen más cercano
    // (como mucho un repaso por examen y día, y sin pasarse del 40 % de lo que necesitaba)
    const reviewed = new Set();
    guard = 0;
    while (cap >= 30 && guard++ < 4) {
      const j = jobs.filter((x) => x.ex.date > addDays(date, 1) && !x.queue.length && x.topics.length
        && !reviewed.has(x) && x.review < Math.max(60, x.need * 0.4))
        .sort((a, b) => a.ex.date.localeCompare(b.ex.date))[0];
      if (j) reviewed.add(j);
      if (!j) break;
      const tp = j.topics[j.reviewIdx++ % j.topics.length];
      if (!place(30, { title: `Repasar ${S.shortName(j.s)}: ${tp.name}`, kind: 'study', subjectId: j.s.id, topicId: tp.id, examId: j.ex.id })) break;
      j.review += 30;
      cap -= 30;
    }
  }

  const summary = jobs.map((j) => ({
    examId: j.ex.id,
    need: j.need,
    planned: j.planned,
    left: j.queue.reduce((a, q) => a + q.min, 0),
    review: j.review,
    topics: j.topics.length,
  }));
  cfg.summary = { at: Date.now(), to, days, summary, blocks: added.length };
  S.save();
  return { added, removed, summary, to };
}

// ---------- Lo que no hiciste pasa al día siguiente ----------

const DAY_MAX = 8 * 60; // como mucho 8 h de estudio planificado en un día

/** Minutos de estudio con hora que hay ya en un día */
const studyOn = (date) => Pl.dayBlocks(date)
  .filter((b) => b.kind === 'study' && b.start && b.end)
  .reduce((a, b) => a + M(b.end) - M(b.start), 0);

/**
 * Los bloques del plan de días pasados que no marcaste como hechos se
 * mueven a hoy (o a los siguientes días si hoy no caben), siempre antes
 * de su examen. Se descartan si el examen ya ha pasado o si ese tema ya
 * lo llevas bien. Devuelve { moved, dropped }.
 */
export function carryOver() {
  const today = S.ymd();
  const pending = [];
  for (const [date, day] of Object.entries(S.state.plan.days)) {
    if (date >= today) continue;
    const keep = [];
    for (const b of day.blocks || []) {
      if (b.auto === 'long' && !b.done && b.kind === 'study') pending.push({ date, b });
      else keep.push(b);
    }
    if (keep.length !== (day.blocks || []).length) day.blocks = keep;
  }
  if (!pending.length) return { moved: [], dropped: [] };

  pending.sort((a, b) => a.date.localeCompare(b.date) || (a.b.start || '').localeCompare(b.b.start || ''));
  const moved = [];
  const dropped = [];
  const used = {}; // por día: hasta qué minuto ya hemos colocado
  for (const { date, b } of pending) {
    const ex = b.examId ? S.item(b.examId) : null;
    const tp = b.topicId ? St.topicOf(b.subjectId, b.topicId) : null;
    const len = M(b.end) - M(b.start);
    const stale = !ex && S.daysUntil(date) < -7;
    if ((ex && (!ex.date || ex.date <= today)) || (tp && St.confOf(tp) >= 2) || stale || !(len > 0)) {
      dropped.push(b);
      continue;
    }
    const last = ex ? addDays(ex.date, -1) : addDays(today, 7);
    let placed = false;
    for (let d = today; d <= last && !placed; d = addDays(d, 1)) {
      if (studyOn(d) + len > DAY_MAX) continue;
      for (const [a, z] of slotsFor(d)) {
        const from = Math.max(a, used[d] || 0);
        if (from + len > z) continue;
        Object.assign(b, { start: Pl.hhmm(from), end: Pl.hhmm(from + len), carried: b.carried || date });
        Pl.dayBlocks(d, true).push(b);
        used[d] = from + len + 10;
        moved.push({ date: d, b });
        placed = true;
        break;
      }
    }
    if (!placed) dropped.push(b);
  }
  S.save();
  return { moved, dropped };
}

/** Deshace la última generación */
export function undoGenerate({ added, removed }) {
  const ids = new Set(added.map((x) => x.b.id));
  for (const day of Object.values(S.state.plan.days)) day.blocks = (day.blocks || []).filter((b) => !ids.has(b.id));
  for (const { date, b } of removed) Pl.dayBlocks(date, true).push(b);
  S.save();
}

/** Minutos de estudio planificado por día y asignatura (para el calendario) */
export function plannedByDay(from, to) {
  const out = {};
  for (const [date, day] of Object.entries(S.state.plan.days)) {
    if (date < from || date > to) continue;
    for (const b of day.blocks || []) {
      if (b.kind !== 'study' || !b.start || !b.end) continue;
      const o = out[date] || (out[date] = { total: 0, done: 0, bySubject: new Map() });
      const m = M(b.end) - M(b.start);
      o.total += m;
      if (b.done) o.done += m;
      o.bySubject.set(b.subjectId, (o.bySubject.get(b.subjectId) || 0) + m);
    }
  }
  return out;
}

/** Resumen para la IA: próximos días del plan */
export function contextLines(n = 10) {
  const lines = [];
  const today = S.ymd();
  for (let i = 0; i < n; i++) {
    const date = addDays(today, i);
    const blocks = Pl.dayBlocks(date).filter((b) => b.kind === 'study' && b.start);
    if (!blocks.length) continue;
    lines.push(`- ${date}: ${blocks.map((b) => `${b.start} ${b.title}${b.done ? ' (hecho)' : ''}`).join('; ')}`);
  }
  const sum = L().summary;
  if (sum) {
    for (const x of sum.summary) {
      const ex = S.item(x.examId);
      if (!ex) continue;
      lines.push(`- Examen "${ex.title}" de ${S.shortName(S.subject(ex.subjectId))} (${ex.date}): ${x.topics} temas, necesita ~${Math.round(x.need / 60)} h, planificadas ${Math.round(x.planned / 60)} h${x.left ? `, FALTAN ${Math.round(x.left / 60)} h sin hueco` : ''}.`);
    }
  }
  return lines;
}
