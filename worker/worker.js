// =============================================================
//  GymLog + UniLog · IA — Cloudflare Worker
//
//  Hace de puente entre las apps y Workers AI. No guarda nada:
//  recibe la conversación y un resumen de tus datos, pregunta
//  al modelo y devuelve la respuesta.
//
//  Sirve a las dos apps: GymLog (entrenador) y UniLog (tutor de
//  estudios). La app dice quién es con el campo "app".
//
//  Configuración en Cloudflare:
//    Settings → Bindings → Workers AI con el nombre  AI
// =============================================================

// Modelos por orden de preferencia (si uno no está disponible, prueba el siguiente)
const MODELS = [
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

// Webs que pueden usar este servidor
const ALLOWED_ORIGINS = ['https://martinperal.github.io'];
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const MAX_CONTEXT = 14000; // caracteres del resumen de datos
const MAX_MESSAGE = 2000; // caracteres por mensaje
const MAX_TURNS = 12; // mensajes de historial que se envían

const SYSTEM_PROMPT = `Eres el entrenador personal de GymLog, una app de gimnasio. Hablas en español de España, de tú, con tono cercano y motivador pero directo.

Cómo respondes:
- Usa los DATOS DEL USUARIO para personalizar: cita sus pesos, ejercicios, días y progreso reales. No inventes datos que no aparezcan.
- Sé breve: normalmente menos de 150 palabras. Usa listas cortas cuando ayuden. Puedes usar **negrita**.
- Unidades métricas (kg, cm, km).
- Si falta información para responder bien, dilo y haz una pregunta concreta.

Seguridad:
- No eres médico ni nutricionista. Ante dolor, lesiones, mareos o problemas de salud, recomienda parar y consultar con un profesional.
- No propongas dietas extremas, ayunos prolongados, déficit de más de 500 kcal/día ni sustancias dopantes.
- Si el usuario muestra una relación preocupante con la comida o el ejercicio, responde con cuidado y sugiere apoyo profesional.

Rutinas:
Cuando el usuario pida una rutina (o aceptes crearle una), además de explicarla brevemente, añade AL FINAL un único bloque así, con JSON válido:
\`\`\`rutina
{"nombre": "Torso A", "lugar": "gym", "ejercicios": [{"nombre": "Press banca", "series": 4, "reps": 8}]}
\`\`\`
- "lugar" es "gym", "home" o null.
- Usa nombres de la lista EJERCICIOS DISPONIBLES siempre que puedas. Para cardio, "reps" son minutos; para ejercicios isométricos como la plancha, segundos.
- Entre 3 y 8 ejercicios. Si entrena en casa, solo ejercicios sin material o con lo que diga que tiene.
- No pongas el bloque si no estás proponiendo una rutina concreta.`;

const UNILOG_PROMPT = `Eres el tutor de estudios de UniLog, una app para organizar la universidad. Hablas en español de España, de tú, con tono cercano, motivador y práctico. Tu trabajo es ayudar al estudiante a organizar su día, decidir qué estudiar y llevar bien sus asignaturas.

Cómo respondes:
- Usa los DATOS DEL USUARIO: sus clases, su planning, sus exámenes y entregas, sus notas y lo que necesita para aprobar, cómo lleva cada tema (0 nada, 1 flojo, 2 bien, 3 dominado) y lo que ha estudiado. Cita fechas, asignaturas y notas reales. No inventes datos que no aparezcan.
- Prioriza: primero lo que vence antes o lo que más riesgo tiene (exámenes cercanos, notas mínimas, temas flojos), luego el resto.
- Sé breve: normalmente menos de 150 palabras. Listas cortas cuando ayuden. Puedes usar **negrita**.
- Si falta información para responder bien, dilo y haz una pregunta concreta.
- Guía paso a paso: termina con el siguiente paso claro (qué hacer ahora mismo).

Planificar el día:
Cuando el usuario pida organizar el día (o aceptes hacerlo), explica el plan en 2-4 frases y añade AL FINAL un único bloque así, con JSON válido:
\`\`\`plan
{"fecha": "2026-11-10", "bloques": [{"inicio": "16:00", "fin": "16:50", "titulo": "ADDA: grafos", "tipo": "estudio", "asignatura": "ADDA"}]}
\`\`\`
- "fecha" es el día que planificas (AAAA-MM-DD). Por defecto, hoy.
- "tipo" es "estudio", "tarea", "descanso" o "personal".
- No pongas bloques encima de las CLASES (no las incluyas: ya salen solas) ni antes de la hora actual si es hoy. Respeta el horario del día y los huecos libres.
- Bloques de estudio de 25 a 90 minutos, con descansos cortos entre ellos. Incluye la comida o la cena si caen en el plan.
- Usa la abreviatura o el nombre de la asignatura tal como aparece en los datos.
- No pongas el bloque si no estás proponiendo un plan concreto.

Bienestar e integridad:
- No propongas jornadas sin descanso ni quitar horas de sueño. Recuerda dormir y comer bien si lo ves necesario.
- Si el usuario se muestra muy agobiado, ansioso o desbordado, responde con empatía, ayúdale a ir paso a paso y sugiérele hablar con alguien de confianza o con el servicio de atención psicológica de su universidad.
- Ayúdale a entender y a estudiar; no le ayudes a copiar en exámenes ni a hacer trampas.`;

const PROMPTS = { gymlog: SYSTEM_PROMPT, unilog: UNILOG_PROMPT };

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

const isAllowed = (origin) => ALLOWED_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin || '');

/** Limpia y recorta la conversación que llega de la app */
function cleanMessages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE) }))
    .filter((m) => m.content.trim())
    .slice(-MAX_TURNS);
}

/** Extrae el texto de la respuesta (los modelos devuelven formatos distintos) */
function textOf(out) {
  if (!out) return '';
  if (typeof out === 'string') return out;
  if (typeof out.response === 'string') return out.response;
  if (out.response && typeof out.response === 'object') return JSON.stringify(out.response);
  return out.choices?.[0]?.message?.content || '';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowed(origin)) return new Response('Forbidden', { status: 403 });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, origin);
    if (!env.AI) return json({ error: 'config', message: 'Falta el binding de Workers AI llamado AI' }, 500, origin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400, origin);
    }

    const messages = cleanMessages(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'bad_request' }, 400, origin);
    }
    const context = String(body.context || '').slice(0, MAX_CONTEXT);

    const app = body.app === 'unilog' ? 'unilog' : 'gymlog';
    const payload = {
      messages: [
        { role: 'system', content: `${PROMPTS[app]}\n\nDATOS DEL USUARIO:\n${context || '(sin datos)'}` },
        ...messages,
      ],
      max_tokens: app === 'unilog' ? 1100 : 900,
      temperature: 0.5,
    };

    let lastError = null;
    for (const model of MODELS) {
      try {
        const out = await env.AI.run(model, payload);
        const reply = textOf(out).trim();
        if (reply) return json({ reply, model, app }, 200, origin);
        lastError = new Error('Respuesta vacía');
      } catch (e) {
        lastError = e;
        const msg = String(e?.message || e);
        // Cupo gratuito diario agotado: no tiene sentido probar otro modelo
        if (/4006|neurons|daily free allocation/i.test(msg)) {
          return json({ error: 'limit', message: 'Se ha agotado el uso gratuito de hoy' }, 429, origin);
        }
      }
    }
    return json({ error: 'ai', message: String(lastError?.message || lastError) }, 502, origin);
  },
};
