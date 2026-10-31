import { get, post, aplicarColorTaller, verEstado } from './api.js';
import { REFRESCO_ALUMNO_S } from './config.js';
import { t, setIdioma, idiomaActual, IDIOMAS } from './i18n.js';
import {
  el, vaciar, icono, pintarIconos, pildora, insignia, toast, modal, copiar, b64aBlob, descargarBlob, puedeCompartirArchivos,
  cargarInicio, errorPantalla, guardarLocal, leerLocal, borrarLocal, ventanaChat, burbuja, horaCorta, ICONO_MODO, ICONO_PREVIA, COLOR_PREVIA
} from './ui.js';
import { abrirTapar, celebrarMedalla, confeti } from './tapar.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
let token = params.get('t') || (leerLocal('taller_token') || {}).token;
let estado = null;
let vista = { tipo: 'auto' };
let modoConfirmado = leerLocal('taller_modo_confirmado') === true;
let temporizador = null;
let cuentaAtrasTimer = null;
const imagenesCache = {};

const PIEZAS = [['quien_soy', 'cy'], ['que_ha_pasado', 'bl'], ['que_quiero', 'vi'], ['reglas', 'pk'], ['formato', 'ye']];
const nombreModo = (m) => t(`modo_${m}`);
const nombreImagen = (tipo, archivo) => (archivo && archivo.titulo) || t(`img_${tipo}`);
const txtCopiar = () => ({ ok: t('copiado'), error: t('no_copiado') });

async function cargar(silencioso = false) {
  if (!token) {
    vaciar(app).append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, t('falta_enlace')), el('p', { class: 'sub' }, t('falta_enlace_txt')), el('a', { class: 'boton', href: 'index.html' }, t('ir_inscripcion'))));
    return;
  }
  if (!silencioso) cargarInicio(app, t('cargando'));
  try {
    estado = await get('alumno', { t: token });
    if (!estado.alumno.demo) guardarLocal('taller_token', { token, taller: estado.config.taller_id });
    if (params.has('t') && params.has('nuevo')) history.replaceState(null, '', `alumno.html?t=${encodeURIComponent(token)}`);
  } catch (e) {
    if (e.codigo === 404) borrarLocal('taller_token');
    if (e.codigo === 410) {
      // Enlace de una edición anterior: el alumno tiene que inscribirse en la nueva.
      borrarLocal('taller_token');
      vaciar(app).append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, t('otra_edicion')), el('p', { class: 'sub' }, e.message), el('a', { class: 'boton', href: 'index.html' }, t('ir_inscripcion'))));
      return;
    }
    return errorPantalla(app, e.message, () => cargar(), { titulo: t('algo_mal'), reintentar: t('reintentar') });
  }
  // El idioma manda desde el servidor: es el que eligió al inscribirse (o cambió después).
  setIdioma(estado.alumno.idioma);
  document.title = `${t('titulo_1')}${t('titulo_2')}`;
  pintar();
  celebrarPendientes();
  programarRefresco();
}

let guardando = 0;               // peticiones de progreso en vuelo: el refresco no las pisa

