import { get, post, setTaller, tallerActual, aplicarColorTaller } from './api.js';
import { REFRESCO_VIVO_S } from './config.js';
import { el, vaciar, icono, pintarIconos, pildora, insignia, toast, modal, descargarBlob, cargarInicio, errorPantalla, guardarLocal, leerLocal, borrarLocal, haceCuanto, fechaHora, NOMBRE_MODO } from './ui.js';
import { VERSION_APP } from './version.js';

const app = document.getElementById('app');
let clave = sessionStorage.getItem('profe_clave') || '';
setTaller(new URLSearchParams(location.search).get('taller') || leerLocal('profe_taller') || '');
let estado = null;
let pestana = leerLocal('profe_pestana') || 'inicio';
let vivoTimer = null;        // Worker que marca el ritmo del refresco (los temporizadores de un worker no se frenan en segundo plano)
let ayudasVistas = new Set(); // ids de alumnos cuya petición de ayuda ya se avisó
let audio = null;             // AudioContext, solo tras un gesto del usuario
const TITULO_BASE = document.title;

const ETIQUETA_CONFIG = {
  nombre_taller: ['Nombre del taller', 'text'], nombre_taller_pt: ['Nombre del taller · en portugués', 'text'], numero_taller: ['Número de taller', 'text'], nivel: ['Nivel', 'text'], nivel_pt: ['Nivel · en portugués', 'text'],
  fecha: ['Fecha', 'date'], hora_inicio: ['Hora de inicio', 'time'], duracion_min: ['Duración (minutos)', 'number'],
  lugar: ['Lugar', 'text'], direccion: ['Dirección', 'text'], mapa_url: ['Enlace al mapa', 'url'], reunion_url: ['Enlace de la videollamada (Google Meet)', 'url'],
  plazas: ['Plazas', 'number'], kits_activos: ['Kits activos', 'number'], max_espera: ['Máximo en lista de espera', 'number'],
  mensaje_espera: ['Mensaje en la pantalla de espera', 'textarea'], pista_caso: ['Pista del caso bloqueado', 'textarea'],
  whatsapp_url: ['Enlace del grupo de WhatsApp', 'url'],
  responsable_nombre: ['Responsable de los datos (nombre o entidad)', 'text'], responsable_correo: ['Correo de contacto para privacidad', 'email'],
  remitente_nombre: ['Nombre del remitente de los correos', 'text'], remitente_nombre_pt: ['Remitente de los correos · en portugués', 'text'], retencion_texto: ['Texto sobre cuánto tiempo se guardan los datos', 'textarea'],
  url_app: ['Dirección pública de la app (para los enlaces de los correos)', 'url'],
  mensaje_espera_pt: ['Mensaje en la pantalla de espera · en portugués (vacío = se usa el español)', 'textarea'],
  pista_caso_pt: ['Pista del caso bloqueado · en portugués', 'textarea'],
  retencion_texto_pt: ['Texto sobre los datos · en portugués', 'textarea'],
  certificado_titulo: ['Diploma · título', 'text'], certificado_texto: ['Diploma · texto (vale {nombre}, {taller}, {numero_taller}, {nivel}, {fecha})', 'textarea'],
  certificado_firmante: ['Diploma · quien firma', 'text'], certificado_firmante_cargo: ['Diploma · cargo de quien firma', 'text'], certificado_lugar: ['Diploma · lugar', 'text'],
  certificado_logo_url: ['Diploma · logo (dirección de una imagen; vacío = emblema de la app)', 'url'],
  certificado_firma_url: ['Diploma · firma (dirección de una imagen de tu rúbrica; vacío = rúbrica dibujada)', 'url'],
  certificado_titulo_pt: ['Diploma · título en portugués', 'text'], certificado_texto_pt: ['Diploma · texto en portugués', 'textarea'], certificado_firmante_cargo_pt: ['Diploma · cargo en portugués', 'text']
};
const NOMBRE_IDIOMA = { es: 'ES', 'pt-BR': 'PT-BR' };
const NOMBRE_COLOR = { cy: 'Turquesa (Explorador)', vi: 'Violeta (Constructor)', ye: 'Dorado (Maestro)', bl: 'Azul', gr: 'Verde', pk: 'Rosa', or: 'Naranja', rd: 'Rojo' };
const NOMBRE_GENERO = { f: 'mujer', m: 'hombre', x: 'indiferente', '': '—' };
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
  aplicarColorTaller(cfg.color);
  if (tallerActual() !== cfg.taller_id) { setTaller(cfg.taller_id); guardarLocal('profe_taller', cfg.taller_id); }
  app.append(el('div', { class: 'cabecera-alumno' },
    el('div', {}, pildora(`Taller ${cfg.numero_taller} · ${cfg.nivel}`), el('h1', { style: 'font-size:1.6rem' }, cfg.nombre_taller, el('span', { class: 'apagado', style: 'font-size:0.9rem;font-weight:400;margin-left:10px' }, cfg.taller_id))),
    el('div', { style: 'text-align:right' }, el('span', { class: `chip c-${cfg.estado === 'taller_en_curso' ? 'gr' : cfg.estado === 'inscripcion_abierta' ? 'cy' : 'ye'}` }, NOMBRE_ESTADO[cfg.estado]), el('br'),
      el('button', { class: 'boton fantasma peque', style: 'margin-top:8px', onclick: () => { clave = ''; sessionStorage.removeItem('profe_clave'); pintarAcceso(); } }, 'Salir'))));
  app.append(navegacionTalleres(cfg));
  const pestanas = [['inicio', 'Inicio'], ['vivo', 'En vivo'], ['inscritos', 'Inscritos'], ['diplomas', 'Diplomas'], ['encuestas', 'Encuestas'], ['config', 'Configuración'], ['secretos', 'Secretos'], ['soluciones', 'Soluciones'], ['datos', 'Datos']];
  app.append(el('div', { class: 'pestanas' }, ...pestanas.map(([id, nombre]) => el('button', { class: id === pestana ? 'activa' : '', onclick: () => { pestana = id; guardarLocal('profe_pestana', id); pintar(); } }, nombre))));
  ({ inicio: pintarInicio, vivo: pintarVivo, inscritos: pintarInscritos, diplomas: pintarDiplomas, encuestas: pintarEncuestas, config: pintarConfig, secretos: pintarSecretos, soluciones: pintarSoluciones, datos: pintarDatos })[pestana]();
  pintarIconos(app);
}

