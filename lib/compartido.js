// lib/compartido.js
// Fuente única de categorías, palabras clave, versículos y filtro de groserías.
// La usan el navegador (app.js) y las funciones de Vercel (api/*.js).
// Si agrega una categoría o una palabra clave, hágalo solo en este archivo.
(function (raiz) {
  // Versículo general para peticiones sin motivo claro
  const PRINCIPAL = {
    cita: 'Filipenses 4:6-7',
    texto: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.',
  };

  // Cada categoría tiene: nombre visible, palabras clave SIN acentos y versículos.
  // El orden importa: si hay empate de palabras, gana la que aparece primero.
  const CATEGORIAS = {
    duelo: {
      label: 'Duelo o pérdida',
      pistas: /murio|falleci|duelo|luto|perdi|perdio/,
      versos: [
        { cita: 'Mateo 5:4', texto: 'Bienaventurados los que lloran, porque ellos recibirán consolación.' },
        { cita: 'Salmo 34:18', texto: 'Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.' },
      ],
    },
    salud: {
      label: 'Salud / Sanidad',
      pistas: /enferm|hospital|doctor|sanar|sanidad|salud|dolor|operaci|cirug|cancer|diabet|medic/,
      versos: [
        { cita: 'Salmo 147:3', texto: 'Él sana a los quebrantados de corazón, y venda sus heridas.' },
        { cita: 'Mateo 11:28', texto: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.' },
      ],
    },
    ansiedad: {
      label: 'Ansiedad o temor',
      pistas: /miedo|temor|ansied|angustia|preocup|nervio|estres|panico|insomnio/,
      versos: [
        { cita: 'Isaías 41:10', texto: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sostendré con la diestra de mi justicia.' },
        { cita: '1 Pedro 5:7', texto: 'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.' },
      ],
    },
    finanzas: {
      label: 'Finanzas / Provisión',
      pistas: /trabajo|empleo|deuda|dinero|negocio|pagar|econom|renta|sueldo|quiebra|desempleo/,
      versos: [
        { cita: 'Filipenses 4:19', texto: 'Pero mi Dios suplirá todo lo que os falta conforme a sus riquezas en gloria en Cristo Jesús.' },
      ],
    },
    familia: {
      label: 'Matrimonio / Familia',
      pistas: /familia|esposo|esposa|hijo|hija|matrimonio|madre|padre|pareja|divorcio|hermano/,
      versos: [
        { cita: '1 Corintios 13:4', texto: 'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.' },
      ],
    },
    ministerio: {
      label: 'Ministerio / Propósito',
      pistas: /ministerio|servir|llamado|proposito|dones|predicar|evangeli|mision|discipul/,
      versos: [
        { cita: 'Santiago 1:5', texto: 'Y si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente, y sin reproche, y le será dada.' },
        { cita: 'Mateo 28:20', texto: 'Enseñándoles que guarden todas las cosas que os he mandado; y he aquí yo estoy con vosotros todos los días, hasta el fin del mundo. Amén.' },
      ],
    },
    gratitud: {
      label: 'Acción de gracias',
      pistas: /gracias|agradec|bendic|contesto|respondio|alabanza/,
      versos: [
        { cita: '1 Tesalonicenses 5:18', texto: 'Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.' },
      ],
    },
    otro: { label: 'Otro', pistas: null, versos: [] },
  };

  // Quita acentos, pasa a minúsculas y cambia números comunes por letras (p. ej. "p3ndejo")
  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's' };
  const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-9@$]/g, (c) => LEET[c] || c).replace(/[^a-z\s]/g, ' ');

  // Groserías en español, incluido el de México. Agregue las que falten.
  const GROSERIAS = /\b(pendejo|pendeja|puta|puto|cabron|cabrona|chingar|chingada|chingado|mierda|pinche|culero|culera|verga|idiota)\b/;

  // Elige la categoría con más palabras clave en el texto ("otro" si ninguna coincide)
  function detectarTema(texto) {
    const t = normalizar(texto);
    let mejor = 'otro';
    let puntos = 0;
    for (const [id, c] of Object.entries(CATEGORIAS)) {
      if (!c.pistas) continue;
      const n = (t.match(new RegExp(c.pistas.source, 'g')) || []).length;
      if (n > puntos) { puntos = n; mejor = id; }
    }
    return mejor;
  }

  // Elige un versículo al azar dentro de la categoría (o el general si no hay)
  function versiculoPara(categoria) {
    const pool = (CATEGORIAS[categoria] && CATEGORIAS[categoria].versos) || [];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : PRINCIPAL;
  }

  const API = { CATEGORIAS, GROSERIAS, normalizar, detectarTema, versiculoPara, PRINCIPAL };
  raiz.COMPARTIDO = API;                                       // En el navegador: window.COMPARTIDO
  if (typeof module !== 'undefined' && module.exports) module.exports = API; // En Vercel: require()
})(typeof window !== 'undefined' ? window : globalThis);
