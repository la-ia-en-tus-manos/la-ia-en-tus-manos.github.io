import { API_URL } from './config.js';
import { idiomaActual, t } from './i18n.js';

// Edición (taller) de la página: index.html?taller=taller2, o la elegida en el panel. Sin ella, el servidor
// usa la del token del alumno o la edición por defecto.
let taller = '';
export function setTaller(id) { taller = id || ''; }
export function tallerActual() { return taller; }
// La dirección propia de un taller (…/taller2/) fija el taller en window.TALLER_FIJO; si no, vale «?taller=».
export function tallerDeUrl() { return window.TALLER_FIJO || new URLSearchParams(location.search).get('taller') || ''; }
// Color de acento del taller en toda la página.
export function aplicarColorTaller(color) {
  document.documentElement.className = document.documentElement.className.replace(/\btaller-\w+/g, '').trim();
  if (color && color !== 'cy') document.documentElement.classList.add(`taller-${color}`);
}

export class ErrorApi extends Error {
  constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; }
}

async function procesar(respuesta) {
  let json;
  try { json = await respuesta.json(); } catch (e) { throw new ErrorApi(t('sin_servidor'), 0); }
  if (!json.ok) throw new ErrorApi(json.error || 'Error', json.codigo || 500);
  return json.datos;
}

// Todas las llamadas llevan el idioma del alumno: el servidor traduce con él los mensajes de error.
export async function get(accion, params = {}) {
  const url = new URL(API_URL, location.href);
  url.searchParams.set('a', accion);
  url.searchParams.set('idioma', idiomaActual());
  if (taller) url.searchParams.set('taller', taller);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  let r;
  try { r = await fetch(url, { method: 'GET', redirect: 'follow' }); } catch (e) { throw new ErrorApi(t('sin_conexion'), 0); }
  return procesar(r);
}

export async function post(accion, cuerpo = {}) {
  let r;
  try {
    // text/plain evita la petición previa CORS, que Apps Script no contesta.
    r = await fetch(API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ a: accion, idioma: idiomaActual(), ...(taller ? { taller } : {}), ...cuerpo }) });
  } catch (e) { throw new ErrorApi(t('sin_conexion'), 0); }
  return procesar(r);
}
