import { API_URL } from './config.js';

export class ErrorApi extends Error {
  constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; }
}

async function procesar(respuesta) {
  let json;
  try { json = await respuesta.json(); } catch (e) { throw new ErrorApi('No se ha podido hablar con el servidor. Comprueba la conexión', 0); }
  if (!json.ok) throw new ErrorApi(json.error || 'Error desconocido', json.codigo || 500);
  return json.datos;
}

export async function get(accion, params = {}) {
  const url = new URL(API_URL, location.href);
  url.searchParams.set('a', accion);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  let r;
  try { r = await fetch(url, { method: 'GET', redirect: 'follow' }); } catch (e) { throw new ErrorApi('Sin conexión. Inténtalo de nuevo', 0); }
  return procesar(r);
}

export async function post(accion, cuerpo = {}) {
  let r;
  try {
    // text/plain evita la petición previa CORS, que Apps Script no contesta.
    r = await fetch(API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ a: accion, ...cuerpo }) });
  } catch (e) { throw new ErrorApi('Sin conexión. Inténtalo de nuevo', 0); }
  return procesar(r);
}