/* ───────────── Inicio ───────────── */

function pintarInicio() {
  const cfg = estado.config;
  const oc = estado.ocupacion;
  const plazas = Math.min(+cfg.plazas, +cfg.kits_activos);
  const esDefecto = (estado.talleres.find((tl) => tl.id === cfg.taller_id) || {}).defecto;
  const base = (cfg.url_app || location.origin + location.pathname.replace(/profe\.html$/, '')).replace(/\/+$/, '');
  const enlace = `${base}/${encodeURIComponent(cfg.taller_id)}/`;
  const faltanSecretos = estado.contenido.medallas.some((m) => !estado.secretos[m.id]) || !estado.secretos.jefe;
  const ir = (id) => () => { pestana = id; guardarLocal('profe_pestana', id); pintar(); window.scrollTo(0, 0); };
  const selector = el('select', {}, ...estado.estados.map((s) => el('option', { value: s, selected: s === cfg.estado }, NOMBRE_ESTADO[s])));
  const dato = (titulo, ...cuerpo) => el('div', { class: 'ficha-dato' }, el('small', {}, titulo), el('div', {}, ...cuerpo));
  app.append(el('div', { class: 'tarjeta ficha-taller' },
    dato('Estado', el('div', { class: 'botones', style: 'margin:0' }, selector, el('button', { class: 'boton peque', onclick: () => guardarConfig({ estado: selector.value }) }, 'Cambiar')),
      el('span', { class: 'apagado', style: 'font-size:0.85rem' }, 'Hasta «Taller en curso» los alumnos no reciben su caso.')),
    dato('Cuándo y dónde', el('b', {}, cfg.fecha ? `${cfg.fecha}${cfg.hora_inicio ? ` · ${cfg.hora_inicio}` : ''}` : 'Sin fecha'), el('br'), cfg.lugar || el('span', { class: 'apagado' }, 'Sin lugar'), ' ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); ir('config')(); } }, 'cambiar')),
    dato('Plazas', el('b', {}, `${oc.plaza} de ${plazas}`), ` ocupadas · ${oc.espera} en espera (máx. ${cfg.max_espera})`, el('br'), el('a', { href: '#', onclick: (e) => { e.preventDefault(); ir('inscritos')(); } }, 'ver inscritos')),
    dato('Usuario demo (para enseñar en pantalla)', fichaDemo()),
    dato('Enlace de inscripción', el('a', { href: enlace, target: '_blank', style: 'word-break:break-all' }, enlace), ' ', el('button', { class: 'boton fantasma peque', onclick: () => navigator.clipboard.writeText(enlace).then(() => toast('Enlace copiado')) }, icono('LuCopy'), 'Copiar'),
      el('div', { class: 'apagado', style: 'font-size:0.85rem' }, `Dirección propia de este taller. La general (${base}/) abre ${esDefecto ? 'este taller' : 'el taller por defecto'} o, si hay varios abiertos, deja elegir.`)),
    dato('Videollamada (Meet)', cfg.reunion_url
      ? [el('a', { href: cfg.reunion_url, target: '_blank', style: 'word-break:break-all' }, cfg.reunion_url), el('br'),
        el('button', { class: 'boton peque c-gr', style: 'margin-top:6px', onclick: enviarReunion }, icono('LuVideo'), 'Enviar el enlace a los inscritos'), ' ',
        el('a', { href: '#', onclick: (e) => { e.preventDefault(); ir('config')(); } }, 'cambiar')]
      : [el('span', { class: 'apagado' }, 'Sin enlace'), ' ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); ir('config')(); } }, 'ponerlo')]),
    dato('Correos', el('b', {}, estado.cuota_correo), ' disponibles hoy', el('br'), el('a', { href: '#', onclick: (e) => { e.preventDefault(); ir('inscritos')(); } }, 'avisar a los inscritos')),
    dato('Secretos', faltanSecretos ? [el('span', { class: 'chip c-ye' }, 'faltan'), ' ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); ir('secretos')(); } }, 'ponerlos')] : el('span', { class: 'chip c-gr' }, 'configurados'))));

  const avisos = [];
  if (!cfg.url_app) avisos.push(['atencion', 'Falta la dirección pública de la app: los correos no llevarán enlace completo. Configuración → Comunes a todos los talleres.']);
  if (!estado.imagenes_ok) avisos.push(['error', 'No hay carpeta de imágenes configurada: ejecuta configurarInicial() en Apps Script.']);
  avisos.forEach(([tipo, texto]) => app.append(el('div', { class: `aviso ${tipo}` }, texto)));

  app.append(el('div', { class: 'rejilla' },
    el('div', { class: 'tarjeta kpi c-cy' }, el('b', {}, `${oc.plaza}/${plazas}`), el('small', {}, 'plazas ocupadas')),
    el('div', { class: 'tarjeta kpi c-ye' }, el('b', {}, `${oc.espera}/${cfg.max_espera}`), el('small', {}, 'en lista de espera')),
    el('div', { class: 'tarjeta kpi c-gr' }, el('b', {}, estado.inscritos.filter((i) => i.estado === 'plaza' && i.previas === i.previas_total).length), el('small', {}, 'preparados del todo')),
    el('div', { class: 'tarjeta kpi c-bl' }, el('b', {}, estado.inscritos.filter((i) => i.encuesta).length), el('small', {}, 'encuestas recibidas'))));
}

async function enviarReunion() {
  const n = estado.inscritos.filter((i) => i.estado === 'plaza').length;
  if (!window.confirm(`¿Enviar el enlace de la videollamada a los ${n} alumnos con plaza? Les llega con su enlace personal de la app.`)) return;
  try { const r = await post('p_reunion_correo', { k: clave }); toast(`Enlace enviado a ${r.enviados} de ${r.total}`); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
}

// Alumno de pega del profesor: abre la app como un participante con el kit elegido, sin ocupar plaza ni contar.
function fichaDemo() {
  const d = estado.demo || {};
  const kits = Array.from({ length: +estado.config.kits_activos || 20 }, (_, i) => i + 1);
  const kit = el('select', { style: 'width:auto;min-width:90px' }, ...kits.map((n) => el('option', { value: n, selected: n === (d.kit || 1) }, `Kit ${String(n).padStart(2, '0')}`)));
  const idioma = el('select', { style: 'width:auto' }, ...(estado.contenido.idiomas || ['es']).map((i) => el('option', { value: i, selected: i === (d.idioma || 'es') }, NOMBRE_IDIOMA[i] || i)));
  const abrir = el('button', { class: 'boton peque c-vi', onclick: async () => {
    try {
      const r = await post('p_demo', { k: clave, kit: kit.value, idioma: idioma.value });
      estado.demo = r;
      window.open(r.enlace, '_blank', 'noopener');
    } catch (e) { toast(e.message, 'error'); }
  } }, icono('LuExternalLink'), 'Abrir en pestaña nueva');
  return el('div', {}, el('div', { class: 'botones', style: 'margin:0' }, kit, idioma, abrir),
    el('span', { class: 'apagado', style: 'font-size:0.85rem' }, 'No ocupa plaza ni kit, no recibe correos y no cuenta en listas, encuestas ni diplomas. Ve lo mismo que un alumno en el estado actual del taller.'));
}

// Talleres agrupados por nivel (Taller 1, 2, 3); dentro, sus ediciones. Uno por línea, sin desplegables.
function navegacionTalleres(cfg) {
  const grupos = estado.contenidos.map((c) => ({ ...c, ediciones: estado.talleres.filter((tl) => tl.contenido === c.id) }));
  const sueltos = estado.talleres.filter((tl) => !estado.contenidos.some((c) => c.id === tl.contenido));
  if (sueltos.length) grupos.push({ id: '', numero: '?', nivel: 'otros', ediciones: sueltos });
  return el('div', { class: 'talleres-nav' }, ...grupos.map((g) => el('div', { class: 'grupo-taller' },
    el('div', { class: 'grupo-titulo' }, `Taller ${g.numero}`, el('span', {}, ` · ${g.nivel}`)),
    el('div', { class: 'ediciones' },
      ...g.ediciones.map((tl) => el('button', { class: `edicion ${tl.id === cfg.taller_id ? 'activa' : ''}`, title: `${tl.nombre_taller} · ${NOMBRE_ESTADO[tl.estado] || tl.estado}`, onclick: async () => { if (tl.id === cfg.taller_id) return; setTaller(tl.id); guardarLocal('profe_taller', tl.id); await recargar(false); } },
        tl.id, el('small', {}, NOMBRE_ESTADO[tl.estado] || tl.estado), tl.defecto ? el('small', { class: 'defecto' }, '· por defecto') : null)),
      g.id ? el('button', { class: 'edicion nueva', onclick: () => modalNuevoTaller(g) }, icono('LuPlus'), g.ediciones.length ? 'Otra edición' : 'Crear') : null))));
}

function modalNuevoTaller(contenido) {
  const usados = estado.talleres.map((tl) => tl.id);
  let sugerido = contenido.id;
  for (let n = 2; usados.includes(sugerido); n++) sugerido = `${contenido.id}-${n}`;
  const id = el('input', { type: 'text', value: sugerido, pattern: '[a-z0-9][a-z0-9_-]{1,30}' });
  const fecha = el('input', { type: 'date' });
  const plazas = el('input', { type: 'number', value: estado.config.plazas || '15' });
  const f = el('form', { novalidate: true },
    el('label', { class: 'campo' }, el('span', {}, 'Identificador (va en la dirección: index.html?taller=…)'), id),
    el('label', { class: 'campo' }, el('span', {}, 'Fecha (opcional)'), fecha),
    el('label', { class: 'campo' }, el('span', {}, 'Plazas'), plazas),
    el('button', { class: 'boton bloque c-gr', type: 'submit' }, icono('LuPlus'), 'Crear'));
  const { cerrar } = modal([el('h2', {}, `Nuevo taller ${contenido.numero} · ${contenido.nivel}`), el('p', { class: 'apagado' }, `Contenido «${contenido.nombre}». Tendrá su inscripción, su estado, sus secretos y sus diplomas. Quien ya hizo otro taller conserva su número de caso y su personaje si siguen libres.`), f]);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevo = id.value.trim();
    if (!/^[a-z0-9][a-z0-9_-]{1,30}$/.test(nuevo)) return toast('Identificador no válido: minúsculas, números, guiones', 'error');
    try {
      await post('p_taller_nuevo', { k: clave, id: nuevo, ajustes: { contenido: contenido.id, fecha: fecha.value, plazas: plazas.value } });
      cerrar();
      setTaller(nuevo); guardarLocal('profe_taller', nuevo);
      toast(`Taller «${nuevo}» creado`);
      await recargar(false);
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function guardarConfig(cambios) {
  if (cambios.estado === 'terminado' && estado.config.estado !== 'terminado') {
    const n = (estado.inscritos || []).filter((i) => i.estado === 'plaza' && !i.diploma_enviado).length;
    if (!window.confirm(`Al terminar el taller se envía el diploma por correo a ${n} alumno${n === 1 ? '' : 's'} con plaza, con el enlace para repetir las misiones en casa. ¿Terminar el taller?`)) return;
  }
  try {
    const r = await post('p_config', { k: clave, config: cambios });
    estado.config = r.config;
    if (r.diplomas_error) toast(`Taller terminado, pero los diplomas no se han enviado: ${r.diplomas_error}`, 'error');
    else toast(r.diplomas ? `Taller terminado · ${r.diplomas.enviados} diploma${r.diplomas.enviados === 1 ? '' : 's'} enviado${r.diplomas.enviados === 1 ? '' : 's'} por correo` : 'Guardado');
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
  if (v.alumnos.length) caja.append(el('div', { class: 'tarjeta' }, el('h3', { style: 'margin:0 0 4px' }, 'Para todos'),
    el('p', { class: 'apagado', style: 'margin:0 0 10px' }, 'Para cuando toda la sala se la ha ganado. A cada alumno le salta en su app, con confeti, en unos segundos. A uno solo se la das con «Acciones».'),
    el('div', { class: 'botones' }, ...medallas.map((m) => {
      const n = v.alumnos.filter((a) => a.medallas.includes(m.id)).length;
      const quitar = n === v.alumnos.length;
      return el('button', { class: `boton ${quitar ? 'secundario' : ''} c-${m.color}`, onclick: () => medallaParaTodos(m, quitar, v.alumnos.length) },
        icono(m.icono), quitar ? `Quitar ${m.nombre} a todos` : `${m.nombre} a todos`, el('small', { style: 'margin-left:6px;opacity:.8' }, `${n}/${v.alumnos.length}`));
    }), (() => {
      const n = v.alumnos.filter((a) => a.jefe).length;
      const quitar = n === v.alumnos.length;
      return el('button', { class: `boton ${quitar ? 'secundario' : ''} c-ye`, onclick: () => jefeParaTodos(quitar, v.alumnos.length) },
        icono('LuCrown'), quitar ? 'Quitar el jefe final a todos' : 'Jefe final a todos', el('small', { style: 'margin-left:6px;opacity:.8' }, `${n}/${v.alumnos.length}`));
    })())));

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

async function medallaParaTodos(m, quitar, total) {
  if (!window.confirm(quitar ? `¿Quitar la medalla ${m.nombre} a los ${total} alumnos?` : `¿Dar la medalla ${m.nombre} a los ${total} alumnos?`)) return;
  try {
    const r = await post('p_medalla_todos', { k: clave, medalla: m.id, quitar });
    toast(quitar ? `Medalla ${m.nombre} retirada a ${r.cambiados}` : `Medalla ${m.nombre} dada a ${r.cambiados} alumnos`);
    await recargar(); pintar();
  } catch (e) { toast(e.message, 'error'); }
}

async function jefeParaTodos(quitar, total) {
  if (!window.confirm(quitar ? `¿Quitar la validación del jefe final a los ${total} alumnos?` : `¿Validar el jefe final a los ${total} alumnos?`)) return;
  try {
    const r = await post('p_jefe_todos', { k: clave, quitar });
    toast(quitar ? `Validación retirada a ${r.cambiados}` : `Jefe final validado a ${r.cambiados} alumnos`);
    await recargar(); pintar();
  } catch (e) { toast(e.message, 'error'); }
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
      el('td', {}, el('strong', {}, i.nombre), ...(i.historial || []).map((h) => el('span', { class: `chip ${h.completado ? 'c-gr' : 'c-ye'}`, style: 'margin-left:6px', title: `${h.edicion} · ${h.medallas} medallas${h.jefe ? ' · jefe' : ''}${h.completado ? '' : ' · sin terminar'}` }, `${h.nivel || h.edicion}${h.completado ? ' ✓' : ''}`)),
        +cfg.numero_taller > 1 && !(i.historial || []).length ? el('span', { class: 'chip c-rd', style: 'margin-left:6px', title: 'No consta en ningún taller anterior' }, 'sin nivel anterior') : null,
        el('br'), el('small', { class: 'apagado' }, `inscrito ${fechaHora(i.creado)}`, i.avisos ? ' · quiere avisos' : '')),
      el('td', {}, el('small', {}, i.correo, i.telefono ? [el('br'), i.telefono] : null)),
      el('td', {}, el('small', {}, NOMBRE_MODO[i.modo], el('br'), el('span', { class: 'chip' }, NOMBRE_IDIOMA[i.idioma] || i.idioma), ' ',
        i.estado === 'plaza' ? el('span', { class: `chip ${i.personaje !== 'x' && i.genero_kit !== i.personaje ? 'c-rd' : 'c-gr'}`, title: `prefiere: ${NOMBRE_GENERO[i.personaje]}` }, `personaje ${NOMBRE_GENERO[i.genero_kit]}`) : el('small', { class: 'apagado' }, `prefiere ${NOMBRE_GENERO[i.personaje]}`))),
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
      i.estado === 'plaza' ? el('a', { class: 'boton secundario c-ye', href: `certificado.html?id=${encodeURIComponent(i.id)}&taller=${encodeURIComponent(tallerActual())}#k=${encodeURIComponent(clave)}`, target: '_blank' }, icono('LuAward'), 'Ver diploma') : null,
      i.estado !== 'cancelado' ? el('button', { class: 'boton secundario', onclick: () => accion({ accion: 'reenviar' }, 'Enlace reenviado por correo') }, icono('LuMail'), 'Reenviar enlace') : null,
      i.estado === 'espera' ? el('button', { class: 'boton c-gr', onclick: () => accion({ accion: 'subir' }, 'Ya tiene plaza') }, icono('LuArrowUp'), 'Darle plaza') : null,
      i.estado !== 'cancelado' ? el('button', { class: 'boton secundario peligro', onclick: () => accion({ accion: 'cancelar' }, 'Plaza cancelada', `¿Cancelar la inscripción de ${i.nombre}?`) }, 'Cancelar inscripción') : null,
      el('button', { class: 'boton peligro', onclick: () => accion({ accion: 'borrar' }, 'Datos borrados', `¿Borrar todos los datos de ${i.nombre}? No se puede deshacer.`) }, icono('LuTrash2'), 'Borrar sus datos')),
    el('h3', { style: 'margin-top:14px' }, 'Modo'),
    el('div', { class: 'botones' }, ...['ambos', 'portatil', 'movil'].map((m) => el('button', { class: `boton peque ${i.modo === m ? '' : 'fantasma'}`, onclick: () => accion({ accion: 'modo', modo: m }, 'Modo cambiado') }, NOMBRE_MODO[m]))),
    i.estado === 'plaza' ? el('h3', { style: 'margin-top:14px' }, `Personaje (prefiere ${NOMBRE_GENERO[i.personaje]})`) : null,
    i.estado === 'plaza' ? el('div', { class: 'botones' }, ...['f', 'm'].map((g) => el('button', { class: `boton peque ${i.genero_kit === g ? '' : 'fantasma'}`, onclick: () => accion({ accion: 'genero_kit', genero: g }, 'Personaje cambiado') }, NOMBRE_GENERO[g]))) : null,
    el('h3', { style: 'margin-top:14px' }, 'Idioma'),
    el('div', { class: 'botones' }, ...(estado.contenido.idiomas || ['es']).map((id) => el('button', { class: `boton peque ${i.idioma === id ? '' : 'fantasma'}`, onclick: () => accion({ accion: 'idioma', idioma: id }, 'Idioma cambiado') }, NOMBRE_IDIOMA[id] || id)))
  ]);
}

function avisarTodos() {
  const asunto = el('input', { type: 'text', placeholder: 'Asunto', value: estado.config.fecha ? 'Ya tenemos fecha para el taller' : '' });
  const cuerpo = el('textarea', { placeholder: 'Mensaje. Debajo irán la fecha, el lugar y el enlace personal de cada uno.' });
  const hayPt = estado.inscritos.some((i) => i.idioma === 'pt-BR' && i.estado !== 'cancelado') || (estado.interesados || 0) > 0;
  const asuntoPt = el('input', { type: 'text', placeholder: 'Assunto (para os alunos em português)' });
  const cuerpoPt = el('textarea', { placeholder: 'Mensagem em português. Si lo dejas vacío, recibirán la versión en español.' });
  const destino = el('select', {}, el('option', { value: 'plaza' }, `Con plaza (${estado.ocupacion.plaza})`), el('option', { value: 'espera' }, `En espera (${estado.ocupacion.espera})`), el('option', { value: 'todos' }, `Todos menos cancelados (${estado.ocupacion.plaza + estado.ocupacion.espera})`),
    el('option', { value: 'interesados' }, `Pidieron avisos en otros talleres y no están en este (${estado.interesados || 0}) · reciben el enlace de inscripción`));
  const { cerrar } = modal([el('h2', {}, 'Avisar por correo'), el('p', { class: 'apagado' }, `Quedan ${estado.cuota_correo} envíos hoy (límite de Gmail).`),
    el('label', { class: 'campo' }, el('span', {}, 'Destinatarios'), destino), el('label', { class: 'campo' }, el('span', {}, 'Asunto'), asunto), el('label', { class: 'campo' }, el('span', {}, 'Mensaje'), cuerpo),
    hayPt ? el('label', { class: 'campo' }, el('span', {}, 'Asunto en portugués (hay alumnos en pt-BR)'), asuntoPt) : null,
    hayPt ? el('label', { class: 'campo' }, el('span', {}, 'Mensaje en portugués'), cuerpoPt) : null,
    el('button', { class: 'boton bloque', onclick: async () => {
      try { const r = await post('p_aviso', { k: clave, asunto: asunto.value, cuerpo: cuerpo.value, destinatarios: destino.value, asunto_pt: asuntoPt.value, cuerpo_pt: cuerpoPt.value }); toast(`Enviados ${r.enviados} de ${r.total}`); cerrar(); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuSend'), 'Enviar')]);
}

/* ───────────── Diplomas ───────────── */

function pintarDiplomas() {
  const medallas = estado.contenido.medallas;
  const lista = estado.inscritos.filter((i) => i.estado === 'plaza');
  const ids = lista.map((i) => i.id).join(',');
  const pendientes = lista.filter((i) => !i.diploma_enviado);
  const enviarDiplomas = async (repetir) => {
    if (!window.confirm(repetir ? `¿Reenviar el diploma por correo a los ${lista.length} alumnos con plaza?` : `¿Enviar el diploma por correo a ${pendientes.length} alumnos?`)) return;
    try { const r = await post('p_diplomas_correo', { k: clave, repetir }); toast(`Enviados ${r.enviados} de ${r.total}`); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
  };
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Diplomas'),
    el('p', { class: 'sub' }, 'Uno por alumno con plaza, con las medallas que lleve ganadas en este momento. «Imprimir todos» abre todos los diplomas seguidos, uno por página, para un solo trabajo de impresión o un solo PDF. Al poner el taller en «Terminado» el diploma sale solo por correo a cada alumno, en su idioma, con el enlace para repetir las misiones en casa; «Enviar por correo» es para quien quedó pendiente (por ejemplo, si faltó cuota de correo) y «Reenviar a todos», para repetirlo.'),
    el('div', { class: 'botones' },
      lista.length ? el('a', { class: 'boton c-ye', href: `certificado.html?ids=${encodeURIComponent(ids)}&taller=${encodeURIComponent(tallerActual())}#k=${encodeURIComponent(clave)}`, target: '_blank' }, icono('LuPrinter'), `Imprimir todos (${lista.length})`) : null,
      lista.length ? el('button', { class: 'boton c-gr', onclick: () => enviarDiplomas(false) }, icono('LuMail'), `Enviar por correo (${pendientes.length} pendientes)`) : null,
      lista.length && pendientes.length < lista.length ? el('button', { class: 'boton fantasma', onclick: () => enviarDiplomas(true) }, icono('LuMail'), 'Reenviar a todos') : null,
      el('a', { class: 'boton secundario', href: 'certificado.html?demo=1', target: '_blank' }, icono('LuAward'), 'Ver muestra'))));
  if (estado.config.estado !== 'terminado' && lista.length) app.append(el('div', { class: 'aviso atencion' }, 'El envío por correo se activa con el taller en «Terminado»: hasta entonces el enlace del diploma no se abre para el alumno.'));
  if (!lista.length) return app.append(el('p', { class: 'sub' }, 'Todavía no hay alumnos con plaza.'));
  const tabla = el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'N.º'), el('th', {}, 'Nombre en el diploma'), el('th', {}, 'Medallas'), el('th', {}, 'Misiones'), el('th', {}, 'Jefe'), el('th', {}, 'Encuesta'), el('th', {}, 'Correo'), el('th', {}, ''))));
  const cuerpo = el('tbody');
  lista.forEach((i) => {
    cuerpo.append(el('tr', {},
      el('td', {}, el('strong', {}, i.numero)),
      el('td', {}, el('strong', {}, i.nombre_certificado || i.nombre), i.nombre_certificado && i.nombre_certificado !== i.nombre ? el('small', { class: 'apagado' }, el('br'), `(inscrito como ${i.nombre})`) : null),
      el('td', {}, el('div', { class: 'sellos' }, ...medallas.map((m) => el('span', { class: `c-${m.color} ${i.medallas.includes(m.id) ? 'si' : ''}`, title: m.nombre }, m.nombre[0])))),
      el('td', {}, `${i.misiones.length}`),
      el('td', {}, i.jefe ? el('span', { class: 'chip c-ye' }, '★ sí') : el('span', { class: 'apagado' }, 'no')),
      el('td', {}, i.encuesta ? el('span', { class: 'chip c-gr' }, 'hecha') : el('span', { class: 'apagado' }, 'no')),
      el('td', {}, i.diploma_enviado ? el('span', { class: 'chip c-gr', title: i.diploma_enviado }, `enviado ${fechaHora(i.diploma_enviado)}`) : el('button', { class: 'boton peque fantasma', onclick: async () => { try { await post('p_inscrito', { k: clave, id: i.id, accion: 'diploma' }); toast('Diploma enviado'); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); } } }, icono('LuMail'), 'Enviar')),
      el('td', {}, el('a', { class: 'boton peque secundario c-ye', href: `certificado.html?id=${encodeURIComponent(i.id)}&taller=${encodeURIComponent(tallerActual())}#k=${encodeURIComponent(clave)}`, target: '_blank' }, icono('LuAward'), 'Ver diploma'))));
  });
  tabla.append(cuerpo);
  app.append(el('div', { class: 'tabla-scroll tarjeta' }, tabla));
}

/* ───────────── Encuestas ───────────── */

async function pintarEncuestas() {
  const caja = el('div', {}, el('p', { class: 'sub' }, 'Cargando…'));
  app.append(caja);
  try {
    const r = await get('p_encuestas', { k: clave });
    vaciar(caja);
    caja.append(el('div', { class: 'tarjeta' }, el('h2', {}, `Encuesta de calidad · ${estado.config.taller_id}`),
      el('p', { class: 'sub' }, `${r.total} respuestas de ${r.inscritos} alumnos con plaza. Se rellena en el cierre, junto con el nombre del diploma.`),
      el('div', { class: 'botones' }, el('button', { class: 'boton secundario', onclick: async () => { try { const c = await get('p_encuestas', { k: clave, csv: true }); descargarBlob(new Blob(['\ufeff' + c.csv], { type: 'text/csv;charset=utf-8' }), c.nombre); } catch (e) { toast(e.message, 'error'); } } }, icono('LuDownload'), 'Exportar CSV'))));
    if (!r.total) return caja.append(el('p', { class: 'sub' }, 'Todavía no hay respuestas.'));
    const barra = (valor, max) => el('div', { class: 'barra', style: 'width:100%;max-width:260px' }, el('div', { style: `width:${Math.round(100 * (valor || 0) / max)}%` }));
    const filas = Object.keys(r.nombres).concat(['seguridad']).map((k) => el('tr', {}, el('td', {}, k === 'seguridad' ? 'Seguridad usando IA (al terminar)' : r.nombres[k].replace(/^./, (c) => c.toUpperCase())), el('td', {}, el('b', { style: 'font-size:1.3rem' }, r.medias[k] === null ? '—' : r.medias[k]), el('small', { class: 'apagado' }, ' / 5')), el('td', {}, barra(r.medias[k], 5))));
    caja.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Valoraciones (media de 1 a 5)'), el('table', {}, el('tbody', {}, ...filas))));
    const reco = r.recomendaria;
    caja.append(el('div', { class: 'tarjeta' }, el('h2', {}, '¿Lo recomendarías? (media de 1 a 5)'),
      el('div', { class: 'rejilla' },
        el('div', { class: 'tarjeta kpi c-cy' }, el('b', {}, reco.media === null ? '—' : reco.media), el('small', {}, 'media sobre 5')),
        el('div', { class: 'tarjeta kpi c-gr' }, el('b', {}, reco.recomiendan), el('small', {}, 'lo recomendarían (4–5)')),
        el('div', { class: 'tarjeta kpi c-rd' }, el('b', {}, reco.no_recomiendan), el('small', {}, 'no lo recomendarían (1–2)')))));
    if (r.misiones.length) caja.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Misión más útil'), el('ul', { style: 'padding-left:20px' }, ...r.misiones.map((m) => el('li', {}, el('b', {}, `${m.id} · ${m.titulo}`), ` · ${m.votos} ${m.votos === 1 ? 'voto' : 'votos'}`)))));
    if (r.comentarios.length) caja.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Comentarios'), ...r.comentarios.map((c) => el('div', { style: 'border-top:1px solid var(--borde);padding:10px 0' },
      el('small', { class: 'apagado' }, `Explorador n.º ${c.numero}`),
      c.lo_mejor ? el('p', { style: 'margin:4px 0' }, el('strong', { class: 'c-gr acento' }, 'Lo mejor: '), c.lo_mejor) : null,
      c.mejorar ? el('p', { style: 'margin:4px 0' }, el('strong', { class: 'c-ye acento' }, 'Mejoraría: '), c.mejorar) : null))));
    pintarIconos(caja);
  } catch (e) { errorPantalla(caja, e.message); }
}

/* ───────────── Configuración ───────────── */

const SECCIONES_CONFIG = [
  ['Fecha, lugar y plazas', ['fecha', 'hora_inicio', 'duracion_min', 'lugar', 'direccion', 'mapa_url', 'reunion_url', 'plazas', 'kits_activos', 'max_espera', 'modo_asignacion'], true],
  ['Nombre y contenido', ['nombre_taller', 'nombre_taller_pt', 'numero_taller', 'nivel', 'nivel_pt', 'contenido', 'color', 'taller_defecto'], false],
  ['Mensajes a los alumnos', ['mensaje_espera', 'pista_caso', 'whatsapp_url', 'mensaje_espera_pt', 'pista_caso_pt'], false],
  ['Diploma', ['certificado_titulo', 'certificado_texto', 'certificado_titulo_pt', 'certificado_texto_pt'], false],
  ['Comunes a todos los talleres', ['responsable_nombre', 'responsable_correo', 'remitente_nombre', 'remitente_nombre_pt', 'retencion_texto', 'retencion_texto_pt', 'url_app', 'certificado_firmante', 'certificado_firmante_cargo', 'certificado_firmante_cargo_pt', 'certificado_lugar', 'certificado_logo_url', 'certificado_firma_url'], false]
];

function campoConfig(k, cfg) {
  if (k === 'modo_asignacion') return [el('select', { name: k }, el('option', { value: 'orden', selected: cfg.modo_asignacion === 'orden' }, 'En orden (kit 1, 2, 3…)'), el('option', { value: 'aleatorio', selected: cfg.modo_asignacion === 'aleatorio' }, 'Al azar')), 'Asignación de kits'];
  if (k === 'contenido') return [el('select', { name: k }, ...estado.contenidos.map((c) => el('option', { value: c.id, selected: c.id === cfg.contenido }, `${c.id} · ${c.nombre} (${c.nivel})`))), 'Contenido (kits y misiones)', `Hay ${estado.contenido.kits_total} kits en el contenido actual.`];
  if (k === 'color') return [el('select', { name: k }, ...Object.entries(NOMBRE_COLOR).map(([c, n]) => el('option', { value: c, selected: c === cfg.color }, n))), 'Color de acento'];
  if (k === 'taller_defecto') return [el('select', { name: k }, ...estado.talleres.map((tl) => el('option', { value: tl.id, selected: tl.defecto }, `${tl.id} · ${tl.nombre_taller}`))), 'Taller que abre la dirección de la app sin «?taller=»'];
  const [etiqueta, tipo] = ETIQUETA_CONFIG[k];
  return [tipo === 'textarea' ? el('textarea', { name: k }, cfg[k] || '') : el('input', { type: tipo, name: k, value: cfg[k] || '' }), etiqueta];
}

function pintarConfig() {
  const cfg = estado.config;
  const f = el('form', { novalidate: true });
  const campos = {};
  f.append(el('p', { class: 'sub', style: 'margin:0 0 12px' }, `Configuración de «${cfg.taller_id}». Abre cada apartado; un solo «Guardar» para todo. Se refleja en la app al instante.`));
  SECCIONES_CONFIG.forEach(([titulo, claves, abierta]) => {
    const det = el('details', { class: 'tarjeta seccion-config', open: abierta || undefined }, el('summary', {}, titulo));
    claves.forEach((k) => {
      const [inp, etiqueta, ayuda] = campoConfig(k, cfg);
      campos[k] = inp;
      det.append(el('label', { class: 'campo' }, el('span', {}, etiqueta), inp, ayuda ? el('span', { class: 'ayuda' }, ayuda) : null));
    });
    if (titulo === 'Diploma') det.append(el('div', { class: 'botones' }, el('a', { class: 'boton secundario c-ye', href: 'certificado.html?demo=1', target: '_blank' }, icono('LuAward'), 'Ver muestra del diploma'), el('a', { class: 'boton secundario c-ye', href: 'certificado.html?demo=1&idioma=pt-BR', target: '_blank' }, icono('LuAward'), 'Muestra en portugués')));
    f.append(det);
  });
  f.append(el('div', { class: 'guardar-fijo' }, el('button', { class: 'boton grande bloque', type: 'submit' }, icono('LuSave'), 'Guardar configuración')));
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
  f.append(el('h2', {}, `Palabras secretas y código del jefe · ${estado.config.taller_id}`), el('p', { class: 'sub' }, 'Son de este taller: cada taller tiene las suyas. Se guardan en el servidor y nunca se muestran. Escribe solo las que quieras cambiar. Se admiten mayúsculas y tildes indistintamente.'));
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
        el('p', { class: 'apagado' }, [`${k.genero === 'm' ? 'hombre' : 'mujer'} · ${k.personaje.edad} años · ${k.personaje.oficio}`, k.personaje.problema, k.proyecto ? `proyecto: ${k.proyecto.titulo}` : ''].filter(Boolean).join(' · ')),
        ...pintarGuia(k.guia || {}, k),
        k.archivos && k.archivos.length ? el('p', { class: 'apagado' }, `Archivos: ${k.archivos.join(', ')}`) : null));
    });
    pintarIconos(caja);
  } catch (e) { errorPantalla(caja, e.message); }
}

