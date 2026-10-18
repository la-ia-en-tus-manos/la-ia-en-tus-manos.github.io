import { get, post } from './api.js';
import { REFRESCO_VIVO_S } from './config.js';
import { el, vaciar, icono, pintarIconos, pildora, insignia, toast, modal, descargarBlob, cargarInicio, errorPantalla, guardarLocal, leerLocal, borrarLocal, haceCuanto, fechaHora, NOMBRE_MODO } from './ui.js';
import { VERSION_APP } from './version.js';

const app = document.getElementById('app');
let clave = sessionStorage.getItem('profe_clave') || '';
let estado = null;
let pestana = leerLocal('profe_pestana') || 'inicio';
let vivoTimer = null;        // Worker que marca el ritmo del refresco (los temporizadores de un worker no se frenan en segundo plano)
let ayudasVistas = new Set(); // ids de alumnos cuya petición de ayuda ya se avisó
let audio = null;             // AudioContext, solo tras un gesto del usuario
const TITULO_BASE = document.title;

const ETIQUETA_CONFIG = {
  nombre_taller: ['Nombre del taller', 'text'], numero_taller: ['Número de taller', 'text'], nivel: ['Nivel', 'text'],
  fecha: ['Fecha', 'date'], hora_inicio: ['Hora de inicio', 'time'], duracion_min: ['Duración (minutos)', 'number'],
  lugar: ['Lugar', 'text'], direccion: ['Dirección', 'text'], mapa_url: ['Enlace al mapa', 'url'],
  plazas: ['Plazas', 'number'], kits_activos: ['Kits activos', 'number'], max_espera: ['Máximo en lista de espera', 'number'],
  mensaje_espera: ['Mensaje en la pantalla de espera', 'textarea'], pista_caso: ['Pista del caso bloqueado', 'textarea'],
  whatsapp_url: ['Enlace del grupo de WhatsApp', 'url'],
  responsable_nombre: ['Responsable de los datos (nombre o entidad)', 'text'], responsable_correo: ['Correo de contacto para privacidad', 'email'],
  remitente_nombre: ['Nombre del remitente de los correos', 'text'], retencion_texto: ['Texto sobre cuánto tiempo se guardan los datos', 'textarea'],
  url_app: ['Dirección pública de la app (para los enlaces de los correos)', 'url'],
  mensaje_espera_pt: ['Mensaje en la pantalla de espera · en portugués (vacío = se usa el español)', 'textarea'],
  pista_caso_pt: ['Pista del caso bloqueado · en portugués', 'textarea'],
  retencion_texto_pt: ['Texto sobre los datos · en portugués', 'textarea']
};
const NOMBRE_IDIOMA = { es: 'ES', 'pt-BR': 'PT-BR' };
const NOMBRE_ESTADO = { borrador: 'Borrador', inscripcion_abierta: 'Inscripción abierta', inscripcion_cerrada: 'Inscripción cerrada', taller_en_curso: 'Taller en curso', terminado: 'Terminado' };

async function iniciar() {
  if (!clave) return pintarAcceso();
  cargarInicio(app);
  try { estado = await get('p_estado', { k: clave }); } catch (e) {
    if (e.codigo === 401 || e.codigo === 429) { clave = ''; sessionStorage.removeItem('profe_clave'); return pintarAcceso(e.message); }
    return errorPantalla(app, e.message, iniciar);
  }
  pintar();
}

function pintarAcceso(error) {
  vaciar(app);
  const f = el('form', { class: 'tarjeta', style: 'max-width:420px;margin:60px auto' });
  const inp = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Clave del profesor', required: true });
  // append() nativo convierte null en el texto «null»: solo se pasan nodos reales.
  f.append(...[pildora('Panel del profesor'), el('h1', { style: 'font-size:1.6rem' }, 'Entrar'), error ? el('div', { class: 'aviso error' }, error) : null, el('label', { class: 'campo' }, el('span', {}, 'Clave'), inp), el('button', { class: 'boton bloque', type: 'submit' }, 'Entrar')].filter(Boolean));
  f.addEventListener('submit', (e) => { e.preventDefault(); clave = inp.value.trim(); sessionStorage.setItem('profe_clave', clave); iniciar(); });
  app.append(f);
}

async function recargar(silencioso = true) {
  try { estado = await get('p_estado', { k: clave }); if (!silencioso) pintar(); } catch (e) {
    if (e.codigo === 401 || e.codigo === 429) { clave = ''; sessionStorage.removeItem('profe_clave'); return pintarAcceso(e.message); }
    toast(e.message, 'error');
  }
}

