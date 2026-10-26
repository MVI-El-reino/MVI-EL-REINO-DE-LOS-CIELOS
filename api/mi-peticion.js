// api/mi-peticion.js
// Permite a quien envió una petición editarla o marcarla como contestada.
// Se verifica con el código + la clave secreta (token) que quedó guardada en su celular.
const crypto = require('crypto');
const admin = require('firebase-admin');
const C = require('../lib/compartido.js');

const huella = (s) => crypto.createHash('sha256').update(String(s)).digest();

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
  const { codigo = '', token = '', accion = '', estado = '', texto = '', categoria = '' } = req.body || {};

  // Solo códigos con el formato correcto (evita consultas raras a la base de datos)
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(String(codigo))) return res.status(400).json({ error: 'El código no es válido.' });

  try {
    initAdmin();
    const db = admin.database();
    // Del código obtenemos el id interno de la petición
    const indice = (await db.ref(`codigos/${codigo}`).get()).val();
    if (!indice) return res.status(404).json({ error: 'No encontramos ese código.' });

    const ruta = `peticiones/${indice.peticion}`;
    const p = (await db.ref(ruta).get()).val();
    // Verificación: la clave secreta debe coincidir con la que se guardó al enviar
    if (!p || !p.tokenHash || !token || !crypto.timingSafeEqual(huella(token), Buffer.from(p.tokenHash, 'hex'))) {
      return res.status(403).json({ error: 'No se pudo verificar. Use el mismo celular desde el que envió la petición.' });
    }

    // Acción 1: marcar como contestada (o volver a no contestada)
    if (accion === 'estado' && ['contestada', 'no contestada'].includes(estado)) {
      await db.ref().update({
        [`${ruta}/estado`]: estado,
        [`${ruta}/fechaContestada`]: estado === 'contestada' ? Date.now() : null, // null borra el dato
        [`codigos/${codigo}/estado`]: estado,
      });
      return res.status(200).json({ ok: true, estado });
    }

    // Acción 2: editar el texto y el motivo
    if (accion === 'editar') {
      const t = String(texto).trim();
      if (t.length < 5 || t.length > 800) return res.status(400).json({ error: 'Su petición debe tener entre 5 y 800 letras.' });
      if (C.GROSERIAS.test(C.normalizar(t))) return res.status(400).json({ error: 'Por favor, use palabras de respeto.' });
      const cat = Object.hasOwn(C.CATEGORIAS, categoria) ? categoria : C.detectarTema(t);
      // Cambiamos el versículo solo si cambió el motivo
      const versiculo = cat === p.categoria ? p.versiculo : C.versiculoPara(cat);
      await db.ref().update({
        [`${ruta}/texto`]: t,
        [`${ruta}/categoria`]: cat,
        [`${ruta}/versiculo`]: versiculo,
        [`${ruta}/editada`]: Date.now(),
        [`codigos/${codigo}/versiculo`]: versiculo,
      });
      return res.status(200).json({ ok: true, categoria: cat, versiculo });
    }

    return res.status(400).json({ error: 'Acción no válida.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el cambio. Intente de nuevo.' });
  }
};
