// Helpers de interfaz compartidos por las tres páginas.

export function el(tag, atributos = {}, ...hijos) {
  const n = document.createElement(tag);
  Object.entries(atributos).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  });
  hijos.flat().forEach((h) => { if (h !== null && h !== undefined && h !== false) n.append(h instanceof Node ? h : document.createTextNode(String(h))); });
  return n;
}

export function vaciar(nodo) { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); return nodo; }

// "LuShieldCheck" -> "shield-check" (nombres de Lucide)
export function nombreIcono(lu) {
  return String(lu || 'circle').replace(/^Lu/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function icono(nombre, clase) {
  return el('i', { 'data-lucide': nombreIcono(nombre), class: clase || '' });
}

export function pintarIconos(raiz) {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

export function insignia(iconoLu, color, extra = '') {
  return el('div', { class: `insignia c-${color || 'cy'} ${extra}` }, icono(iconoLu));
}

export function pildora(texto, color) {
  return el('span', { class: `pildora c-${color || 'cy'}` }, texto);
}

let toastTimer = null;
export function toast(mensaje, tipo = 'ok', ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = el('div', { class: `toast ${tipo}`, role: 'status' }, mensaje);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

export function modal(contenido, opciones = {}) {
  const caja = el('div', { class: `modal ${opciones.ancho ? 'ancho' : ''} ${opciones.clase || ''}`, role: 'dialog', 'aria-modal': 'true' });
  const fondo = el('div', { class: 'modal-fondo' }, caja);
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => { if (e.target === fondo && !opciones.fijo) cerrar(); });
  // append nativo pinta «null» y «undefined» como texto: se quitan los huecos (p. ej. el botón de ayuda cuando no la hay).
  (Array.isArray(contenido) ? contenido : [contenido]).filter((c) => c !== null && c !== undefined && c !== false).forEach((c) => caja.append(c));
  if (!opciones.sinCerrar) caja.append(el('div', { class: 'botones' }, el('button', { class: 'boton fantasma bloque', onclick: cerrar }, opciones.textoCerrar || 'Cerrar')));
  document.body.append(fondo);
  pintarIconos(caja);
  return { cerrar, caja };
}

// Ventana de conversación tipo chat: cabecera con cierre, lista que hace scroll y la caja de escribir
// abajo, todo en un alto fijo (la ventana no crece con los mensajes). `enviar(texto)` manda y repinta.
export function ventanaChat({ titulo, placeholder, textoEnviar, textoCerrar, enviar }) {
  const lista = el('div', { class: 'conversacion', role: 'log', 'aria-live': 'polite' });
  const caja = el('textarea', { rows: 1, maxlength: 500, placeholder });
  const boton = el('button', { class: 'boton', 'aria-label': textoEnviar, title: textoEnviar }, icono('LuSend'));
  const mandar = async () => {
    const texto = caja.value.trim();
    if (!texto) return;
    boton.disabled = true;
    try { await enviar(texto); caja.value = ''; caja.style.height = ''; } catch (e) { toast(e.message, 'error'); }
    boton.disabled = false;
    caja.focus();
  };
  boton.onclick = mandar;
  // Con teclado físico, Intro envía y Mayús+Intro salta de línea; en el móvil, Intro salta de línea y se envía con el botón.
  caja.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer: fine)').matches) { e.preventDefault(); mandar(); } });
  caja.addEventListener('input', () => { caja.style.height = 'auto'; caja.style.height = `${Math.min(caja.scrollHeight, 120)}px`; });
  let cerrarVentana = () => {};
  const { cerrar, caja: ventana } = modal([
    el('div', { class: 'chat-cabecera' }, el('h2', {}, titulo),
      el('button', { class: 'boton fantasma peque', 'aria-label': textoCerrar || 'Cerrar', title: textoCerrar || 'Cerrar', onclick: () => cerrarVentana() }, icono('LuX'))),
    lista,
    el('div', { class: 'chat-escribir' }, caja, boton),
  ], { clase: 'chat', sinCerrar: true });
  cerrarVentana = cerrar;
  return { lista, caja, ventana, cerrar };
}

export function burbuja(texto, { mia = false, todos = false, quien = '', cuando = '' } = {}) {
  return el('div', { class: `burbuja ${mia ? 'mia' : ''} ${todos ? 'todos' : ''}` }, el('small', {}, quien), el('p', {}, texto), cuando ? el('time', {}, cuando) : null);
}

// «14:05» si es de hoy; «28/10 14:05» si no.
export function horaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? hora : `${d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} ${hora}`;
}

export async function copiar(texto, mensajes = {}) {
  const okMsg = mensajes.ok || 'Copiado. Ahora pégalo en Gemini';
  const errMsg = mensajes.error || 'No se ha podido copiar. Selecciona el texto y cópialo';
  try {
    await navigator.clipboard.writeText(texto);
    toast(okMsg);
    return true;
  } catch (e) {
    const ta = el('textarea', { style: 'position:fixed;left:-9999px' }, texto);
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    toast(ok ? okMsg : errMsg, ok ? 'ok' : 'error');
    return !!ok;
  }
}

export function b64aBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'image/png' });
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
}

export function puedeCompartirArchivos() {
  return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
}

export function fechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function haceCuanto(iso) {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

export const NOMBRE_MODO = { movil: 'Solo móvil', portatil: 'Solo portátil', ambos: 'Móvil y portátil' };
export const ICONO_MODO = { movil: 'LuSmartphone', portatil: 'LuLaptop', ambos: 'LuMonitorSmartphone' };
export const ICONO_PREVIA = { cuenta: 'LuKeyRound', movil_mano: 'LuSmartphone', app: 'LuDownload', hola: 'LuMessageCircle', portatil: 'LuLaptop', foto: 'LuImage', bateria: 'LuBatteryCharging', notebook: 'LuBookOpen', gems: 'LuAtSign', edad: 'LuIdCard', treblo: 'LuMusic' };
export const COLOR_PREVIA = { cuenta: 'cy', movil_mano: 'bl', app: 'vi', hola: 'gr', portatil: 'ye', foto: 'pk', bateria: 'or', notebook: 'bl', gems: 'vi', edad: 'gr', treblo: 'pk' };

export function cargarInicio(contenedor, texto = 'Cargando…') {
  vaciar(contenedor).append(el('p', { class: 'sub', style: 'text-align:center;padding:40px 0' }, texto));
}

export function errorPantalla(contenedor, mensaje, reintentar, textos = {}) {
  vaciar(contenedor).append(el('div', { class: 'aviso error' }, el('strong', {}, textos.titulo || 'Algo no ha ido bien. '), mensaje));
  if (reintentar) contenedor.append(el('button', { class: 'boton secundario', onclick: reintentar }, textos.reintentar || 'Volver a intentarlo'));
}

export function guardarLocal(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* privado */ } }
export function leerLocal(clave) { try { return JSON.parse(localStorage.getItem(clave)); } catch (e) { return null; } }
export function borrarLocal(clave) { try { localStorage.removeItem(clave); } catch (e) { /* nada */ } }
