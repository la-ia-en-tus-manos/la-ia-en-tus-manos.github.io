import { get, post, setTaller, tallerDeUrl, tallerActual, aplicarColorTaller } from './api.js';
import { t, setIdioma, idiomaActual, IDIOMAS } from './i18n.js';
import { el, vaciar, icono, pintarIconos, pildora, toast, cargarInicio, errorPantalla, guardarLocal, leerLocal, borrarLocal, ICONO_MODO } from './ui.js';

const app = document.getElementById('app');
const cargadoEn = Date.now();
let pub = null;

async function iniciar() {
  cargarInicio(app, t('cargando'));
  setTaller(tallerDeUrl());
  try { pub = await get('publico'); } catch (e) { return errorPantalla(app, e.message, iniciar); }
  if (window.TALLER_FIJO && pub.taller_id !== window.TALLER_FIJO) {
    // Dirección de una edición que no existe: el servidor ha contestado con la de defecto.
    vaciar(app).append(el('div', { class: 'tarjeta tinte' }, el('h1', {}, t('taller_no_existe')), el('p', { class: 'sub' }, t('taller_no_existe_txt')), el('a', { class: 'boton', href: '/' }, t('ver_talleres'))));
    return pintarIconos(app);
  }
  aplicarColorTaller(pub.color);
  document.title = pub.nombre_taller || `${t('titulo_1')}${t('titulo_2')}`;
  pintar();
}

function selectorIdioma() {
  const disponibles = (pub.idiomas && pub.idiomas.length ? pub.idiomas : ['es']);
  if (disponibles.length < 2) return null;
  return el('div', { class: 'botones', style: 'margin:0 0 14px' }, ...disponibles.map((id) =>
    el('button', { class: `boton peque ${id === idiomaActual() ? '' : 'fantasma'}`, type: 'button', onclick: async () => { setIdioma(id); try { pub = await get('publico'); } catch (e) { /* se queda la anterior */ } pintar(); } }, icono('LuGlobe'), IDIOMAS[id])));
}

// «La IA en tus manos» → «La IA en » + «tus manos» en color: las dos últimas palabras llevan el acento.
function tituloTaller(nombre) {
  if (!nombre) return el('h1', {}, t('titulo_1'), el('span', { class: 'acento' }, t('titulo_2')));
  const palabras = nombre.trim().split(/\s+/);
  const corte = Math.max(1, palabras.length - 2);
  return el('h1', {}, palabras.slice(0, corte).join(' ') + ' ', el('span', { class: 'acento' }, palabras.slice(corte).join(' ')));
}

