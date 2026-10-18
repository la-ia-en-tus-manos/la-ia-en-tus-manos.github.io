import { get, post } from './api.js';
import { t, setIdioma, idiomaActual, IDIOMAS } from './i18n.js';
import { el, vaciar, icono, pintarIconos, pildora, toast, cargarInicio, errorPantalla, guardarLocal, leerLocal, ICONO_MODO } from './ui.js';

const app = document.getElementById('app');
const cargadoEn = Date.now();
let pub = null;

async function iniciar() {
  cargarInicio(app, t('cargando'));
  try { pub = await get('publico'); } catch (e) { return errorPantalla(app, e.message, iniciar); }
  document.title = `${t('titulo_1')}${t('titulo_2')}`;
  pintar();
}

function selectorIdioma() {
  const disponibles = (pub.idiomas && pub.idiomas.length ? pub.idiomas : ['es']);
  if (disponibles.length < 2) return null;
  return el('div', { class: 'botones', style: 'margin:0 0 14px' }, ...disponibles.map((id) =>
    el('button', { class: `boton peque ${id === idiomaActual() ? '' : 'fantasma'}`, type: 'button', onclick: async () => { setIdioma(id); try { pub = await get('publico'); } catch (e) { /* se queda la anterior */ } pintar(); } }, icono('LuGlobe'), IDIOMAS[id])));
}

function cabecera() {
  return [
    selectorIdioma(),
    pildora(t('pildora_taller', { n: pub.numero_taller, nivel: pub.nivel })),
    el('h1', {}, t('titulo_1'), el('span', { class: 'acento' }, t('titulo_2'))),
    el('p', { class: 'sub' }, t('intro')),
    el('div', { class: 'tarjeta' },
      el('p', { style: 'margin:0' }, icono('LuCalendar', 'inline'), ' ', el('strong', {}, t('cuando')), pub.fecha_legible || t('fecha_por_confirmar')),
      pub.lugar ? el('p', { style: 'margin:8px 0 0' }, el('strong', {}, t('donde')), pub.lugar, pub.direccion ? `, ${pub.direccion}` : '',
        pub.mapa_url ? [' · ', el('a', { href: pub.mapa_url, target: '_blank', rel: 'noopener' }, t('ver_mapa'))] : null) : null,
      el('p', { style: 'margin:8px 0 0' }, el('strong', {}, t('que_traer')), t('que_traer_txt'))
    )
  ];
}

function pintar() {
  vaciar(app);
  app.append(...cabecera().filter(Boolean));

  const guardado = leerLocal('taller_token');
  if (guardado && guardado.token) {
    app.append(el('div', { class: 'aviso' },
      el('p', { style: 'margin:0 0 10px' }, t('ya_inscrito_aqui')),
      el('a', { class: 'boton bloque', href: `alumno.html?t=${encodeURIComponent(guardado.token)}` }, t('abrir_enlace'))
    ));
  }

  if (!pub.abierta) {
    app.append(el('div', { class: 'tarjeta tinte' },
      el('h2', {}, pub.estado === 'borrador' ? t('abrira_pronto') : t('cerrada')),
      el('p', { class: 'sub' }, pub.estado === 'borrador' ? t('vuelve') : t('cerrada_txt'))
    ));
    return pintarIconos(app);
  }

  const sinPlaza = pub.plazas_libres === 0;
  const sinEspera = sinPlaza && pub.espera_libre === 0;
  if (sinEspera) {
    app.append(el('div', { class: 'tarjeta tinte c-ye' }, el('h2', {}, t('completas')), el('p', { class: 'sub' }, t('completas_txt'))));
    return pintarIconos(app);
  }
  if (sinPlaza) {
    app.append(el('div', { class: 'aviso atencion' }, el('strong', {}, t('plazas_completas')), t('espera_txt', { n: pub.espera_libre })));
  } else {
    app.append(el('p', { class: 'apagado' }, t('quedan', { libres: pub.plazas_libres, total: pub.plazas })));
  }

  app.append(formulario(sinPlaza));
  pintarIconos(app);
}

