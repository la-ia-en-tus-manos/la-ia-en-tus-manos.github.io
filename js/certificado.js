// Diploma del alumno. Tres entradas:
//   certificado.html?t=TOKEN           → el alumno (taller terminado)
//   certificado.html?id=ID             → el profesor, con su clave en sessionStorage (vista previa de cualquier alumno)
//   certificado.html?demo=1            → muestra de diseño con datos inventados, sin servidor
import { get, setTaller } from './api.js';
import { t, setIdioma, idiomaActual } from './i18n.js';
import { el, vaciar, icono, pintarIconos, toast } from './ui.js';

const params = new URLSearchParams(location.search);
const diploma = document.getElementById('diploma');
const acciones = document.getElementById('acciones');

const DEMO = {
  idioma: 'es', nombre: 'Carmen Ruiz López', numero: '07', taller: 'La IA en tus manos', numero_taller: '1', nivel: 'Explorador', fecha_legible: 'sábado 7 de noviembre de 2026',
  misiones: 9, total_misiones: 9, jefe: true,
  medallas: [{ id: 'ingenio', nombre: 'Ingenio', color: 'ye', icono: 'LuLightbulb', ganada: true }, { id: 'guardian', nombre: 'Guardián', color: 'cy', icono: 'LuShieldCheck', ganada: true }, { id: 'detective', nombre: 'Detective', color: 'pk', icono: 'LuSearch', ganada: false }],
  textos: { titulo: 'Diploma de Explorador', texto: 'Ha completado el taller práctico «{taller}» (Taller {numero_taller} · nivel {nivel}): cuatro horas aprendiendo a usar la inteligencia artificial con cabeza, con criterio y con cuidado de sus datos.', firmante: 'Luis Oliva', firmante_cargo: 'Ingeniero informático · ponente del taller', lugar: 'Madrid', logo_url: '' }
};