function cabecera() {
  return [
    selectorIdioma(),
    pildora(t('pildora_taller', { n: pub.numero_taller, nivel: pub.nivel })),
    tituloTaller(pub.nombre_taller),
    el('p', { class: 'sub' }, pub.intro || t('intro')),
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
  // Varios talleres con la inscripción abierta a la vez: si la dirección no dice cuál, se elige primero.
  const elegido = tallerDeUrl();
  if (pub.abiertos && pub.abiertos.length && !elegido) {
    app.append(selectorIdioma(), pildora(t('elige_taller_pildora')), el('h1', {}, t('elige_taller')), el('p', { class: 'sub' }, t('elige_taller_txt')));
    const todos = [pub.abierta ? { taller_id: pub.taller_id, nombre_taller: pub.nombre_taller, nivel: pub.nivel, numero_taller: pub.numero_taller, color: pub.color, fecha_legible: pub.fecha_legible, lugar: pub.lugar, plazas_libres: pub.plazas_libres } : null, ...pub.abiertos].filter(Boolean);
    todos.sort((a, b) => +a.numero_taller - +b.numero_taller).forEach((tl) => app.append(el('button', { class: `tarjeta tinte c-${tl.color || 'cy'} tarjeta-taller`, onclick: async () => {
      location.href = `${tl.taller_id}/`;
      cargarInicio(app, t('cargando'));
      try { pub = await get('publico'); } catch (e) { return errorPantalla(app, e.message, iniciar); }
      aplicarColorTaller(pub.color); pintar();
    } },
      pildora(t('pildora_taller', { n: tl.numero_taller, nivel: tl.nivel }), tl.color || 'cy'), el('h2', {}, tl.nombre_taller),
      el('p', { class: 'sub', style: 'margin:0' }, icono('LuCalendar', 'inline'), ' ', tl.fecha_legible || t('fecha_por_confirmar'), tl.lugar ? ` · ${tl.lugar}` : ''),
      el('p', { class: 'apagado', style: 'margin:6px 0 0' }, t('quedan_n', { n: tl.plazas_libres })))));
    return pintarIconos(app);
  }
  app.append(...cabecera().filter(Boolean));
  if (pub.abiertos && pub.abiertos.length) app.append(el('p', { class: 'apagado' }, t('otros_abiertos'), ' ', ...pub.abiertos.map((tl, i) => [i ? ' · ' : '', el('a', { href: `${window.TALLER_FIJO ? '../' : ''}${tl.taller_id}/` }, tl.nombre_taller)])));

  const guardado = leerLocal('taller_token');
  if (guardado && guardado.token && (guardado.taller || 'taller1') === pub.taller_id) {
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

  if (+pub.numero_taller > 1 && pub.exigir_niveles === '1') app.append(el('div', { class: 'aviso atencion' }, icono('LuInfo', 'inline'), ' ', t(+pub.numero_taller === 2 ? 'requisito_1' : 'requisito_12')));
  if (pub.avisos_inscripcion) app.append(el('div', { class: 'aviso atencion' }, icono('LuInfo', 'inline'), ' ', pub.avisos_inscripcion));
  app.append(formulario(sinPlaza));
  pintarIconos(app);
}

function formulario(esEspera) {
  const form = el('form', { class: 'tarjeta', novalidate: true, autocomplete: 'on' });
  const aviso = el('div', { class: 'aviso error oculto', role: 'alert' });
  const modos = [['movil', 'modo_movil_sub'], ['portatil', 'modo_portatil_sub'], ['ambos', 'modo_ambos_sub']];
  const pideCodigo = +pub.numero_taller > 1 && pub.exigir_niveles === '1';
  form.append(
    el('h2', {}, esEspera ? t('apuntate_espera') : t('reserva')),
    el('label', { class: 'campo' }, el('span', {}, t('nombre')), el('input', { type: 'text', name: 'nombre', required: true, autocomplete: 'name', placeholder: t('nombre_ph') })),
    el('label', { class: 'campo' }, el('span', {}, t('correo')), el('input', { type: 'email', name: 'correo', required: true, autocomplete: 'email', inputmode: 'email', placeholder: t('correo_ph') })),
    el('label', { class: 'campo' }, el('span', {}, t('telefono')), el('input', { type: 'tel', name: 'telefono', autocomplete: 'tel', inputmode: 'tel' }), el('span', { class: 'ayuda' }, t('telefono_ayuda'))),
    pideCodigo ? el('label', { class: 'campo' }, el('span', {}, t('codigo_nivel')), el('input', { type: 'text', name: 'codigo_nivel', required: true, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: t('codigo_nivel_ph').replace('1', String(+pub.numero_taller - 1)) }), el('span', { class: 'ayuda' }, t('codigo_nivel_ayuda'))) : null,
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
      const r = await post('inscribir', { nombre, correo: d.correo.trim(), telefono: d.telefono || '', modo: d.modo, consentimiento: true, avisos: !!d.avisos, web: d.web || '', ts: cargadoEn, idioma: idiomaActual(), personaje: d.personaje || 'x', codigo_nivel: (d.codigo_nivel || '').trim() });
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
      if (err.codigo === 412) {
        if (pub.responsable_correo) aviso.append(el('p', { style: 'margin:10px 0 0' }, t('requisito_diploma', { correo: pub.responsable_correo })));
        aviso.append(el('div', { style: 'margin-top:10px' }, el('a', { class: 'boton secundario peque', href: window.TALLER_FIJO ? '../' : './' }, icono('LuArrowLeft'), t('ver_talleres'))));
      }
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
