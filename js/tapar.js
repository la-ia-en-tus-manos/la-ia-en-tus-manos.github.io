// Herramienta «Tapar mis datos»: el alumno pinta encima de los datos sensibles de su documento.
// Devuelve la imagen tapada y la cobertura de cada zona sensible (0..1) para que el servidor dé la medalla.
import { el, icono, pintarIconos, toast } from './ui.js';

const GROSOR = 0.032; // grosor del pincel, fracción del ancho de la imagen

export function abrirTapar(blob, zonas, opciones = {}) {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => montar(img);
    img.src = URL.createObjectURL(blob);

    function montar(imagen) {
      const W = imagen.naturalWidth, H = imagen.naturalHeight;
      const lienzo = el('canvas', { width: W, height: H, style: 'width:100%;height:auto;display:block;border-radius:12px;touch-action:none;background:#fff;cursor:crosshair' });
      const ctx = lienzo.getContext('2d');
      const mascara = document.createElement('canvas');
      mascara.width = W; mascara.height = H;
      const mctx = mascara.getContext('2d');
      const trazos = [];
      let trazo = null;

      const redibujar = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(imagen, 0, 0);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#08102A'; ctx.lineWidth = W * GROSOR;
        trazos.forEach(dibujarTrazo);
        if (trazo) dibujarTrazo(trazo);
      };
      const dibujarTrazo = (t) => {
        if (t.length === 1) { ctx.beginPath(); ctx.arc(t[0].x, t[0].y, W * GROSOR / 2, 0, Math.PI * 2); ctx.fillStyle = '#08102A'; ctx.fill(); return; }
        ctx.beginPath(); ctx.moveTo(t[0].x, t[0].y);
        t.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      };
      const punto = (e) => {
        const r = lienzo.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
      };
      lienzo.addEventListener('pointerdown', (e) => { e.preventDefault(); try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* evento sintético */ } trazo = [punto(e)]; redibujar(); });
      lienzo.addEventListener('pointermove', (e) => { if (!trazo) return; e.preventDefault(); trazo.push(punto(e)); redibujar(); });
      const soltar = () => { if (trazo) { trazos.push(trazo); trazo = null; redibujar(); } };
      lienzo.addEventListener('pointerup', soltar);
      lienzo.addEventListener('pointercancel', soltar);
      redibujar();

      const cobertura = () => {
        mctx.clearRect(0, 0, W, H);
        mctx.lineCap = 'round'; mctx.lineJoin = 'round'; mctx.strokeStyle = '#000'; mctx.fillStyle = '#000'; mctx.lineWidth = W * GROSOR;
        trazos.forEach((t) => {
          if (t.length === 1) { mctx.beginPath(); mctx.arc(t[0].x, t[0].y, W * GROSOR / 2, 0, Math.PI * 2); mctx.fill(); return; }
          mctx.beginPath(); mctx.moveTo(t[0].x, t[0].y); t.slice(1).forEach((p) => mctx.lineTo(p.x, p.y)); mctx.stroke();
        });
        const out = {};
        zonas.forEach((z) => {
          const x0 = Math.round(z.x * W), y0 = Math.round(z.y * H), w = Math.max(1, Math.round(z.w * W)), h = Math.max(1, Math.round(z.h * H));
          const datos = mctx.getImageData(x0, y0, w, h).data;
          let tapados = 0;
          for (let i = 3; i < datos.length; i += 4) if (datos[i] > 0) tapados++;
          out[z.id] = tapados / (w * h);
        });
        return out;
      };

      const fondo = el('div', { class: 'modal-fondo' });
      const caja = el('div', { class: 'modal ancho', role: 'dialog', 'aria-modal': 'true' });
      const estado = el('p', { class: 'apagado' }, 'Pinta con el dedo o el ratón sobre la imagen, como con un rotulador. Lo que pintes quedará así al enviarla.');
      const cerrar = (resultado) => { fondo.remove(); URL.revokeObjectURL(imagen.src); resolver(resultado); };
      caja.append(
        el('h2', {}, opciones.titulo || 'Retocar la imagen'),
        estado,
        lienzo,
        el('div', { class: 'botones', style: 'margin-top:14px' },
          el('button', { class: 'boton fantasma', onclick: () => { trazos.pop(); redibujar(); } }, icono('LuUndo2'), 'Deshacer'),
          el('button', { class: 'boton fantasma', onclick: () => { trazos.length = 0; redibujar(); } }, icono('LuEraser'), 'Borrar todo'),
          el('button', { class: 'boton c-gr', style: 'margin-left:auto', onclick: () => {
            if (!trazos.length) { toast('No has pintado nada todavía', 'error'); return; }
            lienzo.toBlob((b) => cerrar({ blob: b, cobertura: cobertura() }), 'image/png');
          } }, icono('LuCheck'), 'Listo'),
          el('button', { class: 'boton fantasma bloque', onclick: () => cerrar(null) }, 'Cancelar')
        )
      );
      fondo.append(caja);
      document.body.append(fondo);
      pintarIconos(caja);
    }
  });
}

// Lluvia de confeti sobre toda la pantalla durante unos segundos.
export function confeti(duracionMs = 3200) {
  const c = el('canvas', { style: 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:70' });
  document.body.append(c);
  const ctx = c.getContext('2d');
  const escala = () => { c.width = innerWidth; c.height = innerHeight; };
  escala();
  const colores = ['#22E6D2', '#4DA8FF', '#9B82FF', '#8EE04E', '#F4C257', '#FF5C9E', '#FF9D42'];
  const piezas = Array.from({ length: 160 }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 2.2, vy: 2.5 + Math.random() * 3.5,
    w: 6 + Math.random() * 8, h: 8 + Math.random() * 10, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25, color: colores[Math.floor(Math.random() * colores.length)]
  }));
  const inicio = performance.now();
  const paso = (t) => {
    ctx.clearRect(0, 0, c.width, c.height);
    piezas.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx += Math.sin(t / 300 + p.y / 50) * 0.05;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (t - inicio < duracionMs) requestAnimationFrame(paso); else c.remove();
  };
  requestAnimationFrame(paso);
}

// Pop-up de medalla conseguida, con confeti.
export function celebrarMedalla(medalla, alCerrar) {
  confeti();
  const fondo = el('div', { class: 'modal-fondo' });
  const caja = el('div', { class: `modal c-${medalla.color}`, style: 'text-align:center' });
  caja.append(
    el('p', { class: 'pildora' }, 'Medalla secreta desbloqueada'),
    el('div', { class: 'medalla ganada', style: 'border:0;background:transparent;padding:0' }, el('div', { class: 'circulo', style: 'width:110px;height:110px' }, icono(medalla.icono))),
    el('h2', { style: 'font-size:2rem;margin-top:8px' }, medalla.nombre),
    medalla.premiaba ? el('p', { class: 'sub' }, medalla.premiaba) : null,
    el('button', { class: 'boton grande bloque', style: 'margin-top:16px', onclick: () => { fondo.remove(); if (alCerrar) alCerrar(); } }, icono('LuPartyPopper'), '¡Genial!')
  );
  caja.querySelector('.circulo svg, .circulo i')?.setAttribute('style', 'width:56px;height:56px');
  fondo.append(caja);
  document.body.append(fondo);
  pintarIconos(caja);
}