function pintar() {
  if (vivoTimer) { vivoTimer.terminate(); vivoTimer = null; }
  document.title = TITULO_BASE;
  vaciar(app);
  const cfg = estado.config;
  app.append(el('div', { class: 'cabecera-alumno' },
    el('div', {}, pildora(`Taller ${cfg.numero_taller} · ${cfg.nivel}`), el('h1', { style: 'font-size:1.6rem' }, cfg.nombre_taller)),
    el('div', { style: 'text-align:right' }, el('span', { class: `chip c-${cfg.estado === 'taller_en_curso' ? 'gr' : cfg.estado === 'inscripcion_abierta' ? 'cy' : 'ye'}` }, NOMBRE_ESTADO[cfg.estado]), el('br'),
      el('button', { class: 'boton fantasma peque', style: 'margin-top:8px', onclick: () => { clave = ''; sessionStorage.removeItem('profe_clave'); pintarAcceso(); } }, 'Salir'))));
  const pestanas = [['inicio', 'Inicio'], ['vivo', 'En vivo'], ['inscritos', 'Inscritos'], ['config', 'Configuración'], ['secretos', 'Secretos'], ['soluciones', 'Soluciones'], ['datos', 'Datos']];
  app.append(el('div', { class: 'pestanas' }, ...pestanas.map(([id, nombre]) => el('button', { class: id === pestana ? 'activa' : '', onclick: () => { pestana = id; guardarLocal('profe_pestana', id); pintar(); } }, nombre))));
  ({ inicio: pintarInicio, vivo: pintarVivo, inscritos: pintarInscritos, config: pintarConfig, secretos: pintarSecretos, soluciones: pintarSoluciones, datos: pintarDatos })[pestana]();
  pintarIconos(app);
}

/* ───────────── Inicio ───────────── */

function pintarInicio() {
  const cfg = estado.config;
  const oc = estado.ocupacion;
  const plazas = Math.min(+cfg.plazas, +cfg.kits_activos);
  app.append(el('div', { class: 'rejilla' },
    el('div', { class: 'tarjeta kpi c-cy' }, el('b', {}, `${oc.plaza}/${plazas}`), el('small', {}, 'plazas ocupadas')),
    el('div', { class: 'tarjeta kpi c-ye' }, el('b', {}, `${oc.espera}/${cfg.max_espera}`), el('small', {}, 'en lista de espera')),
    el('div', { class: 'tarjeta kpi c-gr' }, el('b', {}, estado.inscritos.filter((i) => i.estado === 'plaza' && i.previas === i.previas_total).length), el('small', {}, 'preparados del todo')),
    el('div', { class: 'tarjeta kpi c-bl' }, el('b', {}, estado.cuota_correo), el('small', {}, 'correos disponibles hoy'))));

  const avisos = [];
  if (!estado.secretos.ingenio || !estado.secretos.guardian || !estado.secretos.detective || !estado.secretos.jefe) avisos.push(['atencion', 'Faltan palabras secretas o el código del jefe final. Pestaña «Secretos».']);
  if (!cfg.url_app) avisos.push(['atencion', 'Falta la dirección pública de la app: los correos no llevarán enlace completo. Pestaña «Configuración».']);
  if (!estado.imagenes_ok) avisos.push(['error', 'No hay carpeta de imágenes configurada: ejecuta configurarInicial() en Apps Script.']);
  if (!cfg.fecha) avisos.push(['', 'Sin fecha: los alumnos ven «por confirmar». Cuando la pongas, avísales desde «Inscritos».']);
  avisos.forEach(([tipo, texto]) => app.append(el('div', { class: `aviso ${tipo}` }, texto)));

  const selector = el('select', {}, ...estado.estados.map((s) => el('option', { value: s, selected: s === cfg.estado }, NOMBRE_ESTADO[s])));
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Estado del taller'),
    el('p', { class: 'sub' }, 'Hasta «Taller en curso» los alumnos no reciben su caso. En «Terminado» solo queda el cierre.'),
    el('div', { class: 'botones' }, selector, el('button', { class: 'boton', onclick: () => guardarConfig({ estado: selector.value }) }, 'Cambiar estado'))));

  const v = estado.version || {};
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Versiones en marcha'),
    el('p', {}, el('strong', {}, 'Backend (Apps Script): '), `${v.version || '?'} · ${v.fecha || 'fecha desconocida'}`, v.commit ? ` · commit ${v.commit}` : '', v.descripcion ? el('span', { class: 'apagado' }, ` · ${v.descripcion}`) : null),
    el('p', {}, el('strong', {}, 'Web (GitHub Pages): '), `${VERSION_APP.fecha} · commit ${VERSION_APP.commit}`),
    el('p', {}, el('strong', {}, 'Edición actual: '), cfg.taller_id, el('span', { class: 'apagado' }, ' · inscritos por edición: ', Object.entries(estado.ediciones || {}).map(([e, n]) => `${e} ${n}`).join(' · ') || 'ninguno'))));
  const enlace = `${(cfg.url_app || location.origin + location.pathname.replace(/profe\.html$/, '')).replace(/\/+$/, '')}/index.html`;
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Enlace de inscripción'), el('p', {}, el('a', { href: enlace, target: '_blank' }, enlace)),
    el('button', { class: 'boton secundario peque', onclick: () => navigator.clipboard.writeText(enlace).then(() => toast('Enlace copiado')) }, icono('LuCopy'), 'Copiar')));
}

