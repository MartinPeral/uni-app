// =============================================================
//  study.js — Estudio: temporizador pomodoro, sesiones,
//  estadísticas y plan de qué estudiar cada día
// =============================================================

import * as S from './store.js';

const st = () => S.state.study;

/** Nivel de dominio de un tema: 0 nada, 1 flojo, 2 bien, 3 dominado */
export const CONF = [
  { label: 'Sin empezar', short: 'Nada' },
  { label: 'Flojo', short: 'Flojo' },
  { label: 'Bien', short: 'Bien' },
  { label: 'Dominado', short: 'Dominado' },
];
export const confOf = (t) => (t.conf ?? (t.done ? 2 : 0));

export function setConf(t, c) {
  t.conf = Math.max(0, Math.min(3, c));
  t.done = t.conf >= 2;
  t.reviewedAt = S.ymd();
}

export const topicOf = (subjectId, topicId) =>
  S.subject(subjectId)?.topics?.find((t) => t.id === topicId) || null;

// ---------- Temporizador ----------

export const timer = () => st().timer;

/** Segundos que quedan del bloque actual */
export function remaining(now = Date.now()) {
  const t = st().timer;
  if (!t) return 0;
  if (t.pausedLeft != null) return t.pausedLeft;
  return Math.max(0, t.duration - (now - t.startedAt) / 1000);
}

/** Fracción completada (0-1) */
export function progress(now = Date.now()) {
  const t = st().timer;
  if (!t) return 0;
  return 1 - remaining(now) / t.duration;
}

export const isRunning = () => !!st().timer && st().timer.pausedLeft == null;

/** Minutos que toca ahora (estudio o descanso) */
export function nextMinutes(mode = st().next) {
  const x = st();
  if (mode === 'focus') return +x.focus || 25;
  return x.cycle > 0 && x.cycle % 4 === 0 ? +x.longBrk || 15 : +x.brk || 5;
}

export function start({ mode = st().next, subjectId = '', topicId = '' } = {}) {
  const x = st();
  x.timer = {
    mode,
    subjectId,
    topicId,
    startedAt: Date.now(),
    duration: nextMinutes(mode) * 60,
    pausedLeft: null,
  };
  S.save();
}

export function pause() {
  const t = st().timer;
  if (!t || t.pausedLeft != null) return;
  t.pausedLeft = remaining();
  S.save();
}

export function resume() {
  const t = st().timer;
  if (!t || t.pausedLeft == null) return;
  t.startedAt = Date.now() - (t.duration - t.pausedLeft) * 1000;
  t.pausedLeft = null;
  S.save();
}

/** Minutos ya estudiados en el bloque actual */
export function elapsedMinutes() {
  const t = st().timer;
  if (!t) return 0;
  return Math.floor((t.duration - remaining()) / 60);
}

/** Termina el bloque. Si es de estudio, guarda la sesión. Devuelve lo que se ha hecho */
export function finish({ minutes = null } = {}) {
  const x = st();
  const t = x.timer;
  if (!t) return null;
  let session = null;
  if (t.mode === 'focus') {
    const m = minutes ?? Math.round(t.duration / 60);
    if (m >= 1) session = logSession({ subjectId: t.subjectId, topicId: t.topicId, minutes: m, start: t.startedAt });
    x.cycle = (x.cycle || 0) + 1;
    x.next = 'break';
  } else {
    x.next = 'focus';
  }
  x.timer = null;
  S.save();
  return { mode: t.mode, session, subjectId: t.subjectId, topicId: t.topicId };
}

/** Cancela el bloque sin guardar nada */
export function cancel() {
  st().timer = null;
  S.save();
}

export function skipBreak() {
  const x = st();
  x.timer = null;
  x.next = 'focus';
  S.save();
}

// ---------- Sesiones ----------

export function logSession({ subjectId = '', topicId = '', minutes, start = Date.now(), date }) {
  const s = {
    id: S.uid(),
    subjectId,
    topicId,
    date: date || S.ymd(new Date(start)),
    start,
    minutes: Math.round(+minutes),
  };
  st().sessions.push(s);
  if (topicId) {
    const t = topicOf(subjectId, topicId);
    if (t) t.reviewedAt = s.date;
  }
  S.save();
  return s;
}

