const crypto = require('crypto');
const admin = require('firebase-admin');

const huella = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const clave = String((req.body && req.body.clave) || '');
  const correcta = process.env.ADMIN_PASSWORD || '';
  if (!correcta || !crypto.timingSafeEqual(huella(clave), huella(correcta))) {
    await new Promise((r) => setTimeout(r, 1500)); // frena intentos repetidos
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    const token = await admin.auth().createCustomToken('administrador', { admin: true });
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo abrir el panel. Revise la configuración en Vercel.' });
  }
};