async function guardarConfig(cambios) {
  try {
    const r = await post('p_config', { k: clave, config: cambios });
    estado.config = r.config;
    toast('Guardado');
    await recargar();
    pintar();
  } catch (e) { toast(e.message, 'error'); }
}

/* ───────────── En vivo ───────────── */

function pintarVivo() {
  const caja = el('div', {});
  app.append(caja);
  const refrescar = async () => {
    try {
      const v = await get('p_vivo', { k: clave });
      pintarTablaVivo(caja, v);
    } catch (e) {
      // Con clave mala o bloqueo, parar de insistir: cada intento fallido cuenta para el límite del servidor.
      if (e.codigo === 401 || e.codigo === 429) { if (vivoTimer) { vivoTimer.terminate(); vivoTimer = null; } clave = ''; sessionStorage.removeItem('profe_clave'); return pintarAcceso(e.message); }
      toast(e.message, 'error');
    }
  };
  refrescar();
  // Un worker sigue contando aunque la pestaña esté detrás del PowerPoint; un setInterval normal se frena.
  vivoTimer = new Worker(URL.createObjectURL(new Blob([`setInterval(() => postMessage(1), ${REFRESCO_VIVO_S * 1000});`], { type: 'text/javascript' })));
  vivoTimer.onmessage = refrescar;
}

function avisosActivos() { return 'Notification' in window && Notification.permission === 'granted'; }

/* Ventana flotante siempre encima (Document Picture-in-Picture): no necesita permisos y se ve sobre el PowerPoint. */
let flotante = null;
function hayFlotante() { return !!(flotante && !flotante.closed); }
function puedeFlotar() { return 'documentPictureInPicture' in window; }

async function abrirFlotante() {
  if (!puedeFlotar()) { toast('Este navegador no admite la ventana flotante (hace falta Edge o Chrome actualizados)', 'error', 6000); return; }
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); await audio.resume(); } catch (e) { /* sin sonido */ }
  try {
    flotante = await documentPictureInPicture.requestWindow({ width: 380, height: 240 });
  } catch (e) { toast('No se ha podido abrir la ventana flotante: ' + e.message, 'error', 6000); return; }
  const d = flotante.document;
  d.documentElement.lang = 'es';
  const estilo = d.createElement('style');
  estilo.textContent = `
    body { margin: 0; font-family: Inter, 'Segoe UI', system-ui, sans-serif; background: #0d1230; color: #fff; padding: 14px; min-height: 100vh; box-sizing: border-box; }
    body.alerta { background: #b3261e; animation: parpadeo 1s steps(2) infinite; }
    @keyframes parpadeo { 50% { background: #e5484d; } }
    h1 { font-size: 15px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 8px; opacity: .85; }
    .quien { font-size: 26px; font-weight: 800; line-height: 1.2; margin: 6px 0; }
    .tranquilo { font-size: 22px; font-weight: 700; color: #8EE04E; }
    .pie { font-size: 12px; opacity: .7; margin-top: 10px; }`;
  d.head.append(estilo);
  flotante.addEventListener('pagehide', () => { flotante = null; const b = app.querySelector('[data-flotante]'); if (b) b.textContent = 'Abrir ventana flotante'; });
  pintarFlotante(ultimoVivo);
  pintar();
}

let ultimoVivo = null;
function pintarFlotante(v) {
  if (!hayFlotante()) return;
  const d = flotante.document;
  const ayudas = v ? v.alumnos.filter((a) => a.ayuda) : [];
  d.body.className = ayudas.length ? 'alerta' : '';
  d.body.innerHTML = '';
  d.body.append(crearEn(d, 'h1', '', ayudas.length ? `¡AYUDA! · ${ayudas.length}` : 'Taller en vivo'));
  if (ayudas.length) ayudas.forEach((a) => d.body.append(crearEn(d, 'div', 'quien', `n.º ${a.numero} · ${a.nombre}`)));
  else d.body.append(crearEn(d, 'div', 'tranquilo', 'Todo tranquilo'));
  d.body.append(crearEn(d, 'div', 'pie', v ? `Actualizado ${fechaHora(v.ts)} · ${v.alumnos.length} alumnos` : 'Esperando datos…'));
}
function crearEn(d, tag, clase, texto) { const n = d.createElement(tag); n.className = clase; n.textContent = texto; return n; }

