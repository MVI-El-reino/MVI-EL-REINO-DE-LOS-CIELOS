// api/peticion.js
// Recibe una petición nueva: valida, revisa groserías, asigna versículo,
// crea una clave secreta para que la persona pueda editarla después y guarda todo en Firebase.
const crypto = require('crypto');
const admin = require('firebase-admin');
const C = require('../lib/compartido.js'); // Categorías, filtro y versículos compartidos

// Código de 8 caracteres sin I, O, 0 ni 1 para que se lea sin confusión
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codigoNuevo = () => Array.from({ length: 8 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join('');
// Guardamos solo la huella (hash) de la clave secreta, nunca la clave
const huella = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// Inicia Firebase una sola vez por ejecución de la función
function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const b = req.body || {};
  // Campo trampa: si un robot lo llena, rechazamos la petición
  if (b.web) return res.status(400).json({ error: 'No se pudo enviar. Recargue la página e intente de nuevo.' });

  const texto = String(b.texto || '').trim();
  const anonimo = b.anonimo === true;
  const nombre = anonimo ? '' : String(b.nombre || '').trim().slice(0, 60);
  const telefono = String(b.telefono || '').replace(/\D/g, '').slice(0, 15);

  if (texto.length < 5 || texto.length > 800) {
    return res.status(400).json({ error: 'Escriba su petición. Debe tener entre 5 y 800 letras.' });
  }
  if (b.acepto !== true) return res.status(400).json({ error: 'Marque la casilla para aceptar el aviso de privacidad.' });
  if (C.GROSERIAS.test(C.normalizar(texto)) || C.GROSERIAS.test(C.normalizar(nombre))) {
    return res.status(400).json({ error: 'Por favor, use palabras de respeto para enviar su petición.' });
  }

  // Respetamos el motivo elegido; si no es válido, lo detectamos del texto
  const categoria = Object.hasOwn(C.CATEGORIAS, b.categoria) ? b.categoria : C.detectarTema(texto);
  const versiculo = C.versiculoPara(categoria);
  // Clave secreta para editar o marcar como contestada; solo se entrega una vez
  const token = crypto.randomBytes(16).toString('hex');

  try {
    initAdmin();
    const db = admin.database();
    const codigo = codigoNuevo();
    const fecha = Date.now();
    const id = db.ref('peticiones').push().key;
    await db.ref().update({
      [`peticiones/${id}`]: {
        texto, categoria, anonimo, nombre, telefono, codigo,
        estado: 'no contestada',
        visibilidad: 'privada',          // Solo el pastor la pasa al muro
        solicitaMuro: b.muro === true,   // Lo que la persona eligió
        tokenHash: huella(token),
        versiculo, fecha, notas: '',
      },
      // Índice público por código: solo guarda estado y versículo, nunca el texto
      [`codigos/${codigo}`]: { estado: 'no contestada', versiculo, fecha, peticion: id },
    });
    res.status(200).json({ codigo, token, versiculo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar su petición. Intente de nuevo en unos minutos.' });
  }
};