// La guía del profesor de cada kit tiene una forma distinta por taller: se pinta lo que haya.
const ETIQUETA_GUIA = { debe_tapar_guardian: 'Guardián debe tapar', m8_tipo_y_senales: 'M8', preguntas_m2: 'Respuestas de M2', pregunta_trampa: 'Pregunta trampa (M2)', total_tickets: 'Total real de los tickets (M5)', bulo: 'Bulo de M4', esperado_bulo: 'Lo esperado', wikipedia: 'Página de Wikipedia (M3)' };
function pintarGuia(guia, k) {
  return Object.entries(guia).map(([clave, v]) => {
    const etiqueta = ETIQUETA_GUIA[clave] || clave.replace(/_/g, ' ');
    if (clave === 'm8_tipo_y_senales' && k.mensaje_m8) return el('p', {}, el('strong', { class: 'c-rd acento' }, 'M8: '), `${k.mensaje_m8.canal} de ${k.mensaje_m8.de}. ${v}`);
    if (Array.isArray(v)) return el('div', {}, el('strong', { class: 'acento' }, `${etiqueta}:`), el('ul', { style: 'margin:4px 0 8px;padding-left:20px' }, ...v.map((x) => el('li', {}, typeof x === 'object' ? [el('b', {}, x.pregunta || ''), ' → ', x.respuesta || x.esperado || ''] : String(x)))));
    if (v && typeof v === 'object') return el('p', {}, el('strong', { class: 'acento' }, `${etiqueta}: `), [v.pregunta ? el('b', {}, v.pregunta) : null, v.pregunta ? ' → ' : '', v.respuesta || v.esperado || Object.values(v).join(' · ')]);
    return el('p', {}, el('strong', { class: 'acento' }, `${etiqueta}: `), typeof v === 'number' ? v.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : String(v));
  });
}

