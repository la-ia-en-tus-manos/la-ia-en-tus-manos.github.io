// «Tus datos»: el alumno ve qué guardamos, descarga sus diplomas, ve su código de nivel y puede borrarlo todo.
// Se abre con su enlace personal (datos.html?t=…).
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
    diploma: 'Descargar mi diploma', borrado_previsto: 'Tus datos se borrarán solos el {fecha}. Antes te enviaremos el diploma y el código por correo.',
    codigo: 'Tu código de nivel', codigo_txt: 'Guárdalo: es lo que te pedirá la inscripción del siguiente nivel. Vale para una sola inscripción y no está unido a tu nombre ni a tu correo.',
    que_guardamos: 'Guardamos tu nombre, tu correo y tu teléfono, tu progreso (misiones previas, misiones, sellos y medallas) y tus respuestas a la encuesta. Nada más.',
    consecuencia: 'Tu código de nivel sigue valiendo después de borrar: apúntalo antes. Si lo pierdes, escríbenos con tu diploma y te inscribiremos nosotros.',
    borrar_titulo: 'Borrar mis datos', borrar_txt: 'Borramos todo lo tuyo, en todos los talleres, y te enviamos un último correo de confirmación con un resumen de lo que hiciste y tus diplomas en PDF. Tu enlace personal dejará de funcionar.',
    borrar: 'Borrar todos mis datos', confirmar: '¿Seguro? Se borrará todo y no se puede deshacer.',
    borrados: 'Tus datos se han borrado. Te hemos enviado un correo de confirmación con tus diplomas. Gracias por participar.',
    contacto: 'Si tienes cualquier duda sobre tus datos, escribe a {correo}.', volver: 'Volver a mi taller'
  },
  'pt-BR': {
    titulo: 'Seus dados', hola: 'Olá, {nombre}. Isto é o que guardamos de você em «A IA nas suas mãos»:',
    estado_plaza: 'com vaga', estado_espera: 'na lista de espera', estado_cancelado: 'inscrição cancelada',
    diploma: 'Baixar meu diploma', borrado_previsto: 'Seus dados serão apagados sozinhos em {fecha}. Antes enviaremos o diploma e o código por e-mail.',
    codigo: 'Seu código de nível', codigo_txt: 'Guarde-o: é o que a inscrição do próximo nível vai pedir. Vale para uma só inscrição e não está ligado ao seu nome nem ao seu e-mail.',
    que_guardamos: 'Guardamos seu nome, seu e-mail e seu telefone, seu progresso (missões prévias, missões, carimbos e medalhas) e suas respostas à pesquisa. Nada mais.',
    consecuencia: 'Seu código de nível continua valendo depois de apagar: anote-o antes. Se perder, escreva para nós com o seu diploma e nós fazemos a inscrição.',
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
  pintar(d);
}

function pintar(d) {
  vaciar(app);
  app.append(el('h1', {}, tx('titulo')), el('p', { class: 'sub' }, tx('hola', { nombre: d.nombre.split(' ')[0] })));
  d.ediciones.forEach((x) => app.append(el('div', { class: 'tarjeta' },
    el('h2', {}, `${x.taller}${x.nivel ? ` · ${x.nivel}` : ''}`),
    el('p', { class: 'apagado' }, [x.fecha, tx(`estado_${x.estado}`)].filter(Boolean).join(' · ')),
    x.diploma ? el('a', { class: 'boton c-ye', href: x.diploma, target: '_blank', rel: 'noopener' }, icono('LuAward'), tx('diploma')) : null,
    x.codigo ? el('div', { class: 'aviso ok', style: 'margin-top:12px' }, el('strong', {}, `${tx('codigo')}: `), el('code', { style: 'font-size:1.05rem;letter-spacing:.06em' }, x.codigo), el('br'), tx('codigo_txt')) : null,
    x.borrado_previsto ? el('div', { class: 'aviso atencion', style: 'margin-top:12px' }, tx('borrado_previsto', { fecha: fecha(x.borrado_previsto) })) : null)));
  app.append(el('p', { class: 'apagado' }, tx('que_guardamos')));


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
