// Único fichero que hay que editar al desplegar: la URL de la aplicación web de Apps Script
// (termina en /exec). En local, el servidor de desarrollo responde en /api.
export const API_URL = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? '/api'
  : 'https://script.google.com/macros/s/AKfycbwN49ml5Ia6f7nGhDTTBrIzc5tG4qNLuQdW6oqeCdrRnDOB6rUq4MdscfywzBGt2ylQ/exec';

// Cada cuántos segundos se refresca el estado durante el taller y en el panel en vivo.
export const REFRESCO_ALUMNO_S = 20;
export const REFRESCO_VIVO_S = 6;
