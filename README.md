# UniLog 🎓

App web instalable (PWA) para organizar la universidad: asignaturas, horario, exámenes, prácticas, entregas, métodos de evaluación y notas. Funciona sin conexión y los datos se guardan en el propio móvil.

## Novedades de la versión 3.1 (plan de estudio)

- **Temarios completos:** en cada asignatura (Info → Temario → *Pegar el temario entero*) pegas la lista de temas, uno por línea, y se añaden con sus horas estimadas. Tocando un tema cambias sus horas y cómo lo llevas.
- **Temas de cada examen:** al editar un examen marcas qué temas entran. Si no marcas nada, los parciales se reparten el temario en orden y los finales entran con todo.
- **Plan hasta los exámenes** (Estudio → *Plan hasta los exámenes*): eliges tus horas entre semana y en fin de semana y hasta cuándo (2 semanas, 1 mes o hasta el último examen). La app reparte los temas día a día en los huecos entre clases, con repaso general el día antes de cada examen, y te dice si llegas a cada uno. Calendario con lo que toca cada día.
- El tutor IA ve el plan y los temas de cada examen, y lo puede revisar.

## Novedades de la versión 3.0 (planning y tutor IA)

- **Planning diario** (Hoy → Tu día → Ver todo): tus clases y tus bloques de estudio, tareas, descansos y cosas personales en una línea del tiempo, con los huecos libres y la hora actual. Tareas sin hora. Desliza para marcar hecho o borrar, y para cambiar de día.
- **Organízame el día:** rellena los huecos libres con lo que más urge (entregas, temas flojos antes de cada examen, repasar las clases del día) y mete descansos. Funciona sin internet.
- **Guía en Hoy:** qué toca ahora y qué viene después, con botón para empezar el pomodoro.
- **Tutor IA:** chat que conoce tus clases, planning, exámenes, notas y temas. Te organiza el día (con un botón para añadir su plan al planning) y te dice qué hacer ahora.

### Servidor del tutor IA

Usa el mismo Cloudflare Worker gratuito que GymLog (`gymlog-ai`), ampliado para atender a las dos apps. Para activarlo:

1. Panel de Cloudflare → **Workers & Pages** → **gymlog-ai** → **Edit code**.
2. Borra todo, pega `worker/worker.js` de este repositorio y pulsa **Deploy**.
3. GymLog sigue funcionando igual; el binding **AI** no cambia.

En UniLog → Ajustes → Tutor IA → **Probar el tutor** para comprobarlo.

## Novedades de la versión 2.0

- **Gestos:** desliza una fecha a la derecha para marcarla entregada o ponerle nota, y a la izquierda para borrarla (con *Deshacer*). Mantén pulsada una asignatura o una fecha para ver su menú. Desliza el horario semanal o el calendario para cambiar de semana o de mes.
- **Teclado de notas:** al poner una nota ves al momento cómo quedaría la asignatura.
- **Asistente paso a paso** para crear asignaturas: nombre, créditos, cuatrimestre o anual, grupos, clases y evaluación (incluida la de tipo ADDA).
- **Pestaña Estudio:** temporizador pomodoro por asignatura y tema, objetivo diario y racha, plan de qué estudiar hoy según los exámenes y cómo llevas cada tema, gráfica de la semana y registro de sesiones.
- Animaciones, vibración (en iPhone con iOS 18 o posterior) y confeti al aprobar.

## Qué hace

- **Hoy:** la clase en la que estás (o la siguiente), las clases del día, cuenta atrás de los próximos exámenes, entregas pendientes y cómo vas en cada asignatura.
- **Asignaturas:** créditos, curso, cuatrimestre, grupo, aula y color. Dentro de cada una:
  - **Evaluación:** apartados con su peso (%) y nota mínima, plantillas habituales (examen final, teoría + prácticas, parciales…). Calcula tu nota actual, los puntos que llevas y **la media que necesitas en lo que queda para aprobar**. Avisa si no llegas a una nota mínima.
  - **Simulador:** escribe notas hipotéticas y mira qué te saldría, sin guardarlas.
  - **Fechas**, **Horario** semanal e **Info** (profesorado con correo y tutorías, temario para marcar lo estudiado, enlaces y apuntes rápidos).
  - **Nota del acta:** al ponerla, la asignatura pasa al expediente.
- **Agenda:** lista de lo próximo (con filtros), horario de la semana y calendario mensual. Exporta exámenes y entregas al Calendario del iPhone (.ics) con aviso el día antes.
- **Expediente:** nota media ponderada por créditos (MH = 10), créditos superados, reparto de calificaciones y notas por curso. Puedes añadir asignaturas ya aprobadas.
- Tema claro, oscuro o automático. Copia de seguridad en Ajustes.

## Estructura

```
uni-app/
├── index.html            Página principal
├── manifest.webmanifest  Datos para instalarla como app
├── sw.js                 Service worker (funciona sin internet)
├── css/styles.css        Estilos (tema claro y oscuro)
├── js/
│   ├── app.js            Pantallas, navegación y botones
│   ├── store.js          Datos y cálculos (notas, expediente, horario, .ics)
│   ├── study.js          Estudio: pomodoro, sesiones y plan del día
│   ├── plan.js           Planning diario y organizador automático
│   ├── ai.js             Tutor IA: resumen de datos y llamada al servidor
│   └── fx.js             Gestos, vibración, animaciones y confeti
├── icons/                Iconos de la app
└── worker/worker.js      Servidor de IA (Cloudflare Worker, compartido con GymLog)
```

## Cómo se calcula la nota

Cada apartado tiene un peso. Dentro de un apartado, sus evaluables hacen media (con "peso" relativo si unos valen más). Con lo que ya tienes:

- **Puntos conseguidos** = suma de (nota del evaluable × su parte del peso total).
- **Nota actual** = puntos ÷ parte evaluada (tu media hasta ahora).
- **Lo que necesitas** = (nota para aprobar − puntos) ÷ parte que queda.

## Probarla en el ordenador

Abre la carpeta en VS Code, clic derecho en `index.html` → **Open with Live Server**.

## Ponerla en el iPhone

1. En el repositorio: **Settings → Pages → Branch: main → / (root) → Save**.
2. Espera 1-2 minutos. La app estará en `https://TU-USUARIO.github.io/uni-app/`
3. Ábrela con **Safari** → Compartir → **Añadir a pantalla de inicio**.

## Actualizarla

Sube los cambios y cambia `CACHE = 'unilog-v15'` en `sw.js` a `v2`, `v3`… para que el móvil coja la versión nueva.

## Copias de seguridad

Los datos solo están en tu móvil. En **Hoy → ⚙️ Ajustes → Exportar** guardas un archivo con todo y lo recuperas con **Importar**.
