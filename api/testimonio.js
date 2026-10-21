const admin = require('firebase-admin');

// Mismo filtro de groserías para proteger la plataforma
const GROSERIAS = /\b(pendejo|pendeja|puta|puto|cabron|cabrona|chingar|chingada|chingado|mierda|pinche|culero|culera|verga|idiota)\b/;
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's' };
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[0-9@$]/g, (c) => LEET[c] || c).replace(/[^a-z\s]/g, ' ');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const b = req.body || {};
  
  if (b.web) return res.status(400).json({ error: 'Spam detectado.' }); // Honeypot

  const texto = String(b.texto || '').trim();
  const nombre = String(b.nombre || '').trim().slice(0, 60) || 'Anónimo';

  if (texto.length < 5 || texto.length > 800) {
    return res.status(400).json({ error: 'El testimonio debe tener entre 5 y 800 letras.' });
  }

  // Si detecta una grosería, bloquea la publicación
  if (GROSERIAS.test(norm(texto)) || GROSERIAS.test(norm(nombre))) {
    return res.status(400).json({ error: 'Por favor, use palabras de respeto. Su mensaje no fue publicado.' });
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    const db = admin.database();
    const fecha = Date.now();
    const id = db.ref('testimonios').push().key; // Genera un ID único
    
    // Lo guarda directamente en el nodo público de testimonios
    await db.ref(`testimonios/${id}`).set({
      texto,
      nombre,
      fecha
    });

    res.status(200).json({ exito: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo publicar el testimonio. Intente de nuevo.' });
  }
};