export function deleteSession(id) {
  const list = st().sessions;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const [s] = list.splice(i, 1);
  S.save();
  return { s, i };
}

export function restoreSession({ s, i }) {
  st().sessions.splice(i, 0, s);
  S.save();
}

// ---------- Estadísticas ----------

export const minutesOn = (date) =>
  st().sessions.filter((x) => x.date === date).reduce((a, x) => a + x.minutes, 0);

/** Últimos n días, con los minutos de cada asignatura */
export function lastDays(n = 7) {
  const t = new Date();
  return [...Array(n)].map((_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - (n - 1 - i));
    const date = S.ymd(d);
    const list = st().sessions.filter((x) => x.date === date);
    const bySubject = new Map();
    for (const x of list) bySubject.set(x.subjectId, (bySubject.get(x.subjectId) || 0) + x.minutes);
    return { date, d, total: list.reduce((a, x) => a + x.minutes, 0), bySubject };
  });
}

/** Días seguidos estudiando (hoy cuenta si ya has estudiado; si no, desde ayer) */
export function streak() {
  const days = new Set(st().sessions.map((x) => x.date));
  const t = new Date();
  let n = 0;
  let i = days.has(S.ymd(t)) ? 0 : 1;
  for (;; i++) {
    const d = S.ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() - i));
    if (!days.has(d)) break;
    n++;
  }
  return n;
}

/** Minutos por asignatura en los últimos n días, de más a menos */
export function bySubject(n = 7) {
  const from = S.ymd(new Date(Date.now() - (n - 1) * 864e5));
  const m = new Map();
  for (const x of st().sessions) {
    if (x.date < from) continue;
    m.set(x.subjectId, (m.get(x.subjectId) || 0) + x.minutes);
  }
  return [...m].map(([subjectId, minutes]) => ({ subjectId, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export const recentSessions = (n = 8) =>
  [...st().sessions].sort((a, b) => b.start - a.start).slice(0, n);

// ---------- Plan del día ----------

/**
 * Qué estudiar hoy: reparte los temas pendientes de cada examen
 * entre los días que quedan, y añade las entregas cercanas.
 */
export function todayPlan() {
  const tasks = [];
  const exams = S.upcoming({ kinds: ['examen'], days: 30 });
  const seen = new Set();
  for (const ex of exams) {
    const s = S.subject(ex.subjectId);
    if (!s || s.final || seen.has(s.id)) continue;
    seen.add(s.id);
    const daysLeft = S.daysUntil(ex.date);
    const topics = s.topics || [];
    if (!topics.length) {
      tasks.push({ type: 'notopics', s, exam: ex, daysLeft, urgency: daysLeft });
      continue;
    }
    const pending = topics
      .filter((t) => confOf(t) < 2)
      .sort((a, b) => confOf(a) - confOf(b) || (a.reviewedAt || '').localeCompare(b.reviewedAt || ''));
    if (!pending.length) {
      const review = [...topics]
        .filter((t) => confOf(t) < 3)
        .sort((a, b) => (a.reviewedAt || '').localeCompare(b.reviewedAt || ''))
        .slice(0, 2);
      tasks.push({ type: 'review', s, exam: ex, daysLeft, topics: review.length ? review : topics.slice(0, 1), urgency: daysLeft + 3 });
      continue;
    }
    const quota = Math.ceil(pending.length / Math.max(1, daysLeft));
    tasks.push({
      type: 'topics', s, exam: ex, daysLeft,
      topics: pending.slice(0, Math.max(1, quota)),
      pending: pending.length,
      total: topics.length,
      urgency: daysLeft - pending.length / 2,
    });
  }
  for (const it of S.upcoming({ kinds: ['practica', 'entrega'], days: 4 })) {
    const s = S.subject(it.subjectId);
    if (!s || it.done) continue;
    tasks.push({ type: 'deliver', s, item: it, daysLeft: S.daysUntil(it.date), urgency: S.daysUntil(it.date) - 1 });
  }
  return tasks.sort((a, b) => a.urgency - b.urgency);
}

// ---------- Sonido ----------

let ctx;
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* sin audio */ }
}

export function chime() {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.18);
      o.stop(now + i * 0.18 + 0.55);
    });
  } catch { /* sin audio */ }
}