function formulario(esEspera) {
  const form = el('form', { class: 'tarjeta', novalidate: true, autocomplete: 'on' });
  const aviso = el('div', { class: 'aviso error oculto', role: 'alert' });
  const modos = [['movil', 'modo_movil_sub'], ['portatil', 'modo_portatil_sub'], ['ambos', 'modo_ambos_sub']];
  form.append(
    el('h2', {}, esEspera ? t('apuntate_espera') : t('reserva')),
    el('label', { class: 'campo' }, el('span', {}, t('nombre')), el('input', { type: 'text', name: 'nombre', required: true, autocomplete: 'name', placeholder: t('nombre_ph') })),
    el('label', { class: 'campo' }, el('span', {}, t('correo')), el('input', { type: 'email', name: 'correo', required: true, autocomplete: 'email', inputmode: 'email', placeholder: t('correo_ph') })),
    el('label', { class: 'campo' }, el('span', {}, t('telefono')), el('input', { type: 'tel', name: 'telefono', autocomplete: 'tel', inputmode: 'tel' }), el('span', { class: 'ayuda' }, t('telefono_ayuda'))),
    el('fieldset', { class: 'campo', style: 'border:0;padding:0;margin:0 0 18px' },
      el('legend', { style: 'font-weight:600;margin-bottom:8px' }, t('con_que')),
      el('div', { class: 'opciones tres' }, ...modos.map(([m, sub], i) =>
        el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'modo', value: m, checked: i === 0 }), icono(ICONO_MODO[m]), el('span', {}, el('strong', {}, t(`modo_${m}`)), el('small', {}, t(sub))))
      )),
      el('span', { class: 'ayuda' }, t('cambiar_despues'))
    ),
    el('fieldset', { class: 'campo', style: 'border:0;padding:0;margin:0 0 18px' },
      el('legend', { style: 'font-weight:600;margin-bottom:4px' }, t('personaje_pregunta')),
      el('span', { class: 'ayuda', style: 'margin:0 0 8px' }, t('personaje_ayuda')),
      el('div', { class: 'opciones tres' }, ...[['f', 'LuUserRound'], ['m', 'LuUserRound'], ['x', 'LuShuffle']].map(([v, ic]) =>
        el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'personaje', value: v, checked: v === 'x' }), icono(ic), el('span', {}, el('strong', {}, t(`personaje_${v}`))))))),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'consentimiento', required: true }), el('span', {}, t('consiento_1'), el('strong', {}, pub.responsable_nombre || t('organizador')), t('consiento_2'), el('span', { class: 'apagado' }, pub.retencion_texto, pub.responsable_correo ? t('contacto', { correo: pub.responsable_correo }) : ''))),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'avisos' }), el('span', {}, t('avisos'))),
    el('div', { class: 'sr', 'aria-hidden': 'true' }, el('label', {}, t('campo_trampa'), el('input', { type: 'text', name: 'web', tabindex: '-1', autocomplete: 'off' }))),
    aviso,
    el('button', { class: 'boton grande bloque', type: 'submit' }, icono('LuSend'), esEspera ? t('apuntarme_espera') : t('apuntarme'))
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.classList.add('oculto');
    const d = Object.fromEntries(new FormData(form).entries());
    const boton = form.querySelector('button[type=submit]');
    const nombre = (d.nombre || '').trim();
    if (nombre.split(/\s+/).length < 2) return mostrarError(aviso, t('err_nombre'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((d.correo || '').trim())) return mostrarError(aviso, t('err_correo'));
    if (!d.consentimiento) return mostrarError(aviso, t('err_consentimiento'));
    boton.disabled = true;
    boton.textContent = t('enviando');
    try {
      const r = await post('inscribir', { nombre, correo: d.correo.trim(), telefono: d.telefono || '', modo: d.modo, consentimiento: true, avisos: !!d.avisos, web: d.web || '', ts: cargadoEn, idioma: idiomaActual(), personaje: d.personaje || 'x' });
      if (r.repetido) {
        vaciar(app).append(...cabecera().filter(Boolean), el('div', { class: 'tarjeta tinte' }, el('h2', {}, t('ya_estabas')), el('p', { class: 'sub' }, t('reenviado'))));
      } else {
        guardarLocal('taller_token', { token: r.token });
        location.href = `alumno.html?t=${encodeURIComponent(r.token)}&nuevo=1`;
        return;
      }
      pintarIconos(app);
    } catch (err) {
      mostrarError(aviso, err.message);
      boton.disabled = false;
      boton.textContent = esEspera ? t('apuntarme_espera') : t('apuntarme');
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
