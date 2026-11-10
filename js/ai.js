// =============================================================
//  ai.js — Tutor IA: resumen de tus datos, llamada al servidor
//  (el mismo Cloudflare Worker que GymLog) y formato de respuestas
// =============================================================

import * as S from './store.js';
import * as St from './study.js';
import * as Pl from './plan.js';
import * as SP from './studyplan.js';

/** Servidor por defecto: el de GymLog, que atiende a las dos apps */
export const DEFAULT_AI_URL = 'https://gymlog-ai.martinperal10.workers.dev';
export const aiUrl = () => (S.state.settings.aiUrl || DEFAULT_AI_URL).trim();

const n = (v, d = 2) => (v == null ? '—' : Number(v).toLocaleString('es-ES', { maximumFractionDigits: d }));
const fd = (str, o = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('es-ES', o).format(S.toDate(str));

const STATUS = {
  nodata: 'sin método de evaluación',
  start: 'aún sin notas',
  ontrack: 'va bien',
  hard: 'le cuesta',
  secured: 'aprobado asegurado',
  impossible: 'no llega por continua',
  passed: 'aprobada',
  failed: 'suspensa',
  retake: 'tiene que recuperar una prueba',
  reqpending: 'le falta un requisito',
};

/** Resumen compacto de los datos para el modelo. Solo se envía al preguntar. */
export function buildContext() {
  const st = S.state;
  const L = [];
  const now = new Date();
  const today = S.ymd();
  L.push(`FECHA Y HORA: ${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(now)} (hoy = ${today}).`);
  L.push(`ESTUDIANTE: ${st.settings.name || 'sin nombre'}, ${st.settings.degree}, ${st.settings.university}. Curso ${S.academicYear()}, ${S.TERMS[S.currentTerm()]}. Aprueba con ${n(st.settings.passMark)}.`);
  L.push(`HORARIO DEL DÍA PARA PLANIFICAR: de ${st.plan.start} a ${st.plan.end}.`);

  // Hoy: clases y planning
  const tl = Pl.timeline(today);
  L.push(tl.length ? 'PLANNING DE HOY (clases fijas y bloques):' : 'PLANNING DE HOY: vacío.');
  for (const b of tl) {
    const s = S.subject(b.subjectId);
    L.push(`- ${b.start}-${b.end} ${b.kind === 'class' ? `CLASE ${b.slotType || ''} de ${s?.name || b.title}${b.room ? ` (${b.room})` : ''}` : `[${Pl.KINDS[b.kind]?.label || b.kind}] ${b.title}${b.done ? ' (hecho)' : ''}`}`);
  }
  const un = Pl.untimed(today);
  if (un.length) L.push(`TAREAS DE HOY SIN HORA: ${un.map((b) => `${b.title}${b.done ? ' (hecha)' : ''}`).join('; ')}.`);
  const free = Pl.freeSlots(today, 30);
  if (free.length) L.push(`HUECOS LIBRES HOY: ${free.map(([a, b]) => `${Pl.hhmm(a)}-${Pl.hhmm(b)}`).join(', ')}.`);

  // Mañana
  const tmr = S.ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const ctm = Pl.classBlocks(tmr);
  L.push(`CLASES DE MAÑANA: ${ctm.length ? ctm.map((b) => `${b.start}-${b.end} ${S.shortName(S.subject(b.subjectId))} (${b.slotType})`).join(', ') : 'ninguna'}.`);

  // Fechas próximas
  const up = S.upcoming({ days: 60 });
  if (up.length) {
    L.push('PRÓXIMAS FECHAS (60 días):');
    up.slice(0, 18).forEach((i) => {
      const s = S.subject(i.subjectId);
      L.push(`- ${fd(i.date)} (en ${S.daysUntil(i.date)} días): ${S.KINDS[i.kind].label} "${i.title}" de ${s?.name}${i.time ? ` a las ${i.time}` : ''}${i.min != null && i.min !== '' ? `, mínimo ${n(i.min)}` : ''}`);
    });
  } else {
    L.push('PRÓXIMAS FECHAS: ninguna registrada.');
  }
  const late = S.overdue();
  if (late.length) L.push(`SIN ENTREGAR Y FUERA DE PLAZO: ${late.map((i) => `${i.title} (${S.shortName(S.subject(i.subjectId))})`).join(', ')}.`);

  // Asignaturas en curso
  const active = S.activeSubjects();
  if (active.length) L.push('ASIGNATURAS EN CURSO:');
  for (const s of active) {
    const c = S.calc(s);
    const bits = [
      `${s.name}${s.short ? ` (${s.short})` : ''}: ${n(s.credits, 1)} ECTS, ${S.TERMS[s.term]}`,
      `nota actual ${n(c.current)}`,
      `${n(c.doneW * 100, 0)} % evaluado`,
      STATUS[c.status] || c.status,
      c.need != null && c.need > 0 && c.status !== 'start' ? `necesita ${n(c.need)} de media en lo que queda` : '',
    ].filter(Boolean);
    L.push(`- ${bits.join(', ')}.`);
    const parts = c.parts.map((p) => `${p.comp.name} ${p.comp.req ? 'requisito' : p.optional ? 'opcional' : `${n(p.comp.weight)} %`}${p.min != null ? ` mín ${n(p.comp.points ? p.comp.min : p.min)}${p.comp.points ? ` sobre ${n(p.comp.weight / 10)}` : ''}` : ''}: ${p.avg == null ? 'sin nota' : n(p.avg)}`);
    if (parts.length) L.push(`  Evaluación: ${parts.join('; ')}.`);
    const topics = s.topics || [];
    if (topics.length) L.push(`  Temas (dominio 0-3): ${topics.map((t) => `${t.name} ${St.confOf(t)}`).join(', ')}.`);
  }
  const closed = S.record();
  if (closed.passed.length) L.push(`EXPEDIENTE: media ${n(closed.weighted)}, ${n(closed.credits, 1)} de ${closed.total} ECTS aprobados.`);

  // Plan de estudio de los próximos días
  const sp = SP.contextLines(10);
  if (sp.length) {
    L.push('PLAN DE ESTUDIO (próximos días y exámenes):');
    L.push(...sp);
  }
  // Temas que entran en cada examen próximo
  for (const ex of S.upcoming({ exams: true, days: 60 }).slice(0, 6)) {
    const ts = SP.examTopics(ex);
    if (ts.length) L.push(`TEMAS DE "${ex.title}" (${S.shortName(S.subject(ex.subjectId))}): ${ts.map((t) => `${t.name} [dominio ${St.confOf(t)}, ~${SP.topicHours(t)} h]`).join(', ')}.`);
  }

  // Estudio
  const x = st.study;
  const week = St.lastDays(7).reduce((a, d) => a + d.total, 0);
  L.push(`ESTUDIO: hoy ${St.minutesOn(today)} de ${x.goal} min de objetivo; últimos 7 días ${week} min; racha ${St.streak()} días; pomodoro de ${x.focus} min.`);
  const bySub = St.bySubject(7);
  if (bySub.length) L.push(`MINUTOS POR ASIGNATURA (7 días): ${bySub.map((y) => `${S.shortName(S.subject(y.subjectId)) || 'general'} ${y.minutes}`).join(', ')}.`);
  if (St.timer()) L.push(`AHORA MISMO: tiene un bloque de ${St.timer().mode === 'focus' ? 'estudio' : 'descanso'} en marcha.`);
  return L.join('\n');
}

/** Pregunta al tutor. Devuelve el texto o lanza un error legible. */
export async function askTutor(messages) {
  const url = aiUrl();
  if (!url) throw new Error('Configura primero la dirección del servidor en Ajustes.');
  if (!navigator.onLine) throw new Error('Sin conexión. El tutor necesita internet.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'unilog',
        context: buildContext(),
        messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? 'El tutor tarda demasiado en responder. Prueba otra vez.'
      : 'No se pudo conectar con el servidor. Revisa la dirección en Ajustes.');
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try { data = await res.json(); } catch { /* respuesta no JSON */ }
  if (res.status === 429) throw new Error('Se ha agotado el uso gratuito de hoy. Mañana vuelve a funcionar.');
  if (res.status === 403) throw new Error('El servidor no acepta peticiones desde esta dirección.');
  if (!res.ok || !data?.reply) throw new Error(data?.message ? `Error del servidor: ${data.message}` : 'El servidor no ha devuelto una respuesta válida.');
  // El servidor antiguo solo sabe de gimnasio: hay que actualizarlo
  if (data.app !== 'unilog') {
    const e = new Error('Tu servidor de Cloudflare todavía tiene la versión de GymLog. Actualízalo (los pasos están en Ajustes → Tutor IA) y vuelve a probar.');
    e.outdated = true;
    throw e;
  }
  return data.reply;
}

// ---------- Planes propuestos por la IA ----------

const PLAN_RE = /```\s*plan\s*\n?([\s\S]*?)```/i;
const KIND_MAP = { estudio: 'study', study: 'study', tarea: 'task', task: 'task', descanso: 'break', break: 'break', personal: 'personal', comida: 'personal', ocio: 'personal' };
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Busca una asignatura por nombre o abreviatura */
function findSubject(name = '') {
  const q = S.norm(name);
  if (!q) return null;
  const list = S.activeSubjects();
  return list.find((s) => S.norm(s.short) === q || S.norm(s.name) === q)
    || list.find((s) => S.norm(s.name).includes(q) || q.includes(S.norm(S.shortName(s))))
    || null;
}

/**
 * Separa el plan del texto.
 * Devuelve { text, plan } con plan = { date, blocks } o null.
 */
export function splitPlan(reply) {
  const m = reply.match(PLAN_RE);
  if (!m) return { text: reply, plan: null };
  const text = reply.replace(PLAN_RE, '').trim();
  try {
    const raw = JSON.parse(m[1].trim());
    const list = raw.bloques || raw.blocks || (Array.isArray(raw) ? raw : []);
    const pad = (t) => t.padStart(5, '0');
    const blocks = list
      .map((b) => {
        const start = String(b.inicio || b.start || '').trim();
        const end = String(b.fin || b.end || '').trim();
        if (!TIME.test(start) || !TIME.test(end) || S.minutes(end) <= S.minutes(start)) return null;
        const s = findSubject(b.asignatura || b.subject || '');
        return {
          start: pad(start),
          end: pad(end),
          title: String(b.titulo || b.title || 'Bloque').trim().slice(0, 80),
          kind: KIND_MAP[S.norm(b.tipo || b.kind || '')] || 'study',
          subjectId: s?.id || '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => S.minutes(a.start) - S.minutes(b.start))
      .slice(0, 16);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha || raw.date || '') ? (raw.fecha || raw.date) : S.ymd();
    if (!blocks.length) return { text: text || reply, plan: null };
    return { text, plan: { date, blocks } };
  } catch {
    return { text: text || reply, plan: null };
  }
}

// ---------- Formato de las respuestas (markdown sencillo y seguro) ----------

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function renderMarkdown(md) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) {
      flushPara(); closeList();
      out.push(`<h4>${inline(m[1])}</h4>`);
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      para.push(line.trim());
    }
  }
  flushPara();
  closeList();
  return out.join('');
}
