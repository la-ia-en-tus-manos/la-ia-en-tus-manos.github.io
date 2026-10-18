import { get, post } from './api.js';
import { el, vaciar, icono, pintarIconos, pildora, toast, cargarInicio, errorPantalla, guardarLocal, leerLocal, NOMBRE_MODO, ICONO_MODO } from './ui.js';

const app = document.getElementById('app');
const cargadoEn = Date.now();

async function iniciar() {
  cargarInicio(app);
  let pub;
  try { pub = await get('publico'); } catch (e) { return errorPantalla(app, e.message, iniciar); }
  pintar(pub);
}

function cabecera(pub) {
  return [
    pildora(`Taller práctico ${pub.numero_taller} · nivel ${pub.nivel}`),
    el('h1', {}, 'La IA en ', el('span', { class: 'acento' }, 'tus manos')),
    el('p', { class: 'sub' }, 'Cuatro horas para aprender haciendo, con Gemini. Sin conocimientos previos, sin teclear y con forma de juego: misiones, sellos y medallas secretas.'),
    el('div', { class: 'tarjeta' },
      el('p', { style: 'margin:0' }, icono('LuCalendar', 'inline'), ' ', el('strong', {}, 'Cuándo: '), pub.fecha_legible || 'fecha por confirmar. Te avisaremos por correo.'),
      pub.lugar ? el('p', { style: 'margin:8px 0 0' }, el('strong', {}, 'Dónde: '), pub.lugar, pub.direccion ? `, ${pub.direccion}` : '',
        pub.mapa_url ? [' · ', el('a', { href: pub.mapa_url, target: '_blank', rel: 'noopener' }, 'ver mapa')] : null) : null,
      el('p', { style: 'margin:8px 0 0' }, el('strong', {}, 'Qué traer: '), 'tu móvil con tu cuenta de Google. Si tienes portátil, mejor con los dos.')
    )
  ];
}

function pintar(pub) {
  vaciar(app);
  app.append(...cabecera(pub));

  const guardado = leerLocal('taller_token');
  if (guardado && guardado.token) {
    app.append(el('div', { class: 'aviso' },
      el('p', { style: 'margin:0 0 10px' }, 'Ya tienes una inscripción en este dispositivo.'),
      el('a', { class: 'boton bloque', href: `alumno.html?t=${encodeURIComponent(guardado.token)}` }, 'Abrir mi enlace personal')
    ));
  }

  if (!pub.abierta) {
    app.append(el('div', { class: 'tarjeta tinte' },
      el('h2', {}, pub.estado === 'borrador' ? 'La inscripción se abrirá pronto' : 'La inscripción está cerrada'),
      el('p', { class: 'sub' }, pub.estado === 'borrador' ? 'Vuelve a pasar por aquí en unos días.' : 'Si ya estás inscrito, abre el enlace personal que recibiste por correo.')
    ));
    return pintarIconos(app);
  }

  const sinPlaza = pub.plazas_libres === 0;
  const sinEspera = sinPlaza && pub.espera_libre === 0;
  if (sinEspera) {
    app.append(el('div', { class: 'tarjeta tinte c-ye' }, el('h2', {}, 'Plazas y lista de espera completas'), el('p', { class: 'sub' }, 'Lo sentimos. Si se abre otra edición te lo contaremos por aquí.')));
    return pintarIconos(app);
  }
  if (sinPlaza) {
    app.append(el('div', { class: 'aviso atencion' }, el('strong', {}, 'Plazas completas. '), `Puedes apuntarte a la lista de espera (quedan ${pub.espera_libre} sitios): si alguien deja su plaza, serás de los primeros en entrar.`));
  } else {
    app.append(el('p', { class: 'apagado' }, `Quedan ${pub.plazas_libres} plazas de ${pub.plazas}.`));
  }

  app.append(formulario(pub, sinPlaza));
  pintarIconos(app);
}

