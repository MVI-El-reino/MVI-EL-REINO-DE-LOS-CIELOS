const crypto = require('crypto');
const admin = require('firebase-admin');

// Groserías comunes en español (incluido el de México). Agregue las que falten.
const GROSERIAS = /\b(pendejo|pendeja|puta|puto|cabron|cabrona|chingar|chingada|chingado|mierda|pinche|culero|culera|verga|idiota)\b/;
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's' };
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[0-9@$]/g, (c) => LEET[c] || c).replace(/[^a-z\s]/g, ' ');

const VERSOS = {
  salud: [
    { cita: 'Salmo 147:3', texto: 'Él sana a los quebrantados de corazón, y venda sus heridas.' },
    { cita: 'Mateo 11:28', texto: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.' },
  ],
  miedo: [
    { cita: 'Isaías 41:10', texto: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sostendré con la diestra de mi justicia.' },
    { cita: '2 Timoteo 1:7', texto: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.' },
    { cita: '1 Pedro 5:7', texto: 'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.' },
  ],
  duelo: [
    { cita: 'Mateo 5:4', texto: 'Bienaventurados los que lloran, porque ellos recibirán consolación.' },
    { cita: 'Salmo 34:18', texto: 'Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.' },
  ],
  familia: [
    { cita: '1 Corintios 13:4', texto: 'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.' },
  ],
  trabajo: [
    { cita: 'Filipenses 4:19', texto: 'Pero mi Dios suplirá todo lo que os falta conforme a sus riquezas en gloria en Cristo Jesús.' },
  ],
  decisiones: [
    { cita: 'Proverbios 3:5-6', texto: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.' },
    { cita: 'Santiago 1:5', texto: 'Y si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente, y sin reproche, y le será dada.' },
  ],
  gratitud: [
    { cita: '1 Tesalonicenses 5:18', texto: 'Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.' },
  ],
};
const PRINCIPAL = { cita: 'Filipenses 4:6-7', texto: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.' };

// Pistas de palabras en el texto, para elegir un versículo más cercano a la petición.
const PISTAS = {
  salud: /enferm|hospital|doctor|sanar|salud|dolor|operaci/,
  miedo: /miedo|temor|ansied|angustia|preocup|nervi/,
  duelo: /murio|falleci|duelo|luto|perdi/,
  trabajo: /trabajo|empleo|deuda|dinero|negocio|pagar|econom/,
  decisiones: /decision|decidir|camino|futuro|direccion|guia/,
  familia: /familia|esposo|esposa|hijo|hija|matrimonio|madre|padre/,
  gratitud: /gracias|agradec|bendic|contest|respondio/,
};

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0 ni 1 para leerlo sin confusión
const codigoNuevo = () => Array.from({ length: 8 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join('');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const b = req.body || {};
  if (b.web) return res.status(400).json({ error: 'No se pudo enviar. Recargue la página e intente de nuevo.' });

  const texto = String(b.texto || '').trim();
  const anonimo = b.anonimo === true;
  const nombre = anonimo ? '' : String(b.nombre || '').trim().slice(0, 60);
  const telefono = String(b.telefono || '').replace(/\D/g, '').slice(0, 15);
  // CAPTURA EL NUEVO CAMPO DEL MURO
  const solicitaMuro = b.muro === true;

  if (texto.length < 5 || texto.length > 800) {
    return res.status(400).json({ error: 'Escriba su petición. Debe tener entre 5 y 800 letras.' });
  }
  if (b.acepto !== true) return res.status(400).json({ error: 'Marque la casilla para aceptar el aviso de privacidad.' });
  if (GROSERIAS.test(norm(texto)) || GROSERIAS.test(norm(nombre))) {
    return res.status(400).json({ error: 'Por favor, use palabras de respeto para enviar su petición.' });
  }

  const categoria = Object.hasOwn(VERSOS, b.categoria) ? b.categoria : '';
  const tema = categoria || Object.keys(PISTAS).find((k) => PISTAS[k].test(norm(texto)));
  const pool = VERSOS[tema];
  const versiculo = pool ? pool[crypto.randomInt(pool.length)] : PRINCIPAL;

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    const db = admin.database();
    const codigo = codigoNuevo();
    const fecha = Date.now();
    const id = db.ref('peticiones').push().key;
    
    // GUARDA LA PETICIÓN CON EL NUEVO CAMPO "solicitaMuro" y "visibilidad"
    await db.ref().update({
      [`peticiones/${id}`]: { 
        texto, 
        categoria, 
        anonimo, 
        nombre, 
        telefono, 
        codigo, 
        estado: 'no contestada', // Esto lo cambiará el pastor en admin.html
        visibilidad: 'privada', // Por defecto es privada hasta que el pastor la apruebe
        solicitaMuro, // Saber si el usuario quiso hacerla pública
        versiculo, 
        fecha, 
        notas: '' 
      },
      [`codigos/${codigo}`]: { estado: 'no contestada', versiculo, fecha },
    });
    res.status(200).json({ codigo, versiculo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar su petición. Intente de nuevo en unos minutos.' });
  }
};