async function activarAvisos() {
  if (!('Notification' in window)) { toast('Este navegador no admite notificaciones', 'error'); return; }
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); await audio.resume(); } catch (e) { /* sin sonido */ }
  const permiso = await Notification.requestPermission();
  if (permiso === 'granted') { toast('Avisos activados: sonarán aunque el navegador esté detrás'); pitido(); }
  else if (permiso === 'denied') toast('El navegador tiene BLOQUEADAS las notificaciones para esta web. Pulsa el candado junto a la dirección → Notificaciones → Permitir, y recarga la página', 'error', 9000);
  else toast('El aviso de permiso no se ha respondido. Si ves una campana tachada en la barra de direcciones, púlsala y elige Permitir', 'error', 9000);
  pintar();
}

function pitido() {
  if (!audio) return;
  try {
    [0, 0.18].forEach((inicio, i) => {
      const o = audio.createOscillator(); const g = audio.createGain();
      o.type = 'sine'; o.frequency.value = i ? 1180 : 880;
      g.gain.setValueAtTime(0.0001, audio.currentTime + inicio);
      g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + inicio + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + inicio + 0.16);
      o.connect(g).connect(audio.destination); o.start(audio.currentTime + inicio); o.stop(audio.currentTime + inicio + 0.18);
    });
  } catch (e) { /* nada */ }
}

function avisarAyuda(nuevas, total) {
  pitido();
  if (!avisosActivos()) return;
  const quien = nuevas.map((a) => `n.º ${a.numero} ${a.nombre}`).join(' · ');
  try {
    const n = new Notification(`¡AYUDA! ${quien}`, { body: total > nuevas.length ? `${total} alumnos esperan ayuda` : 'Toca para ver el panel', tag: 'ayuda-' + Date.now(), requireInteraction: true, icon: 'assets/ponente.png' });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) { /* nada */ }
}

function pintarTablaVivo(caja, v) {
  vaciar(caja);
  const misiones = estado.contenido.misiones.filter((m) => m.id !== 'JEFE');
  const medallas = estado.contenido.medallas;
  const ayudas = v.alumnos.filter((a) => a.ayuda);
  const nuevas = ayudas.filter((a) => !ayudasVistas.has(a.id));
  ayudasVistas = new Set(ayudas.map((a) => a.id));
  if (nuevas.length) avisarAyuda(nuevas, ayudas.length);
  ultimoVivo = v;
  pintarFlotante(v);
  document.title = ayudas.length ? `(${ayudas.length}) ¡AYUDA! · ${TITULO_BASE}` : TITULO_BASE;
  caja.append(el('p', { class: 'apagado' }, `Actualizado ${fechaHora(v.ts)} · se refresca cada ${REFRESCO_VIVO_S} s · ${v.alumnos.length} alumnos con plaza`));
  caja.append(el('div', { class: `aviso ${avisosActivos() || hayFlotante() ? 'ok' : 'atencion'}` },
    el('strong', {}, 'Avisos de ayuda. '), 'Para enterarte con el PowerPoint delante: la ventana flotante se queda siempre encima y no necesita permisos; la notificación de Windows sí los necesita.',
    el('div', { class: 'botones', style: 'margin:10px 0 0' },
      puedeFlotar() ? el('button', { class: `boton peque ${hayFlotante() ? 'secundario' : ''}`, dataset: { flotante: '1' }, onclick: () => { if (hayFlotante()) flotante.close(); else abrirFlotante(); } }, icono('LuPictureInPicture2'), hayFlotante() ? 'Cerrar ventana flotante' : 'Abrir ventana flotante') : null,
      avisosActivos() ? el('span', { class: 'chip c-gr', style: 'align-self:center' }, 'Notificaciones activadas') : el('button', { class: 'boton peque secundario', onclick: activarAvisos }, icono('LuBell'), 'Activar notificaciones'))));
  if (ayudas.length) caja.append(el('div', { class: 'aviso error' }, icono('LuHand'), ' ', el('strong', {}, `${ayudas.length} necesita${ayudas.length > 1 ? 'n' : ''} ayuda: `), ayudas.map((a) => `n.º ${a.numero} ${a.nombre}`).join(' · ')));
  if (v.estado !== 'taller_en_curso') caja.append(el('div', { class: 'aviso atencion' }, 'El taller no está en curso: los alumnos aún no ven su caso.'));

  const tabla = el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'N.º'), el('th', {}, 'Alumno'), el('th', {}, 'Misiones'), el('th', {}, 'Medallas'), el('th', {}, 'Jefe'), el('th', {}, 'Visto'), el('th', {}, ''))));
  const cuerpo = el('tbody');
  v.alumnos.forEach((a) => {
    const fila = el('tr', { class: a.ayuda ? 'ayuda' : '' },
      el('td', {}, el('strong', {}, a.numero)),
      el('td', {}, el('strong', {}, a.nombre), el('br'), el('small', { class: 'apagado' }, NOMBRE_MODO[a.modo], a.idioma && a.idioma !== 'es' ? ` · ${NOMBRE_IDIOMA[a.idioma] || a.idioma}` : '', a.ayuda ? ' · ¡AYUDA!' : '')),
      el('td', {}, el('div', { class: 'sellos' }, ...misiones.map((m) => el('span', { class: `c-${m.color} ${a.misiones.includes(m.id) ? 'si' : ''}`, title: m.titulo }, m.id.replace('M', ''))))),
      el('td', {}, el('div', { class: 'sellos' }, ...medallas.map((m) => el('span', { class: `c-${m.color} ${a.medallas.includes(m.id) ? 'si' : ''}`, title: m.nombre }, m.nombre[0])))),
      el('td', {}, a.jefe ? el('span', { class: 'chip c-ye' }, '★ sí') : el('span', { class: 'apagado' }, 'no')),
      el('td', {}, el('small', {}, haceCuanto(a.ultimo_acceso))),
      el('td', {}, el('button', { class: 'boton peque secundario', onclick: () => accionesAlumno(a) }, 'Acciones')));
    cuerpo.append(fila);
  });
  tabla.append(cuerpo);
  caja.append(el('div', { class: 'tabla-scroll tarjeta' }, tabla));
  pintarIconos(caja);
}

