// Podcast del taller: se abre desde el correo (podcast.html?taller=…&t=…). Suena aquí y, con el token, anota
// hasta qué porcentaje se ha escuchado, para que el profesor vea quién lo ha oído.
import { get, post, setTaller, tallerDeUrl } from './api.js';
import { t, setIdioma } from './i18n.js';
import { el, vaciar, icono, pintarIconos, cargarInicio, errorPantalla } from './ui.js';

const app = document.getElementById('app');
const token = new URLSearchParams(location.search).get('t') || '';

const TEXTOS = {
  es: { hola: 'Hola, {nombre}.', intro: 'Pulsa ▶ para escucharlo. Son {minutos} minutos: puedes pararlo cuando quieras y seguir luego.', taller: 'Ir a mi taller' },
  'pt-BR': { hola: 'Olá, {nombre}.', intro: 'Toque em ▶ para ouvir. São {minutos} minutos: você pode pausar quando quiser e continuar depois.', taller: 'Ir para a minha oficina' }
};
let idioma = 'es';
const tx = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.split(`{${a}}`).join(b), (TEXTOS[idioma] || TEXTOS.es)[k] || k);

// Hitos que se anotan: empezar, cada cuarto y el final.
const HITOS = [1, 25, 50, 75, 100];
let anotado = 0;
function anotar(avance) {
  if (!token || avance <= anotado) return;
  anotado = avance;
  post('podcast_escucha', { t: token, avance }).catch(() => { anotado = 0; });
}

async function cargar() {
  setTaller(tallerDeUrl());
  cargarInicio(app, t('cargando'));
  let d;
  try { d = await get('podcast', token ? { t: token } : {}); } catch (e) { return errorPantalla(app, e.message, () => cargar(), { titulo: t('algo_mal'), reintentar: t('reintentar') }); }
  idioma = d.idioma === 'pt-BR' ? 'pt-BR' : 'es';
  setIdioma(idioma, false);
  const audio = el('audio', { controls: true, preload: 'metadata', src: d.audio, style: 'width:100%;margin:12px 0' });
  const alcanzado = () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    const hito = HITOS.filter((h) => pct >= h || (h === 1 && pct > 0)).pop();
    if (hito) anotar(hito);
  };
  audio.addEventListener('play', () => anotar(1));
  audio.addEventListener('timeupdate', alcanzado);
  audio.addEventListener('ended', () => anotar(100));
  vaciar(app).append(
    el('p', { class: 'sub', style: 'text-transform:uppercase;letter-spacing:.14em;font-size:.8rem;color:var(--acento)' }, d.taller),
    el('h1', {}, d.titulo),
    d.imagen ? el('img', { src: d.imagen, alt: d.titulo, style: 'width:100%;border-radius:16px;display:block;margin:8px 0' }) : null,
    el('div', { class: 'tarjeta' },
      el('p', {}, d.nombre ? `${tx('hola', { nombre: d.nombre })} ` : '', tx('intro', { minutos: d.minutos })),
      audio),
    d.enlace ? el('a', { class: 'boton', href: d.enlace }, icono('LuArrowRight'), tx('taller')) : null);
  pintarIconos(app);
}

cargar();
