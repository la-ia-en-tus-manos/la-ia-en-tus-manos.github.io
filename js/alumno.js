import { get, post } from './api.js';
import { REFRESCO_ALUMNO_S } from './config.js';
import {
  el, vaciar, icono, pintarIconos, pildora, insignia, toast, modal, copiar, b64aBlob, descargarBlob, puedeCompartirArchivos,
  cargarInicio, errorPantalla, guardarLocal, leerLocal, borrarLocal, NOMBRE_MODO, ICONO_MODO, ICONO_PREVIA, COLOR_PREVIA
} from './ui.js';
import { abrirTapar, celebrarMedalla } from './tapar.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
let token = params.get('t') || (leerLocal('taller_token') || {}).token;
let estado = null;
let vista = { tipo: 'auto' };
let modoConfirmado = leerLocal('taller_modo_confirmado') === true;
let temporizador = null;
let cuentaAtrasTimer = null;
const imagenesCache = {};

const NOMBRE_PIEZAS = [['quien_soy', 'Quién soy', 'bl'], ['que_ha_pasado', 'Qué ha pasado', 'bl'], ['que_quiero', 'Qué quiero', 'vi'], ['reglas', 'Reglas', 'pk'], ['formato', 'Formato', 'or']];
const NOMBRE_IMAGEN = { documento: 'Tu documento', cartel: 'Tu cartel', mensaje: 'Tu mensaje sospechoso' };

async function cargar(silencioso = false) {
  if (!token) {
    vaciar(app).append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, 'Falta tu enlace personal'), el('p', { class: 'sub' }, 'Abre el enlace que recibiste por correo al inscribirte. Si no lo encuentras, vuelve a inscribirte con el mismo correo y te lo reenviamos.'), el('a', { class: 'boton', href: 'index.html' }, 'Ir a la inscripción')));
    return;
  }
  if (!silencioso) cargarInicio(app);
  try {
    estado = await get('alumno', { t: token });
    guardarLocal('taller_token', { token });
    if (params.has('t') && params.has('nuevo')) history.replaceState(null, '', `alumno.html?t=${encodeURIComponent(token)}`);
  } catch (e) {
    if (e.codigo === 404) borrarLocal('taller_token');
    return errorPantalla(app, e.message, () => cargar());
  }
  pintar();
  programarRefresco();
}

function programarRefresco() {
  clearInterval(temporizador);
  const segundos = estado.config.estado === 'taller_en_curso' ? REFRESCO_ALUMNO_S : 90;
  temporizador = setInterval(async () => {
    if (document.hidden) return;
    try {
      const nuevo = await get('alumno', { t: token });
      const cambioFase = nuevo.config.estado !== estado.config.estado || nuevo.alumno.estado !== estado.alumno.estado;
      const huella = (e) => JSON.stringify([e.progreso, e.alumno.ayuda, e.alumno.jefe, e.alumno.modo, e.config, e.encuesta_hecha]);
      const cambio = huella(nuevo) !== huella(estado);
      estado = nuevo;
      if (cambioFase) { vista = { tipo: 'auto' }; pintar(); }
      else if (!cambio) return;                       // nada nuevo: no se toca lo que el alumno está leyendo
      else if (vista.tipo === 'mapa' || vista.tipo === 'auto') pintar(true);
      else actualizarSuave();
    } catch (e) { /* siguiente intento */ }
  }, segundos * 1000);
}

function pintar(conservar = false) {
  clearInterval(cuentaAtrasTimer);
  // En un refresco automático se conservan los desplegables abiertos y la posición de la página.
  const abiertos = conservar ? [...app.querySelectorAll('details[open]')].map((d) => d.querySelector('summary')?.textContent) : [];
  const scrollY = window.scrollY;
  vaciar(app);
  if (conservar) queueMicrotask(() => {
    app.querySelectorAll('details').forEach((d) => { if (abiertos.includes(d.querySelector('summary')?.textContent)) d.open = true; });
    window.scrollTo(0, scrollY);
  });
  app.className = 'pagina';
  document.body.className = '';
  const a = estado.alumno;
  const fase = estado.config.estado;
  if (a.estado === 'cancelado') return pintarCancelado();
  if (a.estado === 'espera') return pintarEspera();
  if (fase === 'taller_en_curso') {
    if (!modoConfirmado && vista.tipo === 'auto') return pintarConfirmarModo();
    return pintarTaller();
  }
  if (fase === 'terminado') return pintarCierre();
  return pintarPrevio();
}

function cabeceraAlumno() {
  const a = estado.alumno;
  return el('div', { class: 'cabecera-alumno' },
    el('div', {}, el('p', { class: 'sub', style: 'margin:0' }, `Hola, ${a.nombre.split(' ')[0]}`), el('h1', { style: 'font-size:1.5rem' }, estado.config.nombre_taller)),
    el('div', { class: 'numero-explorador', style: 'text-align:right' }, 'Explorador', el('b', {}, `n.º ${a.numero}`))
  );
}

