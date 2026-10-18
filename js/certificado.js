// Diploma del alumno. Tres entradas:
//   certificado.html?t=TOKEN           → el alumno (taller terminado)
//   certificado.html?id=ID             → el profesor, con su clave en sessionStorage (vista previa de cualquier alumno)
//   certificado.html?demo=1            → muestra de diseño con datos inventados, sin servidor
import { get } from './api.js';
import { t, setIdioma, idiomaActual } from './i18n.js';
import { el, vaciar, icono, pintarIconos, toast } from './ui.js';

const params = new URLSearchParams(location.search);
const diploma = document.getElementById('diploma');
const acciones = document.getElementById('acciones');

const DEMO = {
  idioma: 'es', nombre: 'Carmen Ruiz López', numero: '07', taller: 'La IA en tus manos', numero_taller: '1', nivel: 'Explorador', fecha_legible: 'sábado 7 de noviembre de 2026',
  misiones: 9, total_misiones: 9, jefe: true,
  medallas: [{ id: 'ingenio', nombre: 'Ingenio', color: 'ye', icono: 'LuLightbulb', ganada: true }, { id: 'guardian', nombre: 'Guardián', color: 'cy', icono: 'LuShieldCheck', ganada: true }, { id: 'detective', nombre: 'Detective', color: 'pk', icono: 'LuSearch', ganada: false }],
  textos: { titulo: 'Diploma de Explorador', texto: '{nombre} ha completado el taller práctico «{taller}» (Taller {numero_taller} · nivel {nivel}): cuatro horas aprendiendo a usar la inteligencia artificial con cabeza, con criterio y con cuidado de sus datos.', firmante: 'Luis Oliva', firmante_cargo: 'Ingeniero informático · ponente del taller', lugar: 'Madrid', logo_url: '' }
};

function emblema() {
  // Emblema por defecto: mano abierta con una chispa, en degradado cian→azul.
  return el('div', { class: 'emblema', html: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22E6D2"/><stop offset="1" stop-color="#4DA8FF"/></linearGradient></defs>
    <rect width="64" height="64" rx="16" fill="url(#g)"/>
    <path d="M22 40V24a3 3 0 0 1 6 0v10m0-12v-4a3 3 0 0 1 6 0v16m0-14a3 3 0 0 1 6 0v14m0-10a3 3 0 0 1 6 0v12c0 7-5 12-12 12h-2c-5 0-8-2-11-6l-5-7a3 3 0 0 1 5-4l3 4" fill="none" stroke="#08102A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M47 9l1.5 3.5L52 14l-3.5 1.5L47 19l-1.5-3.5L42 14l3.5-1.5z" fill="#08102A"/></svg>` });
}

function rellenar(plantilla, d) {
  return plantilla.replace(/\{(\w+)\}/g, (m, k) => ({ nombre: d.nombre, taller: d.taller, numero_taller: d.numero_taller, nivel: d.nivel, fecha: d.fecha_legible, numero: d.numero }[k] ?? m));
}

function pintar(d) {
  setIdioma(d.idioma, false);
  document.documentElement.lang = d.idioma === 'pt-BR' ? 'pt-BR' : 'es';
  document.title = `${d.textos.titulo} · ${d.nombre}`;
  const ganadas = d.medallas.filter((m) => m.ganada).length;
  vaciar(diploma).append(
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
      el('div', { class: 'dip-firma' }, el('div', { class: 'linea' }), el('b', {}, d.textos.firmante), el('small', {}, d.textos.firmante_cargo)))
  );
  vaciar(acciones).append(
    el('button', { class: 'boton', onclick: () => window.print() }, icono('LuPrinter'), t('dip_imprimir')),
    params.has('demo') ? el('span', { class: 'chip c-ye', style: 'align-self:center' }, t('dip_demo')) : null
  );
  pintarIconos(document.body);
}

async function iniciar() {
  try {
    if (params.has('demo')) {
      const d = { ...DEMO, idioma: params.get('idioma') || idiomaActual() };
      if (d.idioma === 'pt-BR') d.textos = { ...d.textos, titulo: 'Diploma de Explorador', texto: '{nombre} concluiu a oficina prática «{taller}» (Oficina {numero_taller} · nível {nivel}): quatro horas aprendendo a usar a inteligência artificial com cabeça, com critério e cuidando dos seus dados.', firmante_cargo: 'Engenheiro de informática · palestrante da oficina' };
      return pintar(d);
    }
    if (params.has('id')) {
      const k = sessionStorage.getItem('profe_clave') || '';
      return pintar(await get('p_certificado', { k, id: params.get('id') }));
    }
    pintar(await get('certificado', { t: params.get('t') || '' }));
  } catch (e) {
    vaciar(diploma).append(el('div', { class: 'aviso error', style: 'margin:40px' }, e.message));
    toast(e.message, 'error');
  }
}

iniciar();