function formulario(pub, esEspera) {
  const form = el('form', { class: 'tarjeta', novalidate: true, autocomplete: 'on' });
  const aviso = el('div', { class: 'aviso error oculto', role: 'alert' });
  form.append(
    el('h2', {}, esEspera ? 'Apúntate a la lista de espera' : 'Reserva tu plaza'),
    el('label', { class: 'campo' }, el('span', {}, 'Nombre y apellidos'), el('input', { type: 'text', name: 'nombre', required: true, autocomplete: 'name', placeholder: 'Tal como quieres que salgan en el certificado' })),
    el('label', { class: 'campo' }, el('span', {}, 'Correo electrónico'), el('input', { type: 'email', name: 'correo', required: true, autocomplete: 'email', inputmode: 'email', placeholder: 'Ahí te enviaremos tu enlace personal' })),
    el('label', { class: 'campo' }, el('span', {}, 'Teléfono (opcional)'), el('input', { type: 'tel', name: 'telefono', autocomplete: 'tel', inputmode: 'tel' }), el('span', { class: 'ayuda' }, 'Solo si quieres entrar en el grupo de WhatsApp del taller.')),
    el('fieldset', { class: 'campo', style: 'border:0;padding:0;margin:0 0 18px' },
      el('legend', { style: 'font-weight:600;margin-bottom:8px' }, '¿Con qué vendrás?'),
      el('div', { class: 'opciones tres' }, ...['movil', 'portatil', 'ambos'].map((m, i) =>
        el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'modo', value: m, checked: i === 0 }), icono(ICONO_MODO[m]), el('span', {}, el('strong', {}, NOMBRE_MODO[m]), el('small', {}, m === 'ambos' ? 'La opción más cómoda' : m === 'movil' ? 'Con la app de Gemini' : 'Con gemini.google.com')))
      )),
      el('span', { class: 'ayuda' }, 'Podrás cambiarlo después desde tu enlace personal.')
    ),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'consentimiento', required: true }), el('span', {}, 'Acepto que ', el('strong', {}, pub.responsable_nombre || 'el organizador del taller'), ' guarde estos datos para gestionar mi plaza, el taller y el certificado. ', el('span', { class: 'apagado' }, pub.retencion_texto, pub.responsable_correo ? ` Contacto: ${pub.responsable_correo}.` : ''))),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'avisos' }), el('span', {}, 'Quiero que me avisen de futuros talleres.')),
    el('div', { class: 'sr', 'aria-hidden': 'true' }, el('label', {}, 'Deja este campo vacío', el('input', { type: 'text', name: 'web', tabindex: '-1', autocomplete: 'off' }))),
    aviso,
    el('button', { class: 'boton grande bloque', type: 'submit' }, icono('LuSend'), esEspera ? 'Apuntarme a la espera' : 'Apuntarme al taller')
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.classList.add('oculto');
    const d = Object.fromEntries(new FormData(form).entries());
    const boton = form.querySelector('button[type=submit]');
    const nombre = (d.nombre || '').trim();
    if (nombre.split(/\s+/).length < 2) return mostrarError(aviso, 'Escribe tu nombre y al menos un apellido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((d.correo || '').trim())) return mostrarError(aviso, 'Revisa el correo: no parece una dirección válida.');
    if (!d.consentimiento) return mostrarError(aviso, 'Necesitamos tu consentimiento para guardar la inscripción.');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
      const r = await post('inscribir', { nombre, correo: d.correo.trim(), telefono: d.telefono || '', modo: d.modo, consentimiento: true, avisos: !!d.avisos, web: d.web || '', ts: cargadoEn });
      if (r.repetido) {
        vaciar(app).append(...cabecera(pub), el('div', { class: 'tarjeta tinte' }, el('h2', {}, 'Ya estabas inscrito'), el('p', { class: 'sub' }, 'Te hemos reenviado tu enlace personal al correo. Si no lo ves, mira en «Correo no deseado».')));
      } else {
        guardarLocal('taller_token', { token: r.token });
        location.href = `alumno.html?t=${encodeURIComponent(r.token)}&nuevo=1`;
        return;
      }
      pintarIconos(app);
    } catch (err) {
      mostrarError(aviso, err.message);
      boton.disabled = false;
      boton.textContent = esEspera ? 'Apuntarme a la espera' : 'Apuntarme al taller';
    }
  });
  return form;
}

function mostrarError(nodo, texto) {
  nodo.textContent = texto;
  nodo.classList.remove('oculto');
  nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast(texto, 'error');
}

iniciar();