/* ───────────── Antes del taller ───────────── */

function pintarPrevio() {
  document.body.className = 'fondo-intro';
  const cfg = estado.config;
  const a = estado.alumno;
  app.append(cabeceraAlumno());
  if (params.has('nuevo')) app.append(el('div', { class: 'aviso ok' }, el('strong', {}, '¡Tienes plaza! '), 'Te hemos enviado este enlace por correo. Guárdalo: lo necesitarás el día del taller.'));

  const fecha = el('div', { class: 'tarjeta tinte' });
  if (cfg.fecha) {
    fecha.append(pildora('Cuenta atrás'), el('h2', {}, cfg.fecha_legible));
    const cuenta = el('div', { class: 'cuenta' });
    fecha.append(cuenta);
    const objetivo = new Date(`${cfg.fecha}T${cfg.hora_inicio || '00:00'}:00`);
    const tic = () => {
      const ms = objetivo - Date.now();
      if (ms <= 0) { vaciar(cuenta).append(el('p', { class: 'grande', style: 'text-align:center;width:100%' }, '¡Es hoy! El profesor abrirá el taller desde la sala.')); return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      vaciar(cuenta).append(...[[d, 'días'], [h, 'horas'], [m, 'min'], [s, 'seg']].map(([n, t]) => el('div', {}, el('b', {}, String(n).padStart(2, '0')), el('small', {}, t))));
    };
    tic();
    cuentaAtrasTimer = setInterval(tic, 1000);
    if (cfg.lugar) fecha.append(el('p', {}, el('strong', {}, 'Dónde: '), cfg.lugar, cfg.direccion ? `, ${cfg.direccion}` : '', cfg.mapa_url ? [' · ', el('a', { href: cfg.mapa_url, target: '_blank', rel: 'noopener' }, 'ver mapa')] : null));
    fecha.append(el('div', { class: 'botones' }, el('button', { class: 'boton secundario', onclick: descargarIcs }, icono('LuCalendarPlus'), 'Añadir al calendario')));
  } else {
    fecha.append(pildora('Fecha'), el('h2', {}, 'Fecha por confirmar'), el('p', { class: 'sub' }, 'Te avisaremos por correo en cuanto la tengamos.'));
  }
  app.append(fecha);

  if (cfg.mensaje_espera) app.append(el('div', { class: 'aviso c-ye' }, el('strong', {}, 'Mensaje del profesor: '), cfg.mensaje_espera));

  app.append(el('div', { class: 'tarjeta candado c-vi' }, insignia('LuLock', 'vi', 'grande'), el('h2', {}, 'Tu caso se abrirá el día del taller'), el('p', { class: 'sub' }, cfg.pista_caso)));

  app.append(seccionPrevias());

  const extras = el('div', { class: 'tarjeta' }, el('h2', {}, 'Tu inscripción'),
    el('p', {}, el('strong', {}, 'Vendrás con: '), NOMBRE_MODO[a.modo], ' · ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); elegirModo(); } }, 'cambiar')),
    cfg.whatsapp_url ? el('p', {}, el('a', { class: 'boton secundario c-gr', href: cfg.whatsapp_url, target: '_blank', rel: 'noopener' }, icono('LuMessageCircle'), 'Entrar en el grupo de WhatsApp')) : null,
    el('p', { class: 'apagado' }, 'Abre este mismo enlace en el portátil si vas a traerlo: tu progreso se verá igual en los dos.'),
    el('button', { class: 'boton fantasma peque', onclick: cancelarPlaza }, 'No puedo ir: cancelar mi plaza')
  );
  app.append(extras);
  pintarIconos(app);
}

function seccionPrevias() {
  const previas = estado.misiones_previas;
  const hechas = estado.progreso.previas;
  const faltan = previas.filter((p) => !hechas.includes(p.id));
  const caja = el('div', { class: 'tarjeta' });
  caja.append(pildora(`Preparación · ${previas.length - faltan.length} de ${previas.length}`), el('h2', {}, 'Misiones previas'), el('p', { class: 'sub' }, 'Cúmplelas en casa. Así el día del taller vamos directos a jugar.'));
  caja.append(el('div', { class: 'barra' }, el('div', { style: `width:${Math.round(100 * (previas.length - faltan.length) / previas.length)}%` })));
  caja.append(el('p', { class: faltan.length ? 'apagado' : 'acento' }, faltan.length ? `Te falta: ${faltan.map((p) => p.titulo.toLowerCase()).join(', ')}.` : '¡Todo listo! Nos vemos en el taller.'));
  previas.forEach((p, i) => {
    const hecho = hechas.includes(p.id);
    const marca = el('button', { class: `marca ${hecho ? 'hecho' : ''}`, 'aria-label': hecho ? 'Desmarcar' : 'Marcar como hecha', 'aria-pressed': hecho ? 'true' : 'false' }, icono('LuCheck'));
    const fila = el('div', { class: `item ${hecho ? 'hecho' : ''}` }, insignia(ICONO_PREVIA[p.id] || 'LuCircle', COLOR_PREVIA[p.id] || 'cy'),
      el('div', { class: 'texto' }, el('strong', {}, `${i + 1}. ${p.titulo}`), el('span', {}, p.texto)), marca);
    const alternar = async () => {
      try {
        estado.progreso = await post('previa', { t: token, id: p.id, hecho: !hecho });
        pintar(true);
        if (!hecho) toast('Misión previa cumplida');
      } catch (e) { toast(e.message, 'error'); }
    };
    marca.addEventListener('click', alternar);
    fila.addEventListener('click', (e) => { if (e.target === fila || fila.querySelector('.texto').contains(e.target)) alternar(); });
    caja.append(fila);
  });
  return caja;
}

function descargarIcs() {
  const cfg = estado.config;
  const inicio = `${cfg.fecha.replace(/-/g, '')}T${(cfg.hora_inicio || '10:00').replace(':', '')}00`;
  const fin = new Date(`${cfg.fecha}T${cfg.hora_inicio || '10:00'}:00`);
  fin.setMinutes(fin.getMinutes() + (parseInt(cfg.duracion_min, 10) || 240));
  const p = (n) => String(n).padStart(2, '0');
  const finStr = `${fin.getFullYear()}${p(fin.getMonth() + 1)}${p(fin.getDate())}T${p(fin.getHours())}${p(fin.getMinutes())}00`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taller IA//ES', 'BEGIN:VEVENT', `UID:${token.slice(0, 12)}@taller-ia`,
    `DTSTART;TZID=Europe/Madrid:${inicio}`, `DTEND;TZID=Europe/Madrid:${finStr}`, `SUMMARY:${cfg.nombre_taller} · Taller ${cfg.numero_taller}`,
    `LOCATION:${[cfg.lugar, cfg.direccion].filter(Boolean).join(', ')}`, `DESCRIPTION:Tu enlace personal: ${location.href.split('&')[0]}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  descargarBlob(new Blob([ics], { type: 'text/calendar' }), 'taller-ia.ics');
}

function elegirModo(alConfirmar) {
  const actual = estado.alumno.modo;
  const opciones = el('div', { class: 'opciones' }, ...['ambos', 'portatil', 'movil'].map((m) =>
    el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'modo', value: m, checked: m === actual }), icono(ICONO_MODO[m]), el('span', {}, el('strong', {}, NOMBRE_MODO[m]), el('small', {}, estado.config.modos[m])))));
  const { cerrar } = modal([el('h2', {}, '¿Con qué vas a hacer el taller?'), opciones,
    el('button', { class: 'boton bloque', onclick: async () => {
      const m = opciones.querySelector('input:checked').value;
      try {
        if (m !== actual) { await post('modo', { t: token, modo: m }); estado.alumno.modo = m; estado = await get('alumno', { t: token }); }
        cerrar();
        if (alConfirmar) alConfirmar(); else pintar();
      } catch (e) { toast(e.message, 'error'); }
    } }, 'Guardar')], { sinCerrar: !!alConfirmar });
}

async function cancelarPlaza() {
  const { cerrar } = modal([el('h2', {}, '¿Seguro que cancelas tu plaza?'), el('p', { class: 'sub' }, 'Tu sitio pasará a la primera persona de la lista de espera. Si cambias de idea tendrás que volver a inscribirte.'),
    el('button', { class: 'boton peligro bloque', onclick: async () => {
      try { await post('cancelar', { t: token }); borrarLocal('taller_token'); cerrar(); await cargar(); } catch (e) { toast(e.message, 'error'); }
    } }, 'Sí, cancelar mi plaza')], { textoCerrar: 'No, me la quedo' });
}

function pintarEspera() {
  document.body.className = 'fondo-intro';
  const a = estado.alumno;
  app.append(pildora('Lista de espera', 'ye'), el('h1', {}, `Hola, ${a.nombre.split(' ')[0]}`),
    el('div', { class: 'tarjeta tinte c-ye' }, el('h2', {}, `Eres el n.º ${a.posicion_espera} de la lista de espera`), el('p', { class: 'sub' }, 'Si alguien deja su plaza, subirás automáticamente y te avisaremos por correo. Esta página también se actualizará sola.')),
    estado.config.fecha ? el('p', {}, el('strong', {}, 'Cuándo: '), estado.config.fecha_legible) : null,
    el('button', { class: 'boton fantasma peque', onclick: cancelarPlaza }, 'Salir de la lista de espera'));
  pintarIconos(app);
}

function pintarCancelado() {
  app.append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, 'Tu plaza está cancelada'), el('p', { class: 'sub' }, 'Si quieres volver, inscríbete de nuevo con el mismo correo.'), el('a', { class: 'boton', href: 'index.html' }, 'Ir a la inscripción')));
}

/* ───────────── Día del taller ───────────── */

function pintarConfirmarModo() {
  document.body.className = 'fondo-cover';
  const a = estado.alumno;
  const opciones = el('div', { class: 'opciones' }, ...['ambos', 'portatil', 'movil'].map((m) =>
    el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'modo', value: m, checked: m === a.modo }), icono(ICONO_MODO[m]), el('span', {}, el('strong', {}, NOMBRE_MODO[m]), el('small', {}, estado.config.modos[m])))));
  app.append(cabeceraAlumno(), el('div', { class: 'tarjeta tinte' }, pildora('¡Empieza el taller!'), el('h2', {}, '¿Con qué estás hoy?'), el('p', { class: 'sub' }, 'Los pasos de cada misión se adaptan a lo que tengas delante.'), opciones,
    el('button', { class: 'boton grande bloque', style: 'margin-top:14px', onclick: async () => {
      const m = opciones.querySelector('input:checked').value;
      try {
        if (m !== a.modo) { await post('modo', { t: token, modo: m }); estado = await get('alumno', { t: token }); }
        modoConfirmado = true;
        guardarLocal('taller_modo_confirmado', true);
        vista = { tipo: 'mapa' };
        pintar();
      } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuPlay'), 'Abrir mi caso')));
  pintarIconos(app);
}

function pasosDe(mision) {
  const modo = estado.alumno.modo;
  return mision.pasos[modo] || mision.pasos.todos || [];
}

function pintarTaller() {
  document.body.className = '';
  const c = estado.contenido;
  if (!c || !c.kit) {
    app.append(cabeceraAlumno(), el('div', { class: 'aviso atencion' }, 'Tu caso aún no está disponible. Avisa al profesor.'));
    return pintarIconos(app);
  }
  if (estado.alumno.modo === 'ambos') app.classList.add('modo-ambos');
  if (vista.tipo === 'mision') return pintarMision(vista.id);
  vista = { tipo: 'mapa' };
  const k = c.kit;
  const prog = estado.progreso;
  app.append(cabeceraAlumno());
  app.append(el('p', { class: 'apagado' }, icono(ICONO_MODO[estado.alumno.modo]), ' ', NOMBRE_MODO[estado.alumno.modo], ' · ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); elegirModo(); } }, 'cambiar')));

  app.append(el('div', { class: 'tarjeta tinte c-cy' }, pildora('Tu personaje'),
    el('h2', {}, k.personaje.nombre), el('p', { class: 'sub' }, `${k.personaje.edad} años · ${k.personaje.oficio} · ${k.personaje.ciudad}`),
    el('p', { class: 'grande' }, k.personaje.problema),
    el('details', {}, el('summary', { style: 'cursor:pointer;font-weight:700;color:var(--cy)' }, 'Lo que tú sabes'),
      el('ul', { style: 'padding-left:20px' }, ...k.lo_que_sabes.map((s) => el('li', {}, s))),
      el('p', { class: 'apagado' }, 'Tus datos ficticios: DNI ', k.datos_ficticios.dni, ' · ', k.datos_ficticios.domicilio, Object.entries(k.datos_ficticios.otros || {}).map(([a, b]) => ` · ${a}: ${b}`).join('')),
      el('p', { class: 'apagado' }, c.aviso))));

  app.append(seccionMedallas());

  const mapa = el('div', { class: 'tarjeta' }, pildora(`Misiones · ${prog.misiones.length} de ${c.misiones.length - 1} sellos`), el('h2', {}, 'Mapa del día'));
  const lista = el('div', { class: 'mapa' });
  c.misiones.forEach((m) => {
    const cumplida = m.id === 'JEFE' ? estado.alumno.jefe : prog.misiones.includes(m.id);
    lista.append(el('button', { class: `mision-tarjeta c-${m.color} ${cumplida ? 'cumplida' : ''}`, onclick: () => { vista = { tipo: 'mision', id: m.id }; pintar(); window.scrollTo(0, 0); } },
      insignia(m.icono, m.color, 'peque'), el('span', { class: 'codigo' }, m.id === 'JEFE' ? '★' : m.id),
      el('span', { class: 'texto' }, el('strong', {}, m.titulo), el('span', {}, `${m.min} min · ${m.objetivo}`)),
      el('span', { class: 'sello' }, cumplida ? icono('LuCheck') : '')));
  });
  mapa.append(lista);
  app.append(mapa);

  if (prog.misiones.includes('M8')) {
    app.append(el('div', { class: 'tarjeta c-vi' }, pildora('Misiones extra', 'vi'), el('h2', {}, '¿Te sobra tiempo?'),
      ...c.misiones_extra.map((m) => tarjetaPrompt(m.titulo, m.prompt, 'vi'))));
  }
  app.append(barraAyuda());
  pintarIconos(app);
}

function seccionMedallas() {
  const c = estado.contenido;
  const ganadas = estado.progreso.medallas;
  const caja = el('div', { class: 'tarjeta' }, pildora('Medallas secretas', 'ye'), el('h2', {}, 'Tres medallas por descubrir'),
    el('p', { class: 'sub' }, 'Nadie sabe cómo se ganan hasta el final. Si el profesor te dice una palabra secreta, escríbela aquí.'));
  const rejilla = el('div', { class: 'medallas' }, ...c.medallas.map((m) => {
    const g = ganadas.includes(m.id);
    return el('div', { class: `medalla c-${m.color} ${g ? 'ganada' : ''}`, dataset: { medalla: m.id } }, el('div', { class: 'circulo' }, g ? icono(m.icono) : '?'), el('b', {}, g ? m.nombre : '???'), g && m.premiaba ? el('small', {}, m.premiaba) : null);
  }));
  const form = el('form', { class: 'botones', style: 'align-items:stretch' });
  const input = el('input', { type: 'text', placeholder: 'Palabra secreta', autocomplete: 'off', autocapitalize: 'none', style: 'flex:1;min-width:160px' });
  form.append(input, el('button', { class: 'boton secundario c-ye', type: 'submit' }, icono('LuSparkles'), 'Probar'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const palabra = input.value.trim();
    if (!palabra) return;
    try {
      const r = await post('medalla', { t: token, palabra });
      input.value = '';
      medallaGanada(r.medalla, r.progreso);
    } catch (err) { toast(err.message, 'error'); }
  });
  caja.append(rejilla, form);
  return caja;
}

function medallaGanada(medalla, progreso) {
  estado.progreso = progreso;
  estado.contenido.medallas = estado.contenido.medallas.map((m) => (m.id === medalla.id ? medalla : m));
  celebrarMedalla(medalla, () => {
    pintar(true);
    const nodo = app.querySelector(`[data-medalla="${medalla.id}"]`);
    if (nodo) nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function barraAyuda() {
  const activa = estado.alumno.ayuda;
  return el('div', { class: 'barra-inferior' },
    el('button', { class: `boton ${activa ? 'secundario' : ''} c-rd`, onclick: async () => {
      try {
        const r = await post('ayuda', { t: token, activa: !activa });
        estado.alumno.ayuda = r.ayuda;
        toast(r.ayuda ? 'El profesor ya sabe que necesitas ayuda. Ahora va' : 'Aviso retirado');
        pintar(true);
      } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuHand'), activa ? 'Ayuda pedida · cancelar' : '¡AYUDA!'));
}

function tarjetaPrompt(titulo, texto, color) {
  return el('div', { class: `prompt c-${color}` },
    el('div', { class: 'cabecera' }, el('b', {}, titulo), el('button', { class: 'boton peque secundario', onclick: () => copiar(texto) }, icono('LuCopy'), 'Copiar')),
    el('div', { class: 'cuerpo' }, texto));
}

function pintarMision(id) {
  const c = estado.contenido;
  const m = c.misiones.find((x) => x.id === id);
  const k = c.kit;
  const idx = c.misiones.indexOf(m);
  const cumplida = m.id === 'JEFE' ? estado.alumno.jefe : estado.progreso.misiones.includes(m.id);
  app.classList.add(`c-${m.color}`);
  app.append(el('div', { class: 'botones' }, el('button', { class: 'boton fantasma peque', onclick: () => { vista = { tipo: 'mapa' }; pintar(); } }, icono('LuArrowLeft'), 'Mapa del día'),
    el('span', { class: 'apagado', style: 'margin-left:auto;align-self:center' }, `Explorador n.º ${estado.alumno.numero}`)));
  app.append(el('div', { class: 'tarjeta fila tinte' }, insignia(m.icono, m.color, 'grande'),
    el('div', {}, pildora(m.id === 'JEFE' ? `Jefe final · ${m.min} min` : `Misión ${m.id.slice(1)} · ${m.min} min`, m.color), el('h1', { style: 'font-size:1.7rem' }, m.titulo), el('p', { class: 'sub' }, m.objetivo))));

  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Pasos'), el('ol', { class: 'pasos' }, ...pasosDe(m).map((p) => el('li', {}, p)))));

  if (m.imagen) app.append(seccionImagen(m.imagen, m.color));

  if (m.prompts && m.prompts.length) {
    const caja = el('div', { class: 'tarjeta' }, el('h2', {}, m.prompts.length > 1 ? 'Tus prompts' : 'Tu prompt'), el('p', { class: 'apagado' }, estado.alumno.modo === 'ambos' ? 'Léelo en el portátil y díctaselo a Gemini con el micrófono del móvil.' : 'Toca «Copiar» y pégalo en Gemini.'));
    m.prompts.forEach((pid) => {
      if (pid === 'M3-B' && k.prompts['M3-B_piezas']) {
        caja.append(el('h3', { style: 'margin-top:14px' }, 'M3-B · el prompt bueno, en sus cinco piezas'));
        const piezas = el('div', { class: 'piezas' }, ...NOMBRE_PIEZAS.map(([clave, nombre, color], i) =>
          el('div', { class: `pieza c-${color}` }, el('div', { class: 'num' }, `0${i + 1}`), el('div', { class: 'nombre' }, nombre), el('div', { class: 'txt' }, k.prompts['M3-B_piezas'][clave]))));
        caja.append(piezas, tarjetaPrompt('M3-B · completo para copiar', k.prompts['M3-B'], m.color));
      } else {
        caja.append(tarjetaPrompt(pid === 'M3-A' ? 'M3-A · el prompt flojo' : pid, k.prompts[pid], m.color));
      }
    });
    app.append(caja);
  }

  const cierre = el('div', { class: 'tarjeta tinte' }, pildora('Misión cumplida cuando…', m.color), el('p', { class: 'grande' }, m.cumplida));
  if (m.id === 'JEFE') {
    if (cumplida) cierre.append(el('div', { class: 'aviso ok' }, el('strong', {}, '¡Jefe final superado! '), 'El profesor ha validado tu reto.'));
    else {
      const f = el('form', { class: 'botones', style: 'align-items:stretch' });
      const inp = el('input', { type: 'text', placeholder: 'Código del profesor', autocomplete: 'off', autocapitalize: 'none', style: 'flex:1;min-width:160px' });
      f.append(inp, el('button', { class: 'boton c-ye', type: 'submit' }, icono('LuCrown'), 'Validar'));
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await post('jefe', { t: token, codigo: inp.value }); estado.alumno.jefe = true; toast('¡Jefe final superado!'); pintar(); } catch (err) { toast(err.message, 'error'); }
      });
      cierre.append(el('p', { class: 'apagado' }, 'Enséñale tu reto al profesor: él lo valida desde su panel o te dice un código.'), f);
    }
  } else {
    cierre.append(el('button', { class: `boton grande bloque ${cumplida ? 'secundario' : ''} c-gr`, onclick: async () => {
      try {
        estado.progreso = await post('mision', { t: token, id: m.id, cumplida: !cumplida });
        if (!cumplida) {
          toast('¡Sello conseguido!');
          const siguiente = c.misiones[idx + 1];
          vista = siguiente ? { tipo: 'mapa' } : { tipo: 'mapa' };
        }
        pintar();
        window.scrollTo(0, 0);
      } catch (e) { toast(e.message, 'error'); }
    } }, icono(cumplida ? 'LuUndo2' : 'LuStamp'), cumplida ? 'Misión cumplida · desmarcar' : '¡Misión cumplida!'));
  }
  app.append(cierre);

  const nav = el('div', { class: 'botones' });
  if (idx > 0) nav.append(el('button', { class: 'boton fantasma', onclick: () => { vista = { tipo: 'mision', id: c.misiones[idx - 1].id }; pintar(); window.scrollTo(0, 0); } }, icono('LuChevronLeft'), c.misiones[idx - 1].id));
  if (idx < c.misiones.length - 1) nav.append(el('button', { class: 'boton fantasma', style: 'margin-left:auto', onclick: () => { vista = { tipo: 'mision', id: c.misiones[idx + 1].id }; pintar(); window.scrollTo(0, 0); } }, c.misiones[idx + 1].id, icono('LuChevronRight')));
  app.append(nav, barraAyuda());
  pintarIconos(app);
}

function seccionImagen(tipo, color) {
  const k = estado.contenido.kit;
  const info = tipo === 'documento' ? k.documento : tipo === 'cartel' ? k.cartel_m4 : k.mensaje_m8;
  const caja = el('div', { class: 'tarjeta imagen-mision' }, el('h2', {}, NOMBRE_IMAGEN[tipo]));
  const marco = el('div', {}, el('p', { class: 'apagado' }, 'Cargando la imagen…'));
  caja.append(marco);
  const botones = el('div', { class: 'botones' });
  caja.append(botones);
  if (tipo === 'documento') caja.append(el('p', { class: 'apagado' }, `${info.emisor.join(' · ')} — ${info.tipo}`));
  if (tipo === 'mensaje') caja.append(el('p', { class: 'apagado' }, `${info.canal} · de ${info.de}`));

  const zonas = tipo === 'documento' ? (k.zonas_guardian || []) : [];
  const nombre = `kit${estado.alumno.numero}_${tipo}.png`;

  const mostrar = (blob, tapada) => {
    const url = URL.createObjectURL(blob);
    const img = el('img', { src: url, alt: NOMBRE_IMAGEN[tipo], onclick: () => modal(el('img', { src: url, alt: NOMBRE_IMAGEN[tipo], style: 'width:100%;border-radius:12px' }), { ancho: true }) });
    vaciar(marco).append(img, el('p', { class: 'apagado', style: 'margin-top:6px' }, tapada ? 'Esta es tu versión retocada: es la que se envía y se descarga.' : 'Toca la imagen para verla a pantalla completa.'));
    vaciar(botones);
    const archivo = new File([blob], nombre, { type: 'image/png' });
    if (zonas.length) {
      // Discreto a propósito: cómo se gana la medalla Guardián no se explica.
      botones.append(el('button', { class: 'boton fantasma', onclick: () => tapar(blob) }, icono('LuPenLine'), 'Rotulador'));
    }
    const movil = /Android|iPhone|iPad/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
    const nota = (texto) => botones.append(el('p', { class: 'apagado', style: 'width:100%;margin:4px 0 0' }, texto));
    if (movil && puedeCompartirArchivos() && navigator.canShare({ files: [archivo] })) {
      // En el móvil: la hoja de compartir del sistema; el alumno elige Gemini en la lista.
      botones.append(el('button', { class: `boton c-${color}`, onclick: async () => {
        try { await navigator.share({ files: [archivo], title: NOMBRE_IMAGEN[tipo] }); } catch (e) { if (e.name !== 'AbortError') toast('No se ha podido compartir. Usa «Descargar imagen»', 'error'); }
      } }, icono('LuShare2'), 'Compartir con Gemini'));
      botones.append(el('button', { class: 'boton secundario', onclick: () => descargarBlob(blob, nombre) }, icono('LuDownload'), 'Descargar imagen'));
      nota('En la lista que se abre, elige Gemini. Si no aparece, descárgala y súbela en Gemini con el botón +.');
    } else {
      // En el portátil: al portapapeles y pegar en el chat (Ctrl+V), o descargar y arrastrar.
      const puedeCopiar = !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
      if (puedeCopiar) {
        botones.append(el('button', { class: `boton c-${color}`, onclick: async () => {
          try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Imagen copiada. En Gemini, pégala en el chat con Ctrl+V'); }
          catch (e) { toast('No se ha podido copiar. Descárgala y arrástrala a Gemini', 'error'); }
        } }, icono('LuClipboardCopy'), 'Copiar imagen'));
      }
      botones.append(el('a', { class: 'boton secundario', href: 'https://gemini.google.com/app', target: '_blank', rel: 'noopener' }, icono('LuExternalLink'), 'Abrir Gemini'));
      botones.append(el('button', { class: 'boton secundario', onclick: () => descargarBlob(blob, nombre) }, icono('LuDownload'), 'Descargar imagen'));
      nota(puedeCopiar ? 'Copia la imagen, abre Gemini y pégala en el chat con Ctrl+V. O descárgala y arrástrala al chat.' : 'Descárgala y arrástrala al chat de Gemini, o súbela con el botón +.');
    }
    pintarIconos(caja);
  };

  const tapar = async (blobActual) => {
    const original = imagenesCache[tipo];
    const r = await abrirTapar(original, zonas, { titulo: 'Rotulador' });
    if (!r) return;
    imagenesCache[`${tipo}_tapada`] = r.blob;
    mostrar(r.blob, true);
    if (estado.progreso.medallas.includes('guardian')) return;
    try {
      const res = await post('guardian', { t: token, cobertura: r.cobertura });
      if (res.ganada) medallaGanada(res.medalla, res.progreso);
      // Si no se ha ganado, silencio: avisar de lo que falta desvelaría la medalla.
    } catch (e) { toast(e.message, 'error'); }
  };

  cargarImagen(tipo).then(() => {
    const tapada = imagenesCache[`${tipo}_tapada`];
    mostrar(tapada || imagenesCache[tipo], !!tapada);
  }).catch((e) => { vaciar(marco).append(el('div', { class: 'aviso error' }, e.message)); });
  return caja;
}

async function cargarImagen(tipo) {
  if (imagenesCache[tipo]) return imagenesCache[tipo];
  const r = await get('imagen', { t: token, tipo });
  imagenesCache[tipo] = b64aBlob(r.b64, r.mime);
  return imagenesCache[tipo];
}

function actualizarSuave() {
  // Durante una misión no se repinta entero (se perdería lo que el alumno está leyendo): solo medallas y ayuda.
  const boton = app.querySelector('.barra-inferior');
  if (boton) boton.replaceWith(barraAyuda());
  pintarIconos(app);
}

/* ───────────── Cierre ───────────── */

function pintarCierre() {
  document.body.className = 'fondo-close';
  const c = estado.contenido;
  const a = estado.alumno;
  app.append(cabeceraAlumno(), pildora('Se desvela el secreto', 'ye'), el('h1', {}, 'Las tres medallas secretas'));
  if (c && c.medallas) {
    app.append(el('div', { class: 'medallas' }, ...c.medallas.map((m) => {
      const g = estado.progreso.medallas.includes(m.id);
      return el('div', { class: `medalla c-${m.color} ${g ? 'ganada' : ''}` }, el('div', { class: 'circulo' }, icono(m.icono)), el('b', {}, m.nombre), el('small', {}, m.premiaba || ''), g ? el('small', { class: 'acento' }, el('br'), '¡La tuya!') : null);
    })));
  }
  app.append(el('div', { class: 'tarjeta tinte c-gr' }, el('h2', {}, 'Tu día'),
    el('p', {}, `${estado.progreso.misiones.length} sellos · ${estado.progreso.medallas.length} medallas · jefe final ${a.jefe ? 'superado' : 'pendiente'}`)));

  if (estado.encuesta_hecha) {
    app.append(el('div', { class: 'aviso ok' }, el('strong', {}, '¡Gracias! '), 'Tu certificado saldrá a nombre de ', el('strong', {}, a.nombre_certificado || a.nombre), '.'));
  } else {
    app.append(formularioCierre());
  }
  if (c && c.kit) {
    app.append(el('div', { class: 'tarjeta' }, el('details', {}, el('summary', { style: 'cursor:pointer' }, el('h2', { style: 'display:inline' }, 'Tus prompts, para volver a usarlos')),
      el('p', { class: 'apagado', style: 'margin-top:10px' }, 'Sustituye los datos de tu personaje por los tuyos, y recuerda el escudo: nada de DNI ni cuentas.'),
      ...Object.entries(c.kit.prompts).filter(([k]) => k !== 'M3-B_piezas').map(([k, v]) => tarjetaPrompt(k, v, 'cy')))));
  }
  pintarIconos(app);
}

function formularioCierre() {
  const a = estado.alumno;
  const c = estado.contenido;
  const f = el('form', { class: 'tarjeta', novalidate: true });
  const escala = el('div', { class: 'opciones', style: 'grid-template-columns:repeat(5,1fr)' }, ...[1, 2, 3, 4, 5].map((n) =>
    el('label', { class: 'opcion', style: 'justify-content:center' }, el('input', { type: 'radio', name: 'seguridad', value: n }), el('strong', { style: 'font-size:1.4rem' }, n))));
  const utiles = el('select', { name: 'mision_util' }, el('option', { value: '' }, 'Elige una'), ...(c ? c.misiones : []).map((m) => el('option', { value: m.id }, `${m.id === 'JEFE' ? '★' : m.id} · ${m.titulo}`)));
  f.append(el('h2', {}, 'Antes de irte'),
    el('label', { class: 'campo' }, el('span', {}, 'Nombre para el certificado'), el('input', { type: 'text', name: 'nombre_certificado', value: a.nombre_certificado || a.nombre, required: true }), el('span', { class: 'ayuda' }, 'Revísalo: así saldrá impreso.')),
    el('div', { class: 'campo' }, el('span', { style: 'display:block;font-weight:600;margin-bottom:6px' }, '¿Cómo de seguro te sientes ahora usando IA? (1 = nada, 5 = mucho)'), escala),
    el('label', { class: 'campo' }, el('span', {}, '¿Qué misión te ha resultado más útil?'), utiles),
    el('label', { class: 'campo' }, el('span', {}, '¿Qué mejorarías?'), el('textarea', { name: 'mejorar', placeholder: 'Lo que quieras contarnos' })),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'aviso_t2', checked: a.avisos }), el('span', {}, 'Avísame cuando haya Taller 2.')),
    el('button', { class: 'boton grande bloque c-gr', type: 'submit' }, icono('LuCheck'), 'Enviar'));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f).entries());
    if (!d.seguridad) return toast('Dinos de 1 a 5 cómo de seguro te sientes', 'error');
    try {
      await post('cierre', { t: token, nombre_certificado: d.nombre_certificado, seguridad: d.seguridad, mision_util: d.mision_util, mejorar: d.mejorar, aviso_t2: !!d.aviso_t2 });
      estado = await get('alumno', { t: token });
      pintar();
      toast('¡Gracias! Hasta el próximo taller');
    } catch (err) { toast(err.message, 'error'); }
  });
  return f;
}

cargar();