/* ───────────── Datos ───────────── */

function pintarDatos() {
  const v = estado.version || {};
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Versiones en marcha'),
    el('p', {}, el('strong', {}, 'Backend (Apps Script): '), `${v.version || '?'} · ${v.fecha || 'fecha desconocida'}`, v.commit ? ` · commit ${v.commit}` : '', v.descripcion ? el('span', { class: 'apagado' }, ` · ${v.descripcion}`) : null),
    el('p', {}, el('strong', {}, 'Web (GitHub Pages): '), `${VERSION_APP.fecha} · commit ${VERSION_APP.commit}`),
    el('p', {}, el('strong', {}, 'Inscritos por taller: '), Object.entries(estado.ediciones || {}).map(([e, n]) => `${e} ${n}`).join(' · ') || 'ninguno')));
  const para = el('input', { type: 'email', placeholder: 'tu@correo.es' });
  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, 'Probar el envío de correo'), el('div', { class: 'botones' }, para, el('button', { class: 'boton secundario', onclick: async () => { try { const r = await post('p_prueba_correo', { k: clave, para: para.value }); toast(r.enviado ? 'Correo enviado' : 'No se pudo enviar (¿sin cuota?)', r.enviado ? 'ok' : 'error'); } catch (e) { toast(e.message, 'error'); } } }, 'Enviar prueba'))));
  app.append(el('div', { class: 'tarjeta c-rd' }, el('h2', {}, `Borrar los datos de «${estado.config.taller_id}»`), el('p', { class: 'sub' }, `Al terminar el taller y entregar los diplomas. Borra inscritos, progreso y encuestas de este taller; los demás talleres se conservan para comprobar quién hizo el nivel anterior. La configuración se mantiene. Ojo: si lo borras, sus alumnos ya no podrán inscribirse en el taller siguiente.`),
    el('button', { class: 'boton peligro', onclick: async () => {
      const texto = window.prompt('Escribe BORRAR para confirmar');
      if (texto === null) return;
      try { await post('p_borrar_todo', { k: clave, confirmar: texto }); toast('Datos borrados'); await recargar(); pintar(); } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuTrash2'), 'Borrar todo')));
}

iniciar();
