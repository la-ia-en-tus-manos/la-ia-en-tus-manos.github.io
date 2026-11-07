// Baja de la lista de novedades (baja.html?s=…, desde el pie de cada correo). Pide confirmar con un botón: los
// antivirus y las vistas previas del correo abren los enlaces y no deben dar de baja a nadie.
import { get, post } from './api.js';
import { setIdioma } from './i18n.js';
import { el, vaciar, icono, pintarIconos, cargarInicio, errorPantalla } from './ui.js';

const app = document.getElementById('app');
const s = new URLSearchParams(location.search).get('s') || '';

const TEXTOS = {
  es: { titulo: 'Lista de novedades', pregunta: '¿Quieres dejar de recibir las novedades de «La IA en tus manos»?', pregunta_nombre: '{nombre}, ¿quieres dejar de recibir las novedades de «La IA en tus manos»?', boton: 'Sí, darme de baja',
    hecho: 'Listo: ya no estás en la lista y no te enviaremos más novedades. Gracias por haber estado ahí.', ya: 'Ya no estás en la lista: no te enviaremos más novedades.',
    error: 'Algo ha fallado', reintentar: 'Reintentar' },
  'pt-BR': { titulo: 'Lista de novidades', pregunta: 'Quer deixar de receber as novidades de «A IA nas suas mãos»?', pregunta_nombre: '{nombre}, quer deixar de receber as novidades de «A IA nas suas mãos»?', boton: 'Sim, cancelar a inscrição',
    hecho: 'Pronto: você não está mais na lista e não enviaremos mais novidades. Obrigado por ter estado conosco.', ya: 'Você não está mais na lista: não enviaremos mais novidades.',
    error: 'Algo deu errado', reintentar: 'Tentar de novo' }
};
let idioma = 'es';
const tx = (k, v = {}) => Object.entries(v).reduce((a, [c, d]) => a.split(`{${c}}`).join(d), (TEXTOS[idioma] || TEXTOS.es)[k]);

function hecho(texto) {
  vaciar(app).append(el('h1', {}, tx('titulo')), el('div', { class: 'aviso ok' }, texto));
}

async function cargar() {
  cargarInicio(app);
  let d;
  try { d = await get('boletin', { s }); } catch (e) { return errorPantalla(app, e.message, () => cargar(), { titulo: tx('error'), reintentar: tx('reintentar') }); }
  idioma = d.idioma === 'pt-BR' ? 'pt-BR' : 'es';
  setIdioma(idioma, false);
  if (d.baja) return hecho(tx('ya'));
  const boton = el('button', { class: 'boton', onclick: async () => {
    boton.disabled = true;
    try { await post('boletin_baja', { s }); hecho(tx('hecho')); } catch (e) { boton.disabled = false; errorPantalla(app, e.message, () => cargar(), { titulo: tx('error'), reintentar: tx('reintentar') }); }
  } }, icono('LuMailX'), tx('boton'));
  vaciar(app).append(el('h1', {}, tx('titulo')),
    el('div', { class: 'tarjeta' }, el('p', {}, d.nombre ? tx('pregunta_nombre', { nombre: d.nombre }) : tx('pregunta')), boton));
  pintarIconos(app);
}

cargar();