function programarRefresco() {
  clearInterval(temporizador);
  const segundos = estado.config.estado === 'taller_en_curso' ? REFRESCO_ALUMNO_S : 90;
  temporizador = setInterval(async () => {
    if (document.hidden || guardando) return;
    try {
      const nuevo = await get('alumno', { t: token });
      if (guardando) return;
      const jefeNuevo = !estado.alumno.jefe && nuevo.alumno.jefe && nuevo.config.estado === 'taller_en_curso';
      const cambioFase = nuevo.config.estado !== estado.config.estado || nuevo.alumno.estado !== estado.alumno.estado;
      const huella = (e) => JSON.stringify([e.progreso, e.alumno.ayuda, e.alumno.jefe, e.alumno.modo, e.alumno.idioma, e.config, e.encuesta_hecha]);
      const cambio = huella(nuevo) !== huella(estado);
      const mensajesAntes = estado.mensajes || [];
      estado = nuevo;
      setIdioma(estado.alumno.idioma);
      if (!cambioFase) mensajesNuevos(mensajesAntes);
      if (cambioFase) { vista = { tipo: 'auto' }; pintar(); }
      else if (!cambio) return;                       // nada nuevo: no se toca lo que el alumno está leyendo
      else if (vista.tipo === 'mapa' || vista.tipo === 'auto') pintar(true);
      else actualizarSuave();
      celebrarPendientes();
      if (jefeNuevo) { confeti(); toast(t('jefe_superado') + t('jefe_validado')); }
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
  aplicarColorTaller(estado.config.color);
  document.title = estado.config.nombre_taller || document.title;
  const a = estado.alumno;
  const fase = estado.config.estado;
  if (a.estado === 'cancelado') return pintarCancelado();
  if (a.estado === 'espera') return pintarEspera();
  if (fase === 'taller_en_curso') {
    if (!modoConfirmado && vista.tipo === 'auto') return pintarConfirmarModo();
    return pintarTaller();
  }
  if (fase === 'terminado') return vista.tipo === 'repaso' ? pintarMision(vista.id, true) : pintarCierre();
  return pintarPrevio();
}

function cabeceraAlumno() {
  const a = estado.alumno;
  return el('div', { class: 'cabecera-alumno' },
    el('div', {}, el('p', { class: 'sub', style: 'margin:0' }, t('hola', { nombre: a.nombre.split(' ')[0] })), el('h1', { style: 'font-size:1.5rem' }, estado.config.nombre_taller)),
    el('div', { class: 'numero-explorador', style: 'text-align:right' }, a.demo ? el('span', { class: 'chip c-vi' }, 'DEMO') : (estado.config.nivel || t('explorador')), el('b', {}, t('numero', { n: a.numero })))
  );
}

/* ───────────── Antes del taller ───────────── */

function pintarPrevio() {
  document.body.className = 'fondo-intro';
  const cfg = estado.config;
  const a = estado.alumno;
  app.append(cabeceraAlumno());
  if (params.has('nuevo')) app.append(el('div', { class: 'aviso ok' }, el('strong', {}, t('tienes_plaza')), t('guarda_enlace')));

  const fecha = el('div', { class: 'tarjeta tinte' });
  if (cfg.fecha) {
    fecha.append(pildora(t('cuenta_atras')), el('h2', {}, cfg.fecha_legible));
    const cuenta = el('div', { class: 'cuenta' });
    fecha.append(cuenta);
    const objetivo = new Date(`${cfg.fecha}T${cfg.hora_inicio || '00:00'}:00`);
    const tic = () => {
      const ms = objetivo - Date.now();
      if (ms <= 0) { vaciar(cuenta).append(el('p', { class: 'grande', style: 'text-align:center;width:100%' }, t('es_hoy'))); return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      vaciar(cuenta).append(...[[d, t('dias')], [h, t('horas')], [m, t('min')], [s, t('seg')]].map(([n, txt]) => el('div', {}, el('b', {}, String(n).padStart(2, '0')), el('small', {}, txt))));
    };
    tic();
    cuentaAtrasTimer = setInterval(tic, 1000);
    if (cfg.lugar) fecha.append(el('p', {}, el('strong', {}, t('donde')), cfg.lugar, cfg.direccion ? `, ${cfg.direccion}` : '', cfg.mapa_url ? [' · ', el('a', { href: cfg.mapa_url, target: '_blank', rel: 'noopener' }, t('ver_mapa'))] : null));
    fecha.append(el('div', { class: 'botones' }, el('button', { class: 'boton secundario', onclick: descargarIcs }, icono('LuCalendarPlus'), t('anadir_calendario'))));
  } else {
    fecha.append(pildora(t('fecha')), el('h2', {}, t('fecha_por_confirmar_t')), el('p', { class: 'sub' }, t('avisaremos')));
  }
  app.append(fecha);

  if (cfg.mensaje_espera) app.append(el('div', { class: 'aviso c-ye' }, el('strong', {}, t('mensaje_profesor')), cfg.mensaje_espera));

  app.append(el('div', { class: 'tarjeta candado c-vi' }, insignia('LuLock', 'vi', 'grande'), el('h2', {}, t('caso_bloqueado')), el('p', { class: 'sub' }, cfg.pista_caso)));

  // Primero cómo entrar en Gemini (hay quien no tiene cuenta): las previas vienen después.
  app.append(seccionGemini());
  app.append(seccionPrevias());

  const extras = el('div', { class: 'tarjeta' }, el('h2', {}, t('tu_inscripcion')),
    el('p', {}, el('strong', {}, t('vendras_con')), nombreModo(a.modo), ' · ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); elegirModo(); } }, t('cambiar'))),
    (cfg.idiomas || []).length > 1 ? el('p', {}, el('strong', {}, t('idioma')), IDIOMAS[a.idioma] || a.idioma, ' · ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); elegirIdioma(); } }, t('cambiar'))) : null,
    cfg.whatsapp_url ? el('p', {}, el('a', { class: 'boton secundario c-gr', href: cfg.whatsapp_url, target: '_blank', rel: 'noopener' }, icono('LuMessageCircle'), t('grupo_whatsapp'))) : null,
    botonReunion(),
    el('p', { class: 'apagado' }, t('abre_portatil')),
    el('button', { class: 'boton fantasma peque', onclick: cancelarPlaza }, t('cancelar_plaza'))
  );
  app.append(extras);
  app.append(enlaceMisDatos());
  pintarIconos(app);
}

function seccionPrevias() {
  const previas = estado.misiones_previas;
  const hechas = estado.progreso.previas;
  const faltan = previas.filter((p) => !hechas.includes(p.id));
  const caja = el('div', { class: 'tarjeta' });
  caja.append(pildora(t('preparacion', { hechas: previas.length - faltan.length, total: previas.length })), el('h2', {}, t('previas')), el('p', { class: 'sub' }, t('previas_txt')));
  if (faltan.length) caja.append(el('div', { class: 'aviso atencion' }, icono('LuInfo', 'inline'), ' ', t('previas_aviso')));
  caja.append(el('div', { class: 'barra' }, el('div', { style: `width:${Math.round(100 * (previas.length - faltan.length) / previas.length)}%` })));
  caja.append(el('p', { class: faltan.length ? 'apagado' : 'acento' }, faltan.length ? t('te_falta', { lista: faltan.map((p) => p.titulo.toLowerCase()).join(', ') }) : t('todo_listo')));
  previas.forEach((p, i) => {
    const hecho = hechas.includes(p.id);
    const marca = el('button', { class: `marca ${hecho ? 'hecho' : ''}`, 'aria-label': hecho ? t('desmarcar') : t('marcar'), 'aria-pressed': hecho ? 'true' : 'false' }, icono('LuCheck'));
    const fila = el('div', { class: `item ${hecho ? 'hecho' : ''}` }, insignia(ICONO_PREVIA[p.id] || 'LuCircle', COLOR_PREVIA[p.id] || 'cy'),
      el('div', { class: 'texto' }, el('strong', {}, `${i + 1}. ${p.titulo}`), el('span', {}, p.texto)), marca);
    const alternar = async () => {
      // Se pinta al instante y se guarda detrás: la hoja de Google tarda unos segundos en contestar.
      const antes = estado.progreso.previas.slice();
      estado.progreso.previas = hecho ? antes.filter((id) => id !== p.id) : antes.concat(p.id);
      pintar(true);
      if (!hecho) toast(t('previa_cumplida'));
      guardando++;
      try {
        const prog = await post('previa', { t: token, id: p.id, hecho: !hecho });
        estado.progreso.misiones = prog.misiones; estado.progreso.medallas = prog.medallas;
      } catch (e) {
        estado.progreso.previas = antes;
        pintar(true);
        toast(e.message, 'error');
      } finally { guardando--; }
    };
    marca.addEventListener('click', alternar);
    fila.addEventListener('click', (e) => { if (e.target === fila || fila.querySelector('.texto').contains(e.target)) alternar(); });
    caja.append(fila);
  });
  return caja;
}

// Cómo crear la cuenta de Google y abrir Gemini, para quien nunca lo ha usado.
function seccionGemini() {
  const enlace = (href, texto) => el('a', { href, target: '_blank', rel: 'noopener' }, texto);
  return el('div', { class: 'tarjeta c-bl' }, pildora('Gemini', 'bl'), el('h2', {}, t('gemini_titulo')), el('p', { class: 'sub' }, t('gemini_intro')),
    el('ol', { class: 'pasos' },
      el('li', {}, el('span', {}, el('strong', {}, t('gemini_sin_cuenta_1')), enlace('https://accounts.google.com/signup', t('gemini_sin_cuenta_2')), t('gemini_sin_cuenta_3'))),
      el('li', {}, el('span', {}, el('strong', {}, t('gemini_con_cuenta_1')), enlace('https://gemini.google.com', 'gemini.google.com'), t('gemini_con_cuenta_2'))),
      el('li', {}, el('span', {}, el('strong', {}, t('gemini_app_1')), enlace('https://play.google.com/store/apps/details?id=com.google.android.apps.bard', t('gemini_app_android')), t('gemini_app_o'), enlace('https://apps.apple.com/app/google-gemini/id6477489729', t('gemini_app_ios')), t('gemini_app_2')))),
    el('div', { class: 'botones' },
      el('a', { class: 'boton c-bl', href: 'https://gemini.google.com', target: '_blank', rel: 'noopener' }, icono('LuSparkles'), t('abrir_gemini')),
      el('a', { class: 'boton secundario c-bl', href: 'https://accounts.google.com/signup', target: '_blank', rel: 'noopener' }, icono('LuUserPlus'), t('crear_cuenta'))));
}

function descargarIcs() {
  const cfg = estado.config;
  const inicio = `${cfg.fecha.replace(/-/g, '')}T${(cfg.hora_inicio || '10:00').replace(':', '')}00`;
  const fin = new Date(`${cfg.fecha}T${cfg.hora_inicio || '10:00'}:00`);
  fin.setMinutes(fin.getMinutes() + (parseInt(cfg.duracion_min, 10) || 240));
  const p = (n) => String(n).padStart(2, '0');
  const finStr = `${fin.getFullYear()}${p(fin.getMonth() + 1)}${p(fin.getDate())}T${p(fin.getHours())}${p(fin.getMinutes())}00`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taller IA//ES', 'BEGIN:VEVENT', `UID:${token.slice(0, 12)}@taller-ia`,
    `DTSTART;TZID=Europe/Madrid:${inicio}`, `DTEND;TZID=Europe/Madrid:${finStr}`, `SUMMARY:${cfg.nombre_taller} · ${cfg.numero_taller}`,
    `LOCATION:${[cfg.lugar, cfg.direccion].filter(Boolean).join(', ')}`, `DESCRIPTION:${location.href.split('&')[0]}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  descargarBlob(new Blob([ics], { type: 'text/calendar' }), 'taller-ia.ics');
}

function opcionesModo(actual) {
  return el('div', { class: 'opciones' }, ...['ambos', 'portatil', 'movil'].map((m) =>
    el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'modo', value: m, checked: m === actual }), icono(ICONO_MODO[m]), el('span', {}, el('strong', {}, nombreModo(m)), el('small', {}, estado.config.modos[m])))));
}

function elegirModo(alConfirmar) {
  const actual = estado.alumno.modo;
  const opciones = opcionesModo(actual);
  const { cerrar } = modal([el('h2', {}, t('con_que_taller')), opciones,
    el('button', { class: 'boton bloque', onclick: async () => {
      const m = opciones.querySelector('input:checked').value;
      try {
        if (m !== actual) { await post('modo', { t: token, modo: m }); estado.alumno.modo = m; estado = await get('alumno', { t: token }); }
        cerrar();
        if (alConfirmar) alConfirmar(); else pintar();
      } catch (e) { toast(e.message, 'error'); }
    } }, t('guardar'))], { sinCerrar: !!alConfirmar, textoCerrar: t('cerrar') });
}

function elegirIdioma() {
  const actual = estado.alumno.idioma;
  const opciones = el('div', { class: 'opciones' }, ...(estado.config.idiomas || ['es']).map((id) =>
    el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'idioma', value: id, checked: id === actual }), icono('LuGlobe'), el('span', {}, el('strong', {}, IDIOMAS[id] || id)))));
  const { cerrar } = modal([el('h2', {}, t('elegir_idioma')), opciones,
    el('button', { class: 'boton bloque', onclick: async () => {
      const id = opciones.querySelector('input:checked').value;
      try {
        if (id !== actual) { await post('idioma', { t: token, idioma: id }); setIdioma(id); estado = await get('alumno', { t: token }); }
        cerrar();
        pintar();
      } catch (e) { toast(e.message, 'error'); }
    } }, t('guardar'))], { textoCerrar: t('cerrar') });
}

async function cancelarPlaza() {
  const { cerrar } = modal([el('h2', {}, t('seguro_cancelar')), el('p', { class: 'sub' }, t('cancelar_txt')),
    el('button', { class: 'boton peligro bloque', onclick: async () => {
      try { await post('cancelar', { t: token }); borrarLocal('taller_token'); cerrar(); await cargar(); } catch (e) { toast(e.message, 'error'); }
    } }, t('si_cancelar'))], { textoCerrar: t('no_me_quedo') });
}

function pintarEspera() {
  document.body.className = 'fondo-intro';
  const a = estado.alumno;
  app.append(pildora(t('lista_espera'), 'ye'), el('h1', {}, t('hola', { nombre: a.nombre.split(' ')[0] })),
    el('div', { class: 'tarjeta tinte c-ye' }, el('h2', {}, t('posicion_espera', { n: a.posicion_espera })), el('p', { class: 'sub' }, t('espera_sube'))),
    el('p', {}, el('strong', {}, t('cuando')), estado.config.fecha ? estado.config.fecha_legible : t('fecha_por_confirmar')),
    el('button', { class: 'boton fantasma peque', onclick: cancelarPlaza }, t('salir_espera')));
  pintarIconos(app);
}

function pintarCancelado() {
  app.append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, t('plaza_cancelada')), el('p', { class: 'sub' }, t('plaza_cancelada_txt')), el('a', { class: 'boton', href: 'index.html' }, t('ir_inscripcion'))));
}

/* ───────────── Día del taller ───────────── */

function pintarConfirmarModo() {
  document.body.className = 'fondo-cover';
  const a = estado.alumno;
  const opciones = opcionesModo(a.modo);
  app.append(cabeceraAlumno(), el('div', { class: 'tarjeta tinte' }, pildora(t('empieza')), el('h2', {}, t('con_que_hoy')), el('p', { class: 'sub' }, t('pasos_adaptan')), opciones,
    el('button', { class: 'boton grande bloque', style: 'margin-top:14px', onclick: async () => {
      const m = opciones.querySelector('input:checked').value;
      try {
        if (m !== a.modo) { await post('modo', { t: token, modo: m }); estado = await get('alumno', { t: token }); }
        modoConfirmado = true;
        guardarLocal('taller_modo_confirmado', true);
        vista = { tipo: 'mapa' };
        pintar();
      } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuPlay'), t('abrir_caso'))));
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
    app.append(cabeceraAlumno(), el('div', { class: 'aviso atencion' }, t('caso_no_disponible')));
    return pintarIconos(app);
  }
  if (estado.alumno.modo === 'ambos') app.classList.add('modo-ambos');
  if (vista.tipo === 'mision') return pintarMision(vista.id);
  vista = { tipo: 'mapa' };
  const k = c.kit;
  const prog = estado.progreso;
  app.append(cabeceraAlumno());
  app.append(el('p', { class: 'apagado' }, icono(ICONO_MODO[estado.alumno.modo]), ' ', nombreModo(estado.alumno.modo), ' · ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); elegirModo(); } }, t('cambiar'))));

  const reunion = botonReunion();
  if (reunion) app.append(reunion);
  app.append(tarjetaPersonaje());

  app.append(seccionMedallas());

  const mapa = el('div', { class: 'tarjeta' }, pildora(t('misiones_sellos', { hechas: prog.misiones.length, total: c.misiones.length - 1 })), el('h2', {}, t('mapa_dia')));
  const lista = el('div', { class: 'mapa' });
  c.misiones.forEach((m) => {
    const cumplida = m.id === 'JEFE' ? estado.alumno.jefe : prog.misiones.includes(m.id);
    lista.append(botonMision(m, cumplida, () => { vista = { tipo: 'mision', id: m.id }; pintar(); window.scrollTo(0, 0); }));
  });
  mapa.append(lista);
  app.append(mapa);

  // Cierre desde el mapa: con todas las misiones hechas, la encuesta ya está aquí,
  // sin esperar a que el profesor ponga el taller en «Terminado». El diploma se abre entonces.
  // Todas las misiones con sello (el jefe final no basta por sí solo): si se quita un sello, el cierre desaparece.
  const todas = c.misiones.filter((m) => m.id !== 'JEFE').every((m) => prog.misiones.includes(m.id));
  if (estado.encuesta_hecha) {
    app.append(el('div', { class: 'aviso ok' }, el('strong', {}, t('gracias')), t('certificado_nombre'), el('strong', {}, estado.alumno.nombre_certificado || estado.alumno.nombre), '. ', t('diploma_al_terminar')));
  } else if (todas) {
    app.append(el('div', { class: 'tarjeta tinte c-gr' }, pildora(t('has_terminado'), 'gr'), el('h2', {}, t('cierre_titulo')), el('p', { class: 'sub' }, t('cierre_mapa_txt'))));
    app.append(formularioCierre());
  }

  if (prog.misiones.includes('M8')) {
    app.append(el('div', { class: 'tarjeta c-vi' }, pildora(t('extra'), 'vi'), el('h2', {}, t('sobra_tiempo')),
      ...c.misiones_extra.map((m) => tarjetaPrompt(m.titulo, m.prompt, 'vi'))));
  }
  app.append(barraAyuda());
  pintarIconos(app);
}

function enlaceMisDatos() {
  if (estado.alumno.demo) return el('span');
  return el('p', { style: 'text-align:center;margin:20px 0' }, el('a', { href: `datos.html?t=${encodeURIComponent(token)}`, class: 'apagado' }, icono('LuShieldCheck', 'inline'), ' ', t('mis_datos')));
}

// Taller online: enlace de la videollamada, solo para quien tiene plaza (o el demo del profesor).
function botonReunion() {
  const url = estado.config.reunion_url;
  if (!url || !['plaza', 'demo'].includes(estado.alumno.estado)) return null;
  return el('div', { class: 'tarjeta tinte c-gr' }, el('p', { class: 'sub', style: 'margin:0 0 10px' }, t('reunion_txt')),
    el('a', { class: 'boton grande bloque c-gr', href: url, target: '_blank', rel: 'noopener' }, icono('LuVideo'), t('reunion_boton')));
}

function tarjetaPersonaje() {
  const c = estado.contenido;
  const k = c.kit;
  return el('div', { class: 'tarjeta tinte c-cy' }, pildora(t('tu_personaje')),
    el('h2', {}, k.personaje.nombre), el('p', { class: 'sub' }, `${t('anos', { n: k.personaje.edad })} · ${k.personaje.oficio} · ${k.personaje.ciudad}`),
    k.personaje.problema ? el('p', { class: 'grande' }, k.personaje.problema) : null,
    k.proyecto ? el('div', { class: 'proyecto' }, insignia(k.proyecto.icono || 'LuFolderKanban', 'cy', 'peque'),
      el('div', {}, el('small', {}, k.proyecto.tipo ? `${t('tu_proyecto')} · ${k.proyecto.tipo}` : t('tu_proyecto')), el('b', {}, k.proyecto.titulo))) : null,
    k.lo_que_sabes ? el('details', {}, el('summary', { style: 'cursor:pointer;font-weight:700;color:var(--cy)' }, t('lo_que_sabes')),
      el('ul', { style: 'padding-left:20px' }, ...k.lo_que_sabes.map((s) => el('li', {}, s))),
      k.datos_ficticios ? el('p', { class: 'apagado' }, t('datos_ficticios', { dni: k.datos_ficticios.dni, domicilio: k.datos_ficticios.domicilio }), Object.entries(k.datos_ficticios.otros || {}).map(([a, b]) => ` · ${a}: ${b}`).join('')) : null,
      el('p', { class: 'apagado' }, c.aviso)) : el('p', { class: 'apagado' }, c.aviso));
}

function botonMision(m, cumplida, alPulsar) {
  return el('button', { class: `mision-tarjeta c-${m.color} ${cumplida ? 'cumplida' : ''}`, onclick: alPulsar },
    insignia(m.icono, m.color, 'peque'), el('span', { class: 'codigo' }, m.id === 'JEFE' ? '★' : m.id),
    el('span', { class: 'texto' }, el('strong', {}, m.titulo), el('span', {}, `${m.min} min · ${m.objetivo}`)),
    el('span', { class: 'sello' }, cumplida ? icono('LuCheck') : ''));
}

// Después del taller: el mismo caso para repetirlo en casa (pasos, prompts y documentos, sin sellos).
function seccionRepiteEnCasa() {
  const c = estado.contenido;
  const prog = estado.progreso;
  const lista = el('div', { class: 'mapa' });
  c.misiones.forEach((m) => {
    const cumplida = m.id === 'JEFE' ? estado.alumno.jefe : prog.misiones.includes(m.id);
    lista.append(botonMision(m, cumplida, () => { vista = { tipo: 'repaso', id: m.id }; pintar(); window.scrollTo(0, 0); }));
  });
  const caja = el('div', { class: 'tarjeta tinte c-cy' }, pildora(t('repite_pildora')), el('h2', {}, t('repite_titulo')),
    el('p', { class: 'sub' }, t('repite_txt')), el('p', { class: 'apagado' }, t('sustituye')), lista);
  if ((c.misiones_extra || []).length) {
    caja.append(el('details', { style: 'margin-top:12px' }, el('summary', { style: 'cursor:pointer;font-weight:700' }, t('sobra_tiempo')),
      ...c.misiones_extra.map((m) => tarjetaPrompt(m.titulo, m.prompt, 'vi'))));
  }
  return caja;
}

function seccionMedallas() {
  const c = estado.contenido;
  const ganadas = estado.progreso.medallas;
  const caja = el('div', { class: 'tarjeta' }, pildora(t('medallas_secretas'), 'ye'), el('h2', {}, t('tres_medallas')), el('p', { class: 'sub' }, t('medallas_txt')));
  const rejilla = el('div', { class: 'medallas' }, ...c.medallas.map((m) => {
    const g = ganadas.includes(m.id);
    return el('div', { class: `medalla c-${m.color} ${g ? 'ganada' : ''}`, dataset: { medalla: m.id } }, el('div', { class: 'circulo' }, g ? icono(m.icono) : '?'), el('b', {}, g ? m.nombre : '???'), g && m.premiaba ? el('small', {}, m.premiaba) : null);
  }));
  const form = el('form', { class: 'botones', style: 'align-items:stretch' });
  const input = el('input', { type: 'text', placeholder: t('palabra_secreta'), autocomplete: 'off', autocapitalize: 'none', style: 'flex:1;min-width:160px' });
  form.append(input, el('button', { class: 'boton secundario c-ye', type: 'submit' }, icono('LuSparkles'), t('probar')));
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

// Medallas ya celebradas en este dispositivo. Las que da el profesor desde el panel llegan con el refresco
// y se celebran igual que las que gana el alumno en su app. La primera vez en un dispositivo no se celebran las antiguas.
const claveVistas = () => `medallas_vistas_${token}`;
function celebrarPendientes() {
  if (!estado || estado.config.estado !== 'taller_en_curso' || !estado.contenido) return;
  const ganadas = estado.progreso.medallas || [];
  const vistas = leerLocal(claveVistas());
  if (!Array.isArray(vistas)) { guardarLocal(claveVistas(), ganadas); return; }
  const nueva = ganadas.find((id) => !vistas.includes(id));
  const medalla = nueva && estado.contenido.medallas.find((m) => m.id === nueva);
  if (medalla) medallaGanada(medalla, estado.progreso);
}

function medallaGanada(medalla, progreso) {
  const vistas = leerLocal(claveVistas());
  guardarLocal(claveVistas(), [...new Set([...(Array.isArray(vistas) ? vistas : []), medalla.id])]);
  estado.progreso = progreso;
  estado.contenido.medallas = estado.contenido.medallas.map((m) => (m.id === medalla.id ? medalla : m));
  celebrarMedalla(medalla, () => {
    pintar(true);
    const nodo = app.querySelector(`[data-medalla="${medalla.id}"]`);
    if (nodo) nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ───────────── Mensajes con el profesor (solo con el taller en curso) ───────────── */

let conversacion = null;   // lista de la ventana de mensajes mientras está abierta
const claveMensajes = () => `mensajes_vistos_${token}`;

function sinLeerProfe() {
  const visto = leerLocal(claveMensajes()) || '';
  return (estado.mensajes || []).filter((m) => m.de === 'profe' && m.creado > visto).length;
}

function marcarVistos() {
  const ultimo = (estado.mensajes || []).map((m) => m.creado).sort().pop();
  if (ultimo) guardarLocal(claveMensajes(), ultimo);
}

function pintarConversacion() {
  vaciar(conversacion);
  const ms = estado.mensajes || [];
  if (!ms.length) conversacion.append(el('p', { class: 'apagado' }, t('mensajes_vacio')));
  ms.forEach((m) => conversacion.append(burbuja(m.texto, { mia: m.de === 'alumno', todos: m.todos,
    quien: m.de === 'alumno' ? t('mensaje_tu') : t(m.todos ? 'mensaje_todos' : 'mensaje_de_profe'), cuando: horaCorta(m.creado) })));
  conversacion.scrollTop = conversacion.scrollHeight;
  marcarVistos();
}

function abrirMensajes() {
  const chat = ventanaChat({
    titulo: t('mensajes_titulo'), placeholder: t('mensaje_ph'), textoEnviar: t('enviar'), textoCerrar: t('cerrar'),
    enviar: async (texto) => { estado.mensajes = (await post('mensaje', { t: token, texto })).mensajes; pintarConversacion(); },
  });
  conversacion = chat.lista;
  pintarConversacion();
  actualizarBarra();
}

// Tras cada refresco: lo nuevo del profesor se pinta en la ventana abierta o se avisa.
function mensajesNuevos(antes) {
  const nuevos = (estado.mensajes || []).filter((m) => m.de === 'profe' && !antes.some((a) => a.id === m.id));
  if (conversacion && conversacion.isConnected) { if (nuevos.length) pintarConversacion(); return; }
  if (!nuevos.length) return;
  toast(`${t('mensaje_nuevo')}: ${nuevos[nuevos.length - 1].texto}`, 'ok', 8000);
  if (navigator.vibrate) navigator.vibrate(200);
  actualizarBarra();
}

function actualizarBarra() {
  const barra = app.querySelector('.barra-inferior');
  if (barra) { barra.replaceWith(barraAyuda()); pintarIconos(app); }
}

function barraAyuda() {
  const activa = estado.alumno.ayuda;
  const sinLeer = sinLeerProfe();
  return el('div', { class: 'barra-inferior' },
    estado.config.estado === 'taller_en_curso' ? el('button', { class: 'boton secundario', onclick: abrirMensajes }, icono('LuMessageCircle'), t('mensajes'), sinLeer ? el('span', { class: 'contador' }, String(sinLeer)) : null) : null,
    el('button', { class: `boton ${activa ? 'secundario' : ''} c-rd`, onclick: async () => {
      try {
        const r = await post('ayuda', { t: token, activa: !activa });
        estado.alumno.ayuda = r.ayuda;
        toast(r.ayuda ? t('ayuda_pedida') : t('aviso_retirado'));
        pintar(true);
      } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuHand'), activa ? t('ayuda_cancelar') : t('ayuda')));
}

// tarjeta: {tipo, nota} de misiones.tarjetas. «instrucciones» se pega fuera del chat (habilidad de Gemini, AI Studio),
// «indicacion» no es un prompt (no se copia) y «opcional» es para quien va rápido.
function tarjetaPrompt(titulo, texto, color, tarjeta) {
  const tipo = tarjeta && tarjeta.tipo;
  return el('div', { class: `prompt c-${tipo === 'opcional' ? 'ye' : color} ${tipo ? `tarjeta-${tipo}` : ''}` },
    el('div', { class: 'cabecera' }, el('b', {}, titulo, tipo ? el('span', { class: 'chip', style: 'margin-left:8px' }, t(`tarjeta_${tipo}`)) : null),
      tipo === 'indicacion' ? null : el('button', { class: 'boton peque secundario', onclick: () => copiar(texto, txtCopiar()) }, icono('LuCopy'), t('copiar'))),
    tarjeta && tarjeta.nota ? el('p', { class: 'nota' }, icono('LuInfo', 'inline'), ' ', tarjeta.nota) : null,
    el('div', { class: 'cuerpo' }, texto));
}

// Material para descargar (documentos del cuaderno): un botón por archivo; el fichero llega del servidor.
function seccionArchivos(ids, color) {
  const k = estado.contenido.kit;
  const caja = el('div', { class: 'tarjeta' }, el('h2', {}, t('tus_documentos')), el('p', { class: 'apagado' }, t('documentos_txt')));
  ids.forEach((id) => {
    const a = (k.archivos || []).find((x) => x.id === id);
    if (!a) return;
    const boton = el('button', { class: `boton bloque c-${color}`, style: 'justify-content:flex-start;text-align:left', onclick: async () => {
      boton.disabled = true;
      try { descargarBlob(await cargarImagen(id), a.nombre); toast(t('descargado')); } catch (e) { toast(e.message, 'error'); }
      boton.disabled = false;
    } }, icono('LuFileDown'), el('span', {}, el('b', {}, a.titulo), a.subtitulo ? el('small', { style: 'display:block;font-weight:400' }, a.subtitulo) : null));
    caja.append(boton);
  });
  return caja;
}

function pintarMision(id, repaso = false) {
  const c = estado.contenido;
  const m = c.misiones.find((x) => x.id === id);
  const k = c.kit;
  const idx = c.misiones.indexOf(m);
  const cumplida = m.id === 'JEFE' ? estado.alumno.jefe : estado.progreso.misiones.includes(m.id);
  app.classList.add(`c-${m.color}`);
  const tipoVista = repaso ? 'repaso' : 'mision';
  if (repaso) { app.append(cabeceraAlumno()); if (estado.alumno.modo === 'ambos') app.classList.add('modo-ambos'); }
  app.append(el('div', { class: 'botones' }, el('button', { class: 'boton fantasma peque', onclick: () => { vista = { tipo: 'mapa' }; pintar(); window.scrollTo(0, 0); } }, icono('LuArrowLeft'), repaso ? t('volver_cierre') : t('mapa')),
    el('span', { class: 'apagado', style: 'margin-left:auto;align-self:center' }, `${estado.config.nivel || t('explorador')} ${t('numero', { n: estado.alumno.numero })}`)));
  app.append(el('div', { class: 'tarjeta fila tinte' }, insignia(m.icono, m.color, 'grande'),
    el('div', {}, pildora(m.id === 'JEFE' ? t('jefe_final', { min: m.min }) : t('mision_n', { n: m.id.slice(1), min: m.min }), m.color), el('h1', { style: 'font-size:1.7rem' }, m.titulo), el('p', { class: 'sub' }, m.objetivo))));

  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, t('pasos')), el('ol', { class: 'pasos' }, ...pasosDe(m).map((p) => el('li', {}, p)))));

  if (m.archivos && m.archivos.length) app.append(seccionArchivos(m.archivos, m.color));
  if (m.imagen) app.append(seccionImagen(m.imagen, m.color));

  if (m.prompts && m.prompts.length) {
    const caja = el('div', { class: 'tarjeta' }, el('h2', {}, m.prompts.length > 1 ? t('tus_prompts') : t('tu_prompt')), el('p', { class: 'apagado' }, estado.alumno.modo === 'ambos' ? t('pista_ambos') : t('pista_copiar')));
    m.prompts.forEach((pid) => {
      if (pid === 'M3-B' && k.prompts['M3-B_piezas']) {
        caja.append(el('h3', { style: 'margin-top:14px' }, t('m3b_titulo')));
        const nombres = t('piezas');
        const piezas = el('div', { class: 'piezas' }, ...PIEZAS.map(([clave, color], i) =>
          el('div', { class: `pieza c-${color}` }, el('div', { class: 'num' }, `0${i + 1}`), el('div', { class: 'nombre' }, nombres[i]), el('div', { class: 'txt' }, k.prompts['M3-B_piezas'][clave]))));
        caja.append(piezas, tarjetaPrompt(t('m3b_completo'), k.prompts['M3-B'], m.color));
      } else {
        caja.append(tarjetaPrompt(pid === 'M3-A' ? t('m3a') : pid, k.prompts[pid], m.color, (c.tarjetas || {})[pid]));
      }
    });
    app.append(caja);
  }

  const cierre = el('div', { class: 'tarjeta tinte' }, pildora(t('cumplida_cuando'), m.color), el('p', { class: 'grande' }, m.cumplida));
  if (repaso) {
    // Después del taller no hay sellos ni jefe que validar: solo el recuerdo de cómo quedó.
  } else if (m.id === 'JEFE') {
    if (cumplida) cierre.append(el('div', { class: 'aviso ok' }, el('strong', {}, t('jefe_superado')), t('jefe_validado')));
    else {
      const f = el('form', { class: 'botones', style: 'align-items:stretch' });
      const inp = el('input', { type: 'text', placeholder: t('codigo_profesor'), autocomplete: 'off', autocapitalize: 'none', style: 'flex:1;min-width:160px' });
      f.append(inp, el('button', { class: 'boton c-ye', type: 'submit' }, icono('LuCrown'), t('validar')));
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await post('jefe', { t: token, codigo: inp.value }); estado.alumno.jefe = true; toast(t('jefe_superado')); pintar(); } catch (err) { toast(err.message, 'error'); }
      });
      cierre.append(el('p', { class: 'apagado' }, t('jefe_txt')), f);
    }
  } else {
    cierre.append(el('button', { class: `boton grande bloque ${cumplida ? 'secundario' : ''} c-gr`, onclick: async () => {
      const antes = estado.progreso.misiones.slice();
      estado.progreso.misiones = cumplida ? antes.filter((id) => id !== m.id) : antes.concat(m.id);
      if (!cumplida) { toast(t('sello')); vista = { tipo: 'mapa' }; }
      pintar();
      window.scrollTo(0, 0);
      guardando++;
      try {
        const prog = await post('mision', { t: token, id: m.id, cumplida: !cumplida });
        estado.progreso.medallas = prog.medallas;
      } catch (e) {
        estado.progreso.misiones = antes;
        pintar();
        toast(e.message, 'error');
      } finally { guardando--; }
    } }, icono(cumplida ? 'LuUndo2' : 'LuStamp'), cumplida ? t('desmarcar_mision') : t('mision_cumplida')));
  }
  app.append(cierre);

  const nav = el('div', { class: 'botones' });
  if (idx > 0) nav.append(el('button', { class: 'boton fantasma', onclick: () => { vista = { tipo: tipoVista, id: c.misiones[idx - 1].id }; pintar(); window.scrollTo(0, 0); } }, icono('LuChevronLeft'), c.misiones[idx - 1].id));
  if (idx < c.misiones.length - 1) nav.append(el('button', { class: 'boton fantasma', style: 'margin-left:auto', onclick: () => { vista = { tipo: tipoVista, id: c.misiones[idx + 1].id }; pintar(); window.scrollTo(0, 0); } }, c.misiones[idx + 1].id, icono('LuChevronRight')));
  app.append(nav);
  if (!repaso) app.append(barraAyuda());
  pintarIconos(app);
}

function seccionImagen(tipo, color) {
  const k = estado.contenido.kit;
  const archivo = (k.archivos || []).find((a) => a.id === tipo);
  const info = archivo ? null : tipo === 'documento' ? k.documento : tipo === 'cartel' ? k.cartel_m4 : k.mensaje_m8;
  const caja = el('div', { class: 'tarjeta imagen-mision' }, el('h2', {}, nombreImagen(tipo, archivo)));
  const marco = el('div', {}, el('p', { class: 'apagado' }, t('cargando_imagen')));
  caja.append(marco);
  const botones = el('div', { class: 'botones' });
  caja.append(botones);
  if (info && tipo === 'documento') caja.append(el('p', { class: 'apagado' }, `${info.emisor.join(' · ')} — ${info.tipo}`));
  if (info && tipo === 'mensaje') caja.append(el('p', { class: 'apagado' }, `${info.canal} · ${t('de', { quien: info.de })}`));
  if (archivo && archivo.subtitulo) caja.append(el('p', { class: 'apagado' }, archivo.subtitulo));

  const zonas = tipo === 'documento' ? (k.zonas_guardian || []) : [];
  const nombre = archivo ? archivo.nombre : `kit${estado.alumno.numero}_${tipo}.png`;

  const mostrar = (blob, tapada) => {
    const url = URL.createObjectURL(blob);
    const img = el('img', { src: url, alt: nombreImagen(tipo, archivo), onclick: () => modal(el('img', { src: url, alt: nombreImagen(tipo, archivo), style: 'width:100%;border-radius:12px' }), { ancho: true, textoCerrar: t('cerrar') }) });
    vaciar(marco).append(img, el('p', { class: 'apagado', style: 'margin-top:6px' }, tapada ? t('version_retocada') : t('toca_imagen')));
    vaciar(botones);
    const fichero = new File([blob], nombre, { type: 'image/png' });
    if (zonas.length) {
      // Discreto a propósito: cómo se gana la medalla Guardián no se explica.
      botones.append(el('button', { class: 'boton fantasma', onclick: () => tapar(blob) }, icono('LuPenLine'), t('rotulador')));
    }
    const movil = /Android|iPhone|iPad/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
    const nota = (texto) => botones.append(el('p', { class: 'apagado', style: 'width:100%;margin:4px 0 0' }, texto));
    if (movil && puedeCompartirArchivos() && navigator.canShare({ files: [fichero] })) {
      // En el móvil: la hoja de compartir del sistema; el alumno elige Gemini en la lista.
      botones.append(el('button', { class: `boton c-${color}`, onclick: async () => {
        try { await navigator.share({ files: [fichero], title: nombreImagen(tipo, archivo) }); } catch (e) { if (e.name !== 'AbortError') toast(t('no_compartir'), 'error'); }
      } }, icono('LuShare2'), t('compartir_gemini')));
      botones.append(el('button', { class: 'boton secundario', onclick: () => descargarBlob(blob, nombre) }, icono('LuDownload'), t('descargar_imagen')));
      nota(t('nota_compartir'));
    } else {
      // En el portátil: al portapapeles y pegar en el chat (Ctrl+V), o descargar y arrastrar.
      const puedeCopiar = !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
      if (puedeCopiar) {
        botones.append(el('button', { class: `boton c-${color}`, onclick: async () => {
          try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(t('imagen_copiada')); }
          catch (e) { toast(t('no_copiar_imagen'), 'error'); }
        } }, icono('LuClipboardCopy'), t('copiar_imagen')));
      }
      botones.append(el('button', { class: 'boton secundario', onclick: () => descargarBlob(blob, nombre) }, icono('LuDownload'), t('descargar_imagen')));
      nota(puedeCopiar ? t('nota_copiar') : t('nota_descargar'));
    }
    pintarIconos(caja);
  };

  const tapar = async () => {
    const original = imagenesCache[tipo];
    const r = await abrirTapar(original, zonas, { titulo: t('rotulador') });
    if (!r) return;
    imagenesCache[`${tipo}_tapada`] = r.blob;
    mostrar(r.blob, true);
    if (estado.progreso.medallas.includes('guardian') || estado.config.estado !== 'taller_en_curso') return;
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
  app.append(cabeceraAlumno(), pildora(t('se_desvela'), 'ye'), el('h1', {}, t('tres_medallas_t')));
  if (c && c.medallas) {
    app.append(el('div', { class: 'medallas' }, ...c.medallas.map((m) => {
      const g = estado.progreso.medallas.includes(m.id);
      return el('div', { class: `medalla c-${m.color} ${g ? 'ganada' : ''}` }, el('div', { class: 'circulo' }, icono(m.icono)), el('b', {}, m.nombre), el('small', {}, m.premiaba || ''), g ? el('small', { class: 'acento' }, el('br'), t('la_tuya')) : null);
    })));
  }
  app.append(el('div', { class: 'tarjeta tinte c-gr' }, el('h2', {}, t('tu_dia')),
    el('p', {}, t('resumen_dia', { sellos: estado.progreso.misiones.length, medallas: estado.progreso.medallas.length, jefe: a.jefe ? t('superado') : t('pendiente') }))));

  if (estado.encuesta_hecha) {
    app.append(el('div', { class: 'aviso ok' }, el('strong', {}, t('gracias')), t('certificado_nombre'), el('strong', {}, a.nombre_certificado || a.nombre), '.',
      el('div', { class: 'botones', style: 'margin:12px 0 0' }, el('a', { class: 'boton c-ye', href: `certificado.html?t=${encodeURIComponent(token)}${verEstado ? `&ver_estado=${verEstado}` : ''}`, target: '_blank', rel: 'noopener' }, icono('LuAward'), t('ver_diploma')))));
  } else {
    app.append(formularioCierre());
  }
  if (c && c.kit) app.append(tarjetaPersonaje(), seccionRepiteEnCasa());
  app.append(enlaceMisDatos());
  pintarIconos(app);
}

function formularioCierre() {
  const a = estado.alumno;
  const c = estado.contenido;
  const f = el('form', { class: 'tarjeta', novalidate: true });
  const escala = (nombre, desde, hasta, etiquetas) => el('div', { class: 'opciones escala', style: `grid-template-columns:repeat(${Math.min(5, hasta - desde + 1)},1fr)` }, ...Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).map((n) =>
    el('label', { class: 'opcion', style: 'justify-content:center;padding:10px 4px', title: etiquetas ? etiquetas[n] || '' : '' }, el('input', { type: 'radio', name: nombre, value: n }), el('strong', { style: 'font-size:1.3rem' }, n))));
  const valoracion = (clave) => el('div', { class: 'campo' }, el('span', { style: 'display:block;font-weight:600;margin-bottom:6px' }, t(`val_${clave}`)), escala(clave, 1, 5),
    el('div', { class: 'escala-pies' }, el('span', {}, t('val_min')), el('span', {}, t('val_max'))));
  const utiles = el('select', { name: 'mision_util' }, el('option', { value: '' }, t('elige')), ...(c ? c.misiones : []).map((m) => el('option', { value: m.id }, `${m.id === 'JEFE' ? '★' : m.id} · ${m.titulo}`)));
  f.append(el('h2', {}, t('antes_irte')),
    el('label', { class: 'campo' }, el('span', {}, t('nombre_certificado')), el('input', { type: 'text', name: 'nombre_certificado', value: a.nombre_certificado || a.nombre, required: true }), el('span', { class: 'ayuda' }, t('revisalo'))),
    el('h3', { style: 'margin:18px 0 4px' }, t('encuesta_titulo')), el('p', { class: 'apagado', style: 'margin:0 0 10px' }, t('encuesta_intro')),
    ...['general', 'profesor', 'contenido', 'ritmo', 'app'].map(valoracion),
    el('div', { class: 'campo' }, el('span', { style: 'display:block;font-weight:600;margin-bottom:6px' }, t('recomendaria')), escala('recomendaria', 1, 5),
      el('div', { class: 'escala-pies' }, el('span', {}, t('reco_min')), el('span', {}, t('reco_max')))),
    el('div', { class: 'campo' }, el('span', { style: 'display:block;font-weight:600;margin-bottom:6px' }, t('seguro_ia')), escala('seguridad', 1, 5),
      el('div', { class: 'escala-pies' }, el('span', {}, t('seguro_min')), el('span', {}, t('seguro_max')))),
    el('label', { class: 'campo' }, el('span', {}, t('mision_util')), utiles),
    el('label', { class: 'campo' }, el('span', {}, t('lo_mejor')), el('textarea', { name: 'lo_mejor', placeholder: t('lo_mejor_ph') })),
    el('label', { class: 'campo' }, el('span', {}, t('mejorarias')), el('textarea', { name: 'mejorar', placeholder: t('mejorar_ph') })),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'aviso_t2', checked: a.avisos }), el('span', {}, t('aviso_t2'))),
    el('button', { class: 'boton grande bloque c-gr', type: 'submit' }, icono('LuCheck'), t('enviar')));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f).entries());
    const falta = ['general', 'profesor', 'contenido', 'ritmo', 'app'].find((k) => !d[k]);
    if (falta) { toast(t('err_valoracion', { que: t(`val_${falta}`) }), 'error'); f.querySelector(`input[name="${falta}"]`).closest('.campo').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (!d.recomendaria) return toast(t('err_recomendaria'), 'error');
    if (!d.seguridad) return toast(t('err_seguridad'), 'error');
    try {
      await post('cierre', { t: token, nombre_certificado: d.nombre_certificado, seguridad: d.seguridad, mision_util: d.mision_util, mejorar: d.mejorar, aviso_t2: !!d.aviso_t2,
        general: d.general, profesor: d.profesor, contenido: d.contenido, ritmo: d.ritmo, app: d.app, recomendaria: d.recomendaria, lo_mejor: d.lo_mejor });
      estado = await get('alumno', { t: token });
      pintar();
      toast(t('gracias_proximo'));
    } catch (err) { toast(err.message, 'error'); }
  });
  return f;
}

cargar();
