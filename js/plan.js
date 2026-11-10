// =============================================================
//  plan.js — Planning diario: bloques del día, clases, huecos
//  libres y un organizador automático (sin IA, sin internet)
// =============================================================

import * as S from './store.js';
import * as St from './study.js';

export const KINDS = {
  study: { label: 'Estudio' },
  task: { label: 'Tarea' },
  break: { label: 'Descanso' },
  personal: { label: 'Personal' },
};

const P = () => S.state.plan;
const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const M = S.minutes;

/** Bloques guardados de un día (crea la lista si no existe) */
export function dayBlocks(date, create = false) {
  const days = P().days;
  if (!days[date] && create) days[date] = { blocks: [] };
  return days[date]?.blocks || [];
}

export const block = (date, id) => dayBlocks(date).find((b) => b.id === id);

export function newBlock(data = {}) {
  return { id: S.uid(), start: '', end: '', title: '', kind: 'study', subjectId: '', topicId: '', itemId: '', done: false, auto: false, ...data };
}

export function addBlock(date, data) {
  const b = newBlock(data);
  dayBlocks(date, true).push(b);
  S.save();
  return b;
}

export function removeBlock(date, id) {
  const list = dayBlocks(date);
  const i = list.findIndex((b) => b.id === id);
  if (i < 0) return null;
  const [b] = list.splice(i, 1);
  S.save();
  return { b, i, date };
}

export function restoreBlock({ b, i, date }) {
  dayBlocks(date, true).splice(i, 0, b);
  S.save();
}

/** Clases de ese día como bloques (no se guardan: salen del horario) */
export function classBlocks(date) {
  return S.classesOn(S.toDate(date)).map(({ s, slot }) => ({
    id: `class-${slot.id}`,
    start: slot.start,
    end: slot.end,
    title: s.name,
    kind: 'class',
    subjectId: s.id,
    slotType: slot.type,
    room: slot.room || (S.slotArea(slot.type) === 'practicas' ? s.roomP : s.room) || '',
    readonly: true,
  }));
}

/** Todo lo del día con hora, ordenado */
export function timeline(date) {
  const own = dayBlocks(date).filter((b) => b.start);
  return [...classBlocks(date), ...own].sort((a, b) => M(a.start) - M(b.start) || (a.kind === 'class' ? -1 : 1));
}

/** Tareas del día sin hora */
export const untimed = (date) => dayBlocks(date).filter((b) => !b.start);

/** Progreso del día (sin contar clases) */
export function progress(date) {
  const own = dayBlocks(date);
  const done = own.filter((b) => b.done).length;
  return { done, total: own.length };
}

/** Bloque en curso y el siguiente, para guiar */
export function nowAndNext(date = S.ymd()) {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const list = timeline(date).filter((b) => b.end);
  const cur = list.find((b) => M(b.start) <= m && m < M(b.end) && !b.done);
  const next = list.find((b) => M(b.start) > m && !b.done);
  return { cur, next, m };
}

/** Huecos libres de al menos `min` minutos dentro del horario del día */
export function freeSlots(date, min = 30) {
  const isToday = date === S.ymd();
  const now = new Date();
  let from = M(P().start || '09:00');
  const to = M(P().end || '22:00');
  if (isToday) {
    const n = now.getHours() * 60 + now.getMinutes();
    from = Math.max(from, Math.ceil(n / 15) * 15);
  }
  const busy = timeline(date).filter((b) => b.end).map((b) => [M(b.start), M(b.end)]).sort((a, b) => a[0] - b[0]);
  const out = [];
  let t = from;
  for (const [a, b] of busy) {
    if (a - t >= min && a > from) out.push([t, Math.min(a, to)]);
    t = Math.max(t, b);
    if (t >= to) break;
  }
  if (to - t >= min) out.push([t, to]);
  return out.filter(([a, b]) => b - a >= min);
}

// ---------- Organizador automático ----------

/**
 * Propone bloques para un día: repaso de las clases de ese día,
 * los temas que tocan según los exámenes y las entregas cercanas.
 */