function emblema() {
  // Emblema por defecto: mano abierta con una chispa, en degradado cian→azul.
  return el('div', { class: 'emblema', html: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22E6D2"/><stop offset="1" stop-color="#4DA8FF"/></linearGradient></defs>
    <rect width="64" height="64" rx="16" fill="url(#g)"/>
    <path d="M22 40V24a3 3 0 0 1 6 0v10m0-12v-4a3 3 0 0 1 6 0v16m0-14a3 3 0 0 1 6 0v14m0-10a3 3 0 0 1 6 0v12c0 7-5 12-12 12h-2c-5 0-8-2-11-6l-5-7a3 3 0 0 1 5-4l3 4" fill="none" stroke="#08102A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M47 9l1.5 3.5L52 14l-3.5 1.5L47 19l-1.5-3.5L42 14l3.5-1.5z" fill="#08102A"/></svg>` });
}

// Rúbrica inventada: un trazo continuo a mano alzada, con una subrayada final.
// Rúbrica abstracta generada a partir del nombre de quien firma: cada letra se convierte en un trazo
// (mayúsculas en bucles grandes, vocales en lazos, consonantes en picos; su altura y anchura salen de la
// letra), así que cada nombre tiene su propia firma sin que se lea. Si hay imagen de firma, se usa esa.
function trazoFirma(nombre) {
  let x = 6;
  let d = `M${x} 44`;
  const letras = nombre.replace(/\s+/g, ' ').split('');
  letras.forEach((ch, i) => {
    const c = ch.toLowerCase().charCodeAt(0);
    const alto = 12 + (c % 7) * 4;
    const ancho = 7 + (c % 4) * 2;
    if (ch === ' ') { d += ` c${ancho} 6, ${ancho * 2} 6, ${ancho * 3} 0`; x += ancho * 3; return; }
    const mayus = ch !== ch.toLowerCase();
    const vocal = 'aeiouáéíóú'.includes(ch.toLowerCase());
    if (mayus) {
      // Bucle grande que sube, cruza y vuelve.
      d += ` c${-ancho * 1.5} ${-alto * 2.4}, ${ancho * 3} ${-alto * 2.6}, ${ancho * 0.6} ${-alto * 0.2} c${-ancho * 1.6} ${alto * 1.6}, ${ancho * 1.2} ${alto * 1.3}, ${ancho * 2} ${alto * 0.2}`;
      x += ancho * 2.6;
    } else if (vocal) {
      // Lazo pequeño.
      d += ` c${ancho * 1.4} ${-alto * 1.2}, ${-ancho * 1.1} ${-alto * 1.3}, ${ancho * 0.9} 0`;
      x += ancho * 0.9;
    } else if (i === letras.length - 1) {
      d += ` c${ancho * 0.4} ${-alto}, ${ancho} ${-alto * 0.4}, ${ancho * 1.6} 0`;
      x += ancho * 1.6;
    } else {
      // Pico.
      d += ` c${ancho * 0.35} ${-alto * 1.6}, ${ancho * 0.75} ${-alto * 1.6}, ${ancho} 0`;
      x += ancho;
    }
  });
  // Cola que se apaga.
  d += ` c14 10, 30 10, 48 -8`;
  x += 48;
  return { d, ancho: x + 8 };
}

function rubrica(firmante) {
  const nombre = (firmante || 'Firma').trim();
  const { d, ancho } = trazoFirma(nombre);
  const caja = el('div', { class: 'dip-rubrica', 'aria-hidden': 'true', html: `<svg viewBox="0 -40 ${ancho} 110"><g transform="rotate(-4 ${ancho / 2} 30)"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".35" transform="translate(1.5 1.5)"/><path d="M${ancho * 0.08} 56c${ancho * 0.25} -9, ${ancho * 0.55} -11, ${ancho * 0.84} -5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></g></svg>` });
  // El trazo cambia con cada nombre: una vez en pantalla se mide y se encuadra entero en su hueco.
  setTimeout(() => {
    const svg = caja.querySelector('svg');
    if (!svg || !svg.isConnected) return;
    const b = svg.getBBox();
    svg.setAttribute('viewBox', `${b.x - 4} ${b.y - 4} ${b.width + 8} ${b.height + 8}`);
  }, 0);
  return caja;
}

function rellenar(plantilla, d) {
  return plantilla.replace(/\{(\w+)\}/g, (m, k) => ({ nombre: d.nombre, taller: d.taller, numero_taller: d.numero_taller, nivel: d.nivel, fecha: d.fecha_legible, numero: d.numero }[k] ?? m));
}

function pintar(d, contenedor = diploma) {
  setIdioma(d.idioma, false);
  document.documentElement.lang = d.idioma === 'pt-BR' ? 'pt-BR' : 'es';
  document.title = `${d.textos.titulo} · ${d.nombre}`;
  const ganadas = d.medallas.filter((m) => m.ganada).length;
  vaciar(contenedor).append(
    el('div', { class: 'dip-cabecera' },
      el('div', { class: 'dip-logo' }, d.textos.logo_url ? el('img', { src: d.textos.logo_url, alt: '' }) : emblema(),
        el('div', { class: 'dip-marca' }, t('titulo_1'), el('span', {}, t('titulo_2')), el('small', {}, t('pildora_taller', { n: d.numero_taller, nivel: d.nivel })))),
      el('div', { class: 'dip-numero' }, t('explorador'), el('b', {}, t('numero', { n: d.numero })))),
    el('div', { class: 'dip-centro' },
      el('p', { class: 'dip-titulo' }, d.textos.titulo),
      el('h1', { class: 'dip-nombre' }, d.nombre),
      el('p', { class: 'dip-texto', html: rellenar(d.textos.texto, d).replace(d.nombre, `<strong>${d.nombre}</strong>`) }),
      el('div', { class: 'dip-medallas' }, ...d.medallas.map((m) => el('div', { class: `dip-medalla c-${m.color} ${m.ganada ? 'ganada' : ''}` },
        el('div', { class: 'circulo' }, m.ganada ? icono(m.icono) : '·'), el('b', {}, m.nombre), el('small', {}, m.ganada ? t('dip_conseguida') : t('dip_pendiente'))))),
      el('p', { class: 'dip-resumen' }, t('dip_resumen', { medallas: ganadas, total: d.medallas.length, misiones: d.misiones, total_misiones: d.total_misiones }), d.jefe ? ` · ${t('dip_jefe')}` : '')),
    el('div', { class: 'dip-pie' },
      el('div', { class: 'dip-fecha' }, d.textos.lugar ? `${d.textos.lugar}, ` : '', el('b', {}, d.fecha_legible || t('fecha_por_confirmar_t'))),
      el('div', { class: 'dip-firma' }, d.textos.firma_url ? el('img', { class: 'dip-rubrica-img', src: d.textos.firma_url, alt: '' }) : rubrica(d.textos.firmante), el('div', { class: 'linea' }), el('b', {}, d.textos.firmante), el('small', {}, d.textos.firmante_cargo)))
  );
  // append() nativo pinta «null» como texto: solo nodos reales.
  vaciar(acciones).append(...[
    el('button', { class: 'boton', onclick: () => window.print() }, icono('LuPrinter'), t('dip_imprimir')),
    params.has('demo') ? el('span', { class: 'chip c-ye', style: 'align-self:center' }, t('dip_demo')) : null
  ].filter(Boolean));
  pintarIconos(document.body);
}

async function iniciar() {
  try {
    if (params.has('demo')) {
      const d = { ...DEMO, idioma: params.get('idioma') || idiomaActual() };
      if (params.has('todo')) d.medallas = d.medallas.map((m) => ({ ...m, ganada: true }));   // muestra con todo conseguido
      if (d.idioma === 'pt-BR') d.textos = { ...d.textos, titulo: 'Diploma de Explorador', texto: 'Concluiu a oficina prática «{taller}» (Oficina {numero_taller} · nível {nivel}): quatro horas aprendendo a usar a inteligência artificial com cabeça, com critério e cuidando dos seus dados.', firmante_cargo: 'Engenheiro de informática · palestrante da oficina' };
      return pintar(d);
    }
    // La clave del profesor llega en el fragmento (#k=…) desde el panel; se guarda en la sesión y se quita de la barra.
    setTaller(params.get('taller') || '');
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (hash.get('k')) { sessionStorage.setItem('profe_clave', hash.get('k')); history.replaceState(null, '', location.pathname + location.search); }
    const k = sessionStorage.getItem('profe_clave') || '';
    if ((params.has('id') || params.has('ids')) && !k) {
      // Sin clave no se llama al servidor (cada intento fallido cuenta para el bloqueo): se pide aquí.
      const inp = el('input', { type: 'password', placeholder: 'Clave del profesor' });
      vaciar(diploma).append(el('form', { class: 'tarjeta', style: 'max-width:420px;margin:40px auto', onsubmit: (e) => { e.preventDefault(); sessionStorage.setItem('profe_clave', inp.value.trim()); location.reload(); } },
        el('h2', {}, 'Clave del profesor'), el('p', { class: 'sub' }, 'Abre los diplomas desde el panel o escribe aquí la clave.'), el('label', { class: 'campo' }, inp), el('button', { class: 'boton bloque', type: 'submit' }, 'Entrar')));
      return;
    }
    if (params.has('id')) return pintar(await get('p_certificado', { k, id: params.get('id') }));
    if (params.has('ids')) {
      // Varios diplomas seguidos, uno por página: para imprimirlos todos de una vez.
      const ids = params.get('ids').split(',').filter(Boolean);
      diploma.replaceWith(...[]);
      const lienzo = el('div', { id: 'diplomas' });
      document.body.append(lienzo);
      for (const id of ids) {
        const caja = el('main', { class: 'diploma' });
        lienzo.append(caja);
        try { pintar(await get('p_certificado', { k, id }), caja); } catch (e) { vaciar(caja).append(el('div', { class: 'aviso error' }, `${id}: ${e.message}`)); }
      }
      vaciar(acciones).append(el('button', { class: 'boton', onclick: () => window.print() }, icono('LuPrinter'), `${t('dip_imprimir')} (${ids.length})`));
      document.title = `${ids.length} diplomas`;
      pintarIconos(document.body);
      return;
    }
    pintar(await get('certificado', { t: params.get('t') || '' }));
  } catch (e) {
    vaciar(diploma).append(el('div', { class: 'aviso error', style: 'margin:40px' }, e.message));
    toast(e.message, 'error');
  }
}

iniciar();
