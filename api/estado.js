const crypto = require('crypto');
const admin = require('firebase-admin');

// Herramienta temporal para revisar la configuración. Bórrela cuando todo funcione.
module.exports = async function handler(req, res) {
  const huella = (s) => crypto.createHash('sha256').update(String(s)).digest();
  const clave = String(req.query.clave || '');
  const correcta = process.env.ADMIN_PASSWORD || '';
  if (!correcta || !crypto.timingSafeEqual(huella(clave), huella(correcta))) {
    return res.status(401).json({ error: 'Clave incorrecta o ADMIN_PASSWORD no está configurada.' });
  }

  const revision = {
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL ? 'configurada' : 'FALTA',
  };
  let cuenta = null;
  try {
    cuenta = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
    revision.FIREBASE_SERVICE_ACCOUNT = cuenta.private_key ? 'configurada' : 'JSON incompleto';
  } catch {
    revision.FIREBASE_SERVICE_ACCOUNT = 'FALTA o no es JSON válido';
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(cuenta),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    await admin.database().ref('diagnostico').set({ fecha: Date.now() });
    revision.escritura_en_base_de_datos = 'correcta';
  } catch (err) {
    revision.escritura_en_base_de_datos = `error: ${err.message}`;
  }
  res.status(200).json(revision);
};