function proposals(date) {
  const out = [];
  const tasks = St.todayPlan();
  for (const t of tasks) {
    const short = S.shortName(t.s);
    if (t.type === 'deliver') {
      out.push({ title: `Avanzar ${t.item.title}`, kind: 'task', subjectId: t.s.id, itemId: t.item.id, min: 60, prio: 0 });
    } else if (t.type === 'topics') {
      for (const tp of t.topics) out.push({ title: `${short}: ${tp.name}`, kind: 'study', subjectId: t.s.id, topicId: tp.id, min: 50, prio: 1 });
    } else if (t.type === 'review') {
      for (const tp of t.topics) out.push({ title: `Repasar ${short}: ${tp.name}`, kind: 'study', subjectId: t.s.id, topicId: tp.id, min: 40, prio: 2 });
    } else if (t.type === 'notopics') {
      out.push({ title: `Estudiar ${short} (examen en ${t.daysLeft} días)`, kind: 'study', subjectId: t.s.id, min: 50, prio: 1 });
    }
  }
  // Repasar lo que se ha dado en clase ese día
  const seen = new Set();
  for (const c of classBlocks(date)) {
    if (seen.has(c.subjectId)) continue;
    seen.add(c.subjectId);
    out.push({ title: `Repasar la clase de ${S.shortName(S.subject(c.subjectId))}`, kind: 'study', subjectId: c.subjectId, min: 30, prio: 3, after: M(c.end) });
  }
  return out.sort((a, b) => a.prio - b.prio);
}

/**
 * Rellena los huecos libres del día. Quita antes lo que propuso
 * la última vez y no está hecho. Devuelve los bloques añadidos.
 */
export function autoPlan(date) {
  const list = dayBlocks(date, true);
  const removed = list.filter((b) => b.auto && !b.done);
  P().days[date].blocks = list.filter((b) => !(b.auto && !b.done));

  const x = S.state.study;
  const studied = date === S.ymd() ? St.minutesOn(date) : 0;
  let budget = Math.max(60, (+x.goal || 120) + 30 - studied); // minutos de estudio a repartir
  const added = [];
  const put = (start, len, data) => {
    const b = newBlock({ ...data, start: hhmm(start), end: hhmm(start + len), auto: true });
    P().days[date].blocks.push(b);
    added.push(b);
  };

  // Comida si el hueco lo permite
  const lunch = [M('14:00'), M('15:00')];
  const slots0 = freeSlots(date, 30);
  if (slots0.some(([a, b]) => a <= lunch[0] && b >= lunch[1])
    && !dayBlocks(date).some((b) => b.start && M(b.start) < lunch[1] && M(b.end) > lunch[0])) {
    put(lunch[0], 60, { title: 'Comer', kind: 'personal' });
  }

  const queue = proposals(date);
  let blocksSince = 0;
  for (const [a, b] of freeSlots(date, 30)) {
    let t = a;
    while (queue.length && budget > 0) {
      // Elige la primera propuesta que quepa (y que no sea un repaso antes de su clase)
      const i = queue.findIndex((q) => (!q.after || t >= q.after) && t + Math.min(q.min, budget) <= b && Math.min(q.min, budget) >= 25);
      if (i < 0) break;
      const q = queue.splice(i, 1)[0];
      const len = Math.min(q.min, budget);
      put(t, len, { title: q.title, kind: q.kind, subjectId: q.subjectId, topicId: q.topicId || '', itemId: q.itemId || '' });
      t += len;
      budget -= len;
      blocksSince++;
      // Descanso después de cada bloque largo
      const brk = blocksSince % 2 === 0 ? 15 : 10;
      if (t + brk + 25 <= b && queue.length && budget > 0) {
        put(t, brk, { title: 'Descanso', kind: 'break' });
        t += brk;
      }
    }
  }
  S.save();
  return { added, removed };
}

/** Deshace el último organizado automático */
export function undoAuto(date, { added, removed }) {
  const ids = new Set(added.map((b) => b.id));
  P().days[date].blocks = dayBlocks(date).filter((b) => !ids.has(b.id)).concat(removed);
  S.save();
}

/** Aplica un plan propuesto por la IA (sustituye lo automático pendiente) */
export function applyPlan(date, blocks) {
  const list = dayBlocks(date, true);
  const removed = list.filter((b) => b.auto && !b.done);
  P().days[date].blocks = list.filter((b) => !(b.auto && !b.done));
  const added = blocks.map((b) => newBlock({ ...b, auto: true }));
  P().days[date].blocks.push(...added);
  S.save();
  return { added, removed };
}
