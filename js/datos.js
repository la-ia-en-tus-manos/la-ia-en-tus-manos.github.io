// «Tus datos»: el alumno ve qué guardamos, descarga sus diplomas y decide conservar sus datos o borrarlos.
// Se abre con su enlace personal (datos.html?t=…); «&accion=conservar» viene del correo de aviso.
import { get, post } from './api.js';
import { t, setIdioma } from './i18n.js';
import { el, vaciar, icono, pintarIconos, toast, cargarInicio, errorPantalla, borrarLocal } from './ui.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const token = params.get('t');

const TEXTOS = {
  es: {
    titulo: 'Tus datos', hola: 'Hola, {nombre}. Esto es lo que guardamos de ti en «La IA en tus manos»:',
    estado_plaza: 'con plaza', estado_espera: 'en lista de espera', estado_cancelado: 'inscripción cancelada',
    diploma: 'Descargar mi diploma', borrado_previsto: 'Se borrará el {fecha} si no pides conservarlo.',
    que_guardamos: 'Guardamos tu nombre, tu correo y tu teléfono, tu progreso (misiones previas, misiones, sellos y medallas) y tus respuestas a la encuesta. Nada más.',
    conservar_hasta: 'Los conservamos hasta el {fecha}.', conservar_titulo: 'Conservar mis datos',
    conservar_txt: 'Útil si vas a apuntarte al siguiente nivel: así recordamos que hiciste este. Los guardamos un año más.',
    consecuencia: 'Si los borras, ya no sabremos que hiciste el taller: para apuntarte al siguiente nivel tendrás que escribirnos y enseñarnos tu diploma, y te inscribiremos nosotros.',
    conservar: 'Conservar mis datos un año más', conservados: '¡Hecho! Conservamos tus datos un año más.',
    borrar_titulo: 'Borrar mis datos', borrar_txt: 'Borramos todo lo tuyo, en todos los talleres, y te enviamos un último correo de confirmación con un resumen de lo que hiciste y tus diplomas en PDF. Tu enlace personal dejará de funcionar.',
    borrar: 'Borrar todos mis datos', confirmar: '¿Seguro? Se borrará todo y no se puede deshacer.',
    borrados: 'Tus datos se han borrado. Te hemos enviado un correo de confirmación con tus diplomas. Gracias por participar.',
    contacto: 'Si tienes cualquier duda sobre tus datos, escribe a {correo}.', volver: 'Volver a mi taller'
  },
  'pt-BR': {
    titulo: 'Seus dados', hola: 'Olá, {nombre}. Isto é o que guardamos de você em «A IA nas suas mãos»:',
    estado_plaza: 'com vaga', estado_espera: 'na lista de espera', estado_cancelado: 'inscrição cancelada',
    diploma: 'Baixar meu diploma', borrado_previsto: 'Será apagado em {fecha} se você não pedir para conservar.',
    que_guardamos: 'Guardamos seu nome, seu e-mail e seu telefone, seu progresso (missões prévias, missões, carimbos e medalhas) e suas respostas à pesquisa. Nada mais.',
    conservar_hasta: 'Conservamos até {fecha}.', conservar_titulo: 'Conservar meus dados',
    conservar_txt: 'Útil se você vai se inscrever no próximo nível: assim lembramos que fez este. Guardamos por mais um ano.',
    consecuencia: 'Se você apagar, não vamos mais saber que fez a oficina: para se inscrever no próximo nível, vai precisar escrever para nós e mostrar o seu diploma, e nós fazemos a inscrição.',
    conservar: 'Conservar meus dados por mais um ano', conservados: 'Pronto! Conservamos seus dados por mais um ano.',
    borrar_titulo: 'Apagar meus dados', borrar_txt: 'Apagamos tudo o que é seu, em todas as oficinas, e enviamos um último e-mail de confirmação com um resumo do que você fez e seus diplomas em PDF. Seu link pessoal vai deixar de funcionar.',
    borrar: 'Apagar todos os meus dados', confirmar: 'Tem certeza? Tudo será apagado e não dá para desfazer.',
    borrados: 'Seus dados foram apagados. Enviamos um e-mail de confirmação com seus diplomas. Obrigado por participar.',
    contacto: 'Se tiver qualquer dúvida sobre seus dados, escreva para {correo}.', volver: 'Voltar à minha oficina'
  }
};
let idioma = 'es';
const tx = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.split(`{${a}}`).join(b), (TEXTOS[idioma] || TEXTOS.es)[k] || k);
const fecha = (iso) => new Date(iso).toLocaleDateString(idioma === 'pt-BR' ? 'pt-BR' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

async function cargar() {
  if (!token) return errorPantalla(app, t('falta_enlace_txt'), null, { titulo: t('falta_enlace') });
  cargarInicio(app, t('cargando'));
  let d;
  try { d = await get('mis_datos', { t: token }); } catch (e) { return errorPantalla(app, e.message, () => cargar(), { titulo: t('algo_mal'), reintentar: t('reintentar') }); }
  idioma = d.idioma === 'pt-BR' ? 'pt-BR' : 'es';
  setIdioma(idioma, false);
  if (params.get('accion') === 'conservar') {
    try { const r = await post('conservar_datos', { t: token }); d.conservar_hasta = r.conservar_hasta; d.ediciones.forEach((x) => { x.borrado_previsto = ''; }); toast(tx('conservados')); }
    catch (e) { toast(e.message, 'error'); }
    history.replaceState(null, '', `datos.html?t=${encodeURIComponent(token)}`);
  }
  pintar(d);
}

function pintar(d) {
  vaciar(app);
  app.append(el('h1', {}, tx('titulo')), el('p', { class: 'sub' }, tx('hola', { nombre: d.nombre.split(' ')[0] })));
  d.ediciones.forEach((x) => app.append(el('div', { class: 'tarjeta' },
    el('h2', {}, `${x.taller}${x.nivel ? ` · ${x.nivel}` : ''}`),
    el('p', { class: 'apagado' }, [x.fecha, tx(`estado_${x.estado}`)].filter(Boolean).join(' · ')),
    x.diploma ? el('a', { class: 'boton c-ye', href: x.diploma, target: '_blank', rel: 'noopener' }, icono('LuAward'), tx('diploma')) : null,
    x.borrado_previsto ? el('div', { class: 'aviso atencion', style: 'margin-top:12px' }, tx('borrado_previsto', { fecha: fecha(x.borrado_previsto) })) : null)));
  app.append(el('p', { class: 'apagado' }, tx('que_guardamos')));

  app.append(el('div', { class: 'tarjeta tinte c-gr' }, el('h2', {}, tx('conservar_titulo')),
    d.conservar_hasta ? el('div', { class: 'aviso ok' }, tx('conservar_hasta', { fecha: fecha(d.conservar_hasta) })) : el('p', { class: 'sub' }, tx('conservar_txt')),
    el('button', { class: 'boton c-gr', onclick: async () => {
      try { const r = await post('conservar_datos', { t: token }); d.conservar_hasta = r.conservar_hasta; d.ediciones.forEach((x) => { x.borrado_previsto = ''; }); toast(tx('conservados')); pintar(d); }
      catch (e) { toast(e.message, 'error'); }
    } }, icono('LuShieldCheck'), tx('conservar'))));

  app.append(el('div', { class: 'tarjeta' }, el('h2', {}, tx('borrar_titulo')), el('p', { class: 'sub' }, tx('borrar_txt')),
    el('div', { class: 'aviso atencion', style: 'margin-bottom:12px' }, tx('consecuencia')),
    el('button', { class: 'boton peligro', onclick: async () => {
      if (!window.confirm(tx('confirmar'))) return;
      try {
        await post('borrar_mis_datos', { t: token, confirmar: 'BORRAR' });
        borrarLocal('taller_token');
        vaciar(app).append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, tx('titulo')), el('p', { class: 'sub' }, tx('borrados'))));
      } catch (e) { toast(e.message, 'error'); }
    } }, icono('LuTrash2'), tx('borrar'))));

  app.append(el('p', { style: 'text-align:center' }, el('a', { href: `alumno.html?t=${encodeURIComponent(token)}` }, tx('volver'))));
  if (d.responsable_correo) app.append(el('p', { class: 'apagado', style: 'text-align:center' }, tx('contacto', { correo: d.responsable_correo })));
  pintarIconos(app);
}

cargar();