function accionesAlumno(a) {
  const medallas = estado.contenido.medallas;
  const accion = async (datos, mensaje) => {
    try { await post('p_inscrito', { k: clave, id: a.id, ...datos }); toast(mensaje || 'Hecho'); cerrar(); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
  };
  const { cerrar } = modal([
    el('h2', {}, `N.º ${a.numero} · ${a.nombre}`),
    a.ayuda ? el('button', { class: 'boton bloque c-gr', onclick: () => accion({ accion: 'ayuda_ok' }, 'Ayuda atendida') }, icono('LuCheck'), 'Ayuda atendida') : null,
    el('h3', { style: 'margin-top:14px' }, 'Dar o quitar medalla'),
    el('div', { class: 'botones' }, ...medallas.map((m) => {
      const tiene = a.medallas.includes(m.id);
      return el('button', { class: `boton ${tiene ? 'secundario' : ''} c-${m.color}`, onclick: () => accion({ accion: 'medalla', medalla: m.id, quitar: tiene }, tiene ? 'Medalla retirada' : `Medalla ${m.nombre} concedida`) }, icono(m.icono), tiene ? `Quitar ${m.nombre}` : m.nombre);
    })),
    el('h3', { style: 'margin-top:14px' }, 'Jefe final'),
    el('button', { class: `boton bloque c-ye ${a.jefe ? 'secundario' : ''}`, onclick: () => accion({ accion: 'jefe', quitar: a.jefe }, a.jefe ? 'Validación retirada' : 'Jefe final validado') }, icono('LuCrown'), a.jefe ? 'Quitar validación' : 'Validar el jefe final'),
    el('h3', { style: 'margin-top:14px' }, 'Misiones (corregir a mano)'),
    el('div', { class: 'botones' }, ...estado.contenido.misiones.filter((m) => m.id !== 'JEFE').map((m) => {
      const tiene = a.misiones.includes(m.id);
      return el('button', { class: `boton peque ${tiene ? '' : 'fantasma'} c-${m.color}`, onclick: () => accion({ accion: 'mision', mision: m.id, quitar: tiene }) }, m.id);
    }))
  ]);
}

/* ───────────── Inscritos ───────────── */

function pintarInscritos() {
  const cfg = estado.config;
  const lista = estado.inscritos;
  app.append(el('div', { class: 'botones' },
    el('button', { class: 'boton secundario', onclick: avisarTodos }, icono('LuMail'), 'Avisar por correo'),
    el('button', { class: 'boton secundario', onclick: async () => { try { const r = await get('p_csv', { k: clave }); descargarBlob(new Blob(['﻿' + r.csv], { type: 'text/csv;charset=utf-8' }), r.nombre); } catch (e) { toast(e.message, 'error'); } } }, icono('LuDownload'), 'Exportar CSV'),
    el('button', { class: 'boton fantasma', onclick: () => recargar(false) }, icono('LuRefreshCw'), 'Actualizar')));
  if (!lista.length) return app.append(el('p', { class: 'sub' }, 'Todavía no hay inscritos.'));
  const tabla = el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'N.º'), el('th', {}, 'Nombre'), el('th', {}, 'Contacto'), el('th', {}, 'Modo'), el('th', {}, 'Preparación'), el('th', {}, 'Estado'), el('th', {}, ''))));
  const cuerpo = el('tbody');
  lista.forEach((i) => {
    const color = i.estado === 'plaza' ? 'gr' : i.estado === 'espera' ? 'ye' : 'rd';
    cuerpo.append(el('tr', {},
      el('td', {}, el('strong', {}, i.numero || '—')),
      el('td', {}, el('strong', {}, i.nombre), i.veterano ? el('span', { class: 'chip c-ye', style: 'margin-left:6px' }, 'repite') : null, el('br'), el('small', { class: 'apagado' }, `inscrito ${fechaHora(i.creado)}`, i.avisos ? ' · quiere avisos' : '')),
      el('td', {}, el('small', {}, i.correo, i.telefono ? [el('br'), i.telefono] : null)),
      el('td', {}, el('small', {}, NOMBRE_MODO[i.modo], el('br'), el('span', { class: 'chip' }, NOMBRE_IDIOMA[i.idioma] || i.idioma))),
      el('td', {}, i.estado === 'plaza' ? [el('div', { class: 'barra', style: 'width:90px' }, el('div', { style: `width:${Math.round(100 * i.previas / Math.max(1, i.previas_total))}%` })), el('small', {}, `${i.previas} de ${i.previas_total}`)] : ''),
      el('td', {}, el('span', { class: `chip c-${color}` }, i.estado)),
      el('td', {}, el('button', { class: 'boton peque secundario', onclick: () => accionesInscrito(i) }, 'Acciones'))));
  });
  tabla.append(cuerpo);
  app.append(el('div', { class: 'tabla-scroll tarjeta' }, tabla));
}

