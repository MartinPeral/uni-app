# UniLog 🎓

App web instalable (PWA) para organizar la universidad: asignaturas, horario, exámenes, prácticas, entregas, métodos de evaluación y notas. Funciona sin conexión y los datos se guardan en el propio móvil.

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
│   └── store.js          Datos y cálculos (notas, expediente, horario, .ics)
└── icons/                Iconos de la app
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

Sube los cambios y cambia `CACHE = 'unilog-v1'` en `sw.js` a `v2`, `v3`… para que el móvil coja la versión nueva.

## Copias de seguridad

Los datos solo están en tu móvil. En **Hoy → ⚙️ Ajustes → Exportar** guardas un archivo con todo y lo recuperas con **Importar**.