function accionesInscrito(i) {
  const accion = async (datos, mensaje, confirmar) => {
    if (confirmar && !window.confirm(confirmar)) return;
    try { await post('p_inscrito', { k: clave, id: i.id, ...datos }); toast(mensaje); cerrar(); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
  };
  const { cerrar } = modal([
    el('h2', {}, i.nombre), el('p', { class: 'apagado' }, `${i.correo} · ${i.estado}${i.numero ? ` · explorador n.º ${i.numero}` : ''}`),
    el('p', {}, el('small', {}, 'Enlace personal: '), el('a', { href: i.enlace, target: '_blank', style: 'word-break:break-all' }, i.enlace)),
    el('div', { class: 'botones' },
      el('button', { class: 'boton secundario', onclick: () => navigator.clipboard.writeText(i.enlace).then(() => toast('Enlace copiado')) }, icono('LuCopy'), 'Copiar enlace'),
      i.estado !== 'cancelado' ? el('button', { class: 'boton secundario', onclick: () => accion({ accion: 'reenviar' }, 'Enlace reenviado por correo') }, icono('LuMail'), 'Reenviar enlace') : null,
      i.estado === 'espera' ? el('button', { class: 'boton c-gr', onclick: () => accion({ accion: 'subir' }, 'Ya tiene plaza') }, icono('LuArrowUp'), 'Darle plaza') : null,
      i.estado !== 'cancelado' ? el('button', { class: 'boton secundario peligro', onclick: () => accion({ accion: 'cancelar' }, 'Plaza cancelada', `¿Cancelar la inscripción de ${i.nombre}?`) }, 'Cancelar inscripción') : null,
      el('button', { class: 'boton peligro', onclick: () => accion({ accion: 'borrar' }, 'Datos borrados', `¿Borrar todos los datos de ${i.nombre}? No se puede deshacer.`) }, icono('LuTrash2'), 'Borrar sus datos')),
    el('h3', { style: 'margin-top:14px' }, 'Modo'),
    el('div', { class: 'botones' }, ...['ambos', 'portatil', 'movil'].map((m) => el('button', { class: `boton peque ${i.modo === m ? '' : 'fantasma'}`, onclick: () => accion({ accion: 'modo', modo: m }, 'Modo cambiado') }, NOMBRE_MODO[m]))),
    el('h3', { style: 'margin-top:14px' }, 'Idioma'),
    el('div', { class: 'botones' }, ...(estado.contenido.idiomas || ['es']).map((id) => el('button', { class: `boton peque ${i.idioma === id ? '' : 'fantasma'}`, onclick: () => accion({ accion: 'idioma', idioma: id }, 'Idioma cambiado') }, NOMBRE_IDIOMA[id] || id)))
  ]);
}

function avisarTodos() {
  const asunto = el('input', { type: 'text', placeholder: 'Asunto', value: estado.config.fecha ? 'Ya tenemos fecha para el taller' : '' });
  const cuerpo = el('textarea', { placeholder: 'Mensaje. Debajo irán la fecha, el lugar y el enlace personal de cada uno.' });
  const hayPt = estado.inscritos.some((i) => i.idioma === 'pt-BR' && i.estado !== 'cancelado');
  const asuntoPt = el('input', { type: 'text', placeholder: 'Assunto (para os alunos em português)' });
  const cuerpoPt = el('textarea', { placeholder: 'Mensagem em português. Si lo dejas vacío, recibirán la versión en español.' });
  const destino = el('select', {}, el('option', { value: 'plaza' }, `Con plaza (${estado.ocupacion.plaza})`), el('option', { value: 'espera' }, `En espera (${estado.ocupacion.espera})`), el('option', { value: 'todos' }, `Todos menos cancelados (${estado.ocupacion.plaza + estado.ocupacion.espera})`));
  const { cerrar } = modal([el('h2', {}, 'Avisar por correo'), el('p', { class: 'apagado' }, `Quedan ${estado.cuota_correo} envíos hoy (límite de Gmail).`),
    el('label', { class: 'campo' }, el('span', {}, 'Destinatarios'), destino), el('label', { class: 'campo' }, el('span', {}, 'Asunto'), asunto), el('label', { class: 'campo' }, el('span', {}, 'Mensaje'), cuerpo),
    hayPt ? el('label', { class: 'campo' }, el('span', {}, 'Asunto en portugués (hay alumnos en pt-BR)'), asuntoPt) : null,
    hayPt ? el('label', { class: 'campo' }, el('span', {}, 'Mensaje en portugués'), cuerpoPt) : null,
    el('button', { class: 'boton bloque', onclick: async () => {
      try { const r = await post('p_aviso', { k: clave, asunto: asunto.value, cuerpo: cuerpo.value, destinatarios: destino.value, asunto_pt: asuntoPt.value, cuerpo_pt: cuerpoPt.value }); toast(`Enviados ${r.enviados} de ${r.total}`); cerrar(); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuSend'), 'Enviar')]);
}

/* ───────────── Configuración ───────────── */

function pintarConfig() {
  const cfg = estado.config;
  const f = el('form', { class: 'tarjeta', novalidate: true });
  f.append(el('h2', {}, 'Configuración del taller'), el('p', { class: 'sub' }, 'Todo lo que cambia entre ediciones. Se refleja en la app al instante.'));
  const campos = {};
  Object.entries(ETIQUETA_CONFIG).forEach(([k, [etiqueta, tipo]]) => {
    const inp = tipo === 'textarea' ? el('textarea', { name: k }, cfg[k] || '') : el('input', { type: tipo, name: k, value: cfg[k] || '' });
    campos[k] = inp;
    f.append(el('label', { class: 'campo' }, el('span', {}, etiqueta), inp));
  });
  const asig = el('select', { name: 'modo_asignacion' }, el('option', { value: 'orden', selected: cfg.modo_asignacion === 'orden' }, 'En orden (kit 1, 2, 3…)'), el('option', { value: 'aleatorio', selected: cfg.modo_asignacion === 'aleatorio' }, 'Al azar'));
  campos.modo_asignacion = asig;
  f.append(el('label', { class: 'campo' }, el('span', {}, 'Asignación de kits'), asig));
  const taller = el('select', { name: 'taller_id' }, ...estado.talleres.map((t) => el('option', { value: t, selected: t === cfg.taller_id }, t)));
  campos.taller_id = taller;
  f.append(el('label', { class: 'campo' }, el('span', {}, 'Contenido (kits y misiones)'), taller, el('span', { class: 'ayuda' }, `Hay ${estado.contenido.kits_total} kits en el contenido actual. Para el Taller 2 se añadirá otra carpeta en data/.`)));
  f.append(el('button', { class: 'boton grande bloque', type: 'submit' }, icono('LuSave'), 'Guardar configuración'));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const cambios = {};
    Object.entries(campos).forEach(([k, inp]) => { cambios[k] = inp.value; });
    guardarConfig(cambios);
  });
  app.append(f);
}

/* ───────────── Secretos ───────────── */

function pintarSecretos() {
  const s = estado.secretos;
  const f = el('form', { class: 'tarjeta', novalidate: true });
  f.append(el('h2', {}, 'Palabras secretas y código del jefe'), el('p', { class: 'sub' }, 'Se guardan en el servidor y nunca se muestran. Escribe solo las que quieras cambiar. Se admiten mayúsculas y tildes indistintamente.'));
  const campos = {};
  estado.contenido.medallas.forEach((m) => {
    campos[m.id] = el('input', { type: 'text', autocomplete: 'off', placeholder: s[m.id] ? 'Configurada · escribe para cambiarla' : 'Sin configurar' });
    f.append(el('label', { class: `campo c-${m.color}` }, el('span', {}, insignia(m.icono, m.color, 'peque'), ` Medalla ${m.nombre}`), campos[m.id], el('span', { class: 'ayuda' }, Object.values(m.como_se_gana).join(' · '))));
  });
  campos.jefe = el('input', { type: 'text', autocomplete: 'off', placeholder: s.jefe ? 'Configurado · escribe para cambiarlo' : 'Sin configurar' });
  f.append(el('label', { class: 'campo c-ye' }, el('span', {}, insignia('LuCrown', 'ye', 'peque'), ' Código del jefe final'), campos.jefe));
  campos.nueva_clave = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Mínimo 8 caracteres' });
  f.append(el('label', { class: 'campo' }, el('span', {}, 'Nueva clave del profesor (opcional)'), campos.nueva_clave));
  f.append(el('button', { class: 'boton grande bloque', type: 'submit' }, icono('LuKeyRound'), 'Guardar secretos'));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = { k: clave };
    Object.entries(campos).forEach(([k, inp]) => { if (inp.value.trim()) datos[k] = inp.value.trim(); });
    try {
      const r = await post('p_secretos', datos);
      estado.secretos = r.secretos;
      if (datos.nueva_clave) { clave = datos.nueva_clave; sessionStorage.setItem('profe_clave', clave); }
      toast('Secretos guardados');
      pintar();
    } catch (err) { toast(err.message, 'error'); }
  });
  app.append(f);
}

/* ───────────── Soluciones ───────────── */

async function pintarSoluciones() {
  const caja = el('div', {}, el('p', { class: 'sub' }, 'Cargando…'));
  app.append(caja);
  try {
    const r = await get('p_soluciones', { k: clave });
    vaciar(caja);
    caja.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Cómo se ganan las medallas'), ...r.medallas.map((m) => el('p', {}, el('strong', { class: `c-${m.color} acento` }, m.nombre), ': ', Object.entries(m.como_se_gana).map(([k, v]) => `${k === 'todos' ? '' : `[${k.replace('_', ' ')}] `}${v}`).join(' ')))));
    r.kits.forEach((k) => {
      caja.append(el('div', { class: `tarjeta ${k.alumno ? 'tinte' : ''}` },
        el('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:baseline' }, el('h3', {}, `Kit ${k.numero} · ${k.personaje.nombre}`), el('span', { class: 'apagado' }, k.alumno ? `${k.alumno}${k.idioma && k.idioma !== 'es' ? ` · ${NOMBRE_IDIOMA[k.idioma]}` : ''}` : 'sin asignar')),
        el('p', { class: 'apagado' }, `${k.personaje.edad} años · ${k.personaje.oficio} · ${k.personaje.problema}`),
        el('p', {}, el('strong', { class: 'acento' }, 'Guardián debe tapar: '), k.guia.debe_tapar_guardian),
        el('p', {}, el('strong', { class: 'c-rd acento' }, 'M8: '), `${k.mensaje_m8.canal} de ${k.mensaje_m8.de}. ${k.guia.m8_tipo_y_senales}`)));
    });
    pintarIconos(caja);
  } catch (e) { errorPantalla(caja, e.message); }
}

/* ───────────── Datos ───────────── */

function pintarDatos() {
  const para = el('input', { type: 'email', placeholder: 'tu@correo.es' });
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Probar el envío de correo'), el('div', { class: 'botones' }, para, el('button', { class: 'boton secundario', onclick: async () => { try { const r = await post('p_prueba_correo', { k: clave, para: para.value }); toast(r.enviado ? 'Correo enviado' : 'No se pudo enviar (¿sin cuota?)', r.enviado ? 'ok' : 'error'); } catch (e) { toast(e.message, 'error'); } } }, 'Enviar prueba'))));
  app.append(el('div', { class: 'tarjeta c-rd' }, el('h2', {}, 'Borrar los datos de esta edición'), el('p', { class: 'sub' }, `Al terminar el taller y entregar los certificados. Borra inscritos, progreso y encuestas de la edición actual (${estado.config.taller_id}); las ediciones anteriores se conservan para reconocer a quien repite. La configuración se mantiene.`),
    el('button', { class: 'boton peligro', onclick: async () => {
      const texto = window.prompt('Escribe BORRAR para confirmar');
      if (texto === null) return;
      try { await post('p_borrar_todo', { k: clave, confirmar: texto }); toast('Datos borrados'); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuTrash2'), 'Borrar todo')));
}

iniciar();
