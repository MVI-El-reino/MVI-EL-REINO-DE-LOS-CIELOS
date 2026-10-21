const CONFIG = {
  // NOTA: Configura con el código de país (52) y el número a 10 dígitos. Sin el "1" intermedio.
  WHATSAPP: '52XXXXXXXXXX', 
  TELEFONO: '+52271XXXXXXX', 
  DB: 'https://peticiones-mvi-default-rtdb.firebaseio.com',
};

// Utilidad para selección rápida del DOM (Simulando jQuery de forma nativa)
const $ = (id) => document.getElementById(id);

let tema = '';
let ultimo = null;

/**
 * Función central de navegación entre pantallas (Single Page Application - SPA).
 * Oculta todas las secciones y muestra solo la que coincida con el ID proporcionado.
 */
function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach((s) => s.classList.toggle('activa', s.id === id));
  window.scrollTo(0, 0); // Resetea el scroll al inicio al cambiar de vista
  if (id === 'mis') listarMis(); // Refresca el LocalStorage al entrar al historial
}

// Bindeo automático de eventos de navegación basados en el atributo data-ir
document.querySelectorAll('[data-ir]').forEach((el) =>
  el.addEventListener('click', (e) => { 
    e.preventDefault(); 
    mostrar(el.dataset.ir); 
  })
);

/**
 * Genera dinámicamente el enlace de WhatsApp (API de click-to-chat).
 * Si existe un código de petición, lo inyecta para dar contexto al pastor.
 */
function ayudaUrl(codigo) {
  const txt = codigo ? `Hola, necesito ayuda. Mi código de petición es ${codigo}.` : 'Hola, necesito ayuda espiritual.';
  return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(txt)}`;
}

// Asignación inicial de enlaces fijos en la barra inferior (Sticky Footer)
$('btnAyuda').href = ayudaUrl('');$('btnLlamar').href = `tel:${CONFIG.TELEFONO}`;

/**
 * Manejo visual (UI) de la selección de "Temas" en el formulario.
 * Utiliza atributos ARIA para accesibilidad en lectores de pantalla.
 */
function marcarTemas() {
  document.querySelectorAll('#temas button').forEach((b) => 
    b.setAttribute('aria-pressed', String(b.dataset.tema === tema))
  );
}

// Toggle (activar/desactivar) selección exclusiva de temas
document.querySelectorAll('#temas button').forEach((b) => b.addEventListener('click', () => {
  tema = tema === b.dataset.tema ? '' : b.dataset.tema;
  marcarTemas();
}));

// Lógica condicional: Ocultar bloque de "Nombre" si selecciona "Anónimo"
const anonimo = () => document.querySelector('input[name=anonimo]:checked').value === 'si';
document.querySelectorAll('input[name=anonimo]').forEach((r) =>
  r.addEventListener('change', () => { 
    $('bloqueNombre').style.display = anonimo() ? 'none' : 'block'; 
  })
);

/**
 * CONTROLADOR PRINCIPAL: Envío del formulario de peticiones a la API Serverless (Vercel)
 */
$('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Reseteo visual de errores y bloqueo de botón para evitar múltiples envíos (Double submit)
  $('error').textContent = '';$('enviar').disabled = true;

  try {
    // NUEVA LÓGICA: Verificar si el usuario solicita publicación pública
    const solicitaMuro = $('solicitaMuro') ?$('solicitaMuro').checked : false;

    // Petición asíncrona hacia el Endpoint del Backend (/api/peticion.js)
    const r = await fetch('/api/peticion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: $('texto').value, 
        categoria: tema, 
        anonimo: anonimo(),
        nombre: $('nombre').value, 
        telefono: $('telefono').value,
        web: $('web').value, // Honeypot antispam: si viene lleno, es un bot
        acepto: $('acepto').checked,
        muro: solicitaMuro // Bandera para que el Pastor decida publicarla o no
      }),
    });
    
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Falla de conexión con el servidor. Intente nuevamente.');
    
    ultimo = j; // Almacenamiento en caché de memoria para acciones posteriores (Copiar, TTS)
    
    // Inyección de la respuesta de la base de datos en el DOM (Pantalla de Éxito)
    $('codigoTxt').textContent = j.codigo;
    $('citaTxt').textContent = j.versiculo.cita;
    $('versoTxt').textContent = j.versiculo.texto;
    $('btnAyuda').href = ayudaUrl(j.codigo); // Actualiza el WhatsApp con el código
    
    // Persistencia local para el seguimiento del usuario
    guardarMis(j.codigo);
    
    // Limpieza de estados del formulario
    e.target.reset();
    tema = '';
    marcarTemas();
    $('bloqueNombre').style.display = 'block';
    
    mostrar('resultado'); // Transición a pantalla de éxito

  } catch (err) {
    $('error').textContent = err.message;
  } finally {
    $('enviar').disabled = false; // Restaurar interactividad
  }
});

/**
 * Text-to-Speech (TTS) usando Web Speech API nativa.
 * Ideal para accesibilidad de adultos mayores o discapacidades visuales.
 */
$('escuchar').onclick = () => {
  if (!ultimo || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(`${ultimo.versiculo.cita}. ${ultimo.versiculo.texto}`);
  u.lang = 'es-MX';
  u.rate = 0.9; // Velocidad ligeramente reducida para mayor claridad
  speechSynthesis.cancel(); // Evita encolamiento si presionan múltiples veces
  speechSynthesis.speak(u);
};

/**
 * API del Portapapeles (Clipboard API) para dispositivos modernos.
 * Incluye un fallback (alerta) para navegadores antiguos.
 */
$('copiar').onclick = async () => {
  try {
    await navigator.clipboard.writeText(ultimo.codigo);
    $('copiar').textContent = '¡Código copiado!';
    setTimeout(() => $('copiar').textContent = 'Copiar código', 3000); // Reset visual
  } catch {
    alert(`Su código es ${ultimo.codigo}. Escríbalo o tómelo captura.`);
  }
};

/**
 * API de Web Share nativa (Despliega el menú nativo de compartir en iOS/Android).
 * Fallback a link directo de WhatsApp Web si se usa en escritorio.
 */
$('compartir').onclick = () => {
  const txt = `${ultimo.versiculo.cita}. ${ultimo.versiculo.texto}\n\nBanco de Peticiones - MVI El Reino de los Cielos`;
  if (navigator.share) {
    navigator.share({ text: txt, url: location.origin }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  }
};

/**
 * LOCAL STORAGE MANAGER: Gestión del historial de peticiones del dispositivo.
 * Limita el array a 50 peticiones para no saturar memoria. LIFO (Last In First Out).
 */
function guardarMis(codigo) {
  const lista = JSON.parse(localStorage.getItem('mis') || '[]').filter((c) => c !== codigo);
  lista.unshift(codigo); 
  localStorage.setItem('mis', JSON.stringify(lista.slice(0, 50)));
}

/**
 * Renderizado en tiempo real del historial de peticiones consultando Firebase REST API.
 */
function listarMis() {
  const ul = $('listaMis');
  const lista = JSON.parse(localStorage.getItem('mis') || '[]');
  
  ul.textContent = ''; // Limpia el DOM antes de renderizar
  $('sinMis').style.display = lista.length ? 'none' : 'block';
  
  lista.forEach((codigo) => {
    const li = document.createElement('li');
    
    const cod = document.createElement('strong');
    cod.textContent = codigo;
    
    const estado = document.createElement('p');
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secundario';
    btn.textContent = 'Ver estado actual';
    
    // Consulta directa (GET) a la base de datos de Firebase usando el ID
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const d = await (await fetch(`${CONFIG.DB}/codigos/${codigo}.json`)).json();
        estado.textContent = d
          ? `Estado: ${d.estado === 'contestada' ? 'Contestada 🙏' : 'Aún orando por ti.'} (${d.versiculo.cita})`
          : 'No encontramos el código en el sistema.';
      } catch {
        estado.textContent = 'Error de conexión. Intente en un momento.';
      }
      btn.disabled = false;
    };
    
    li.append(cod, estado, btn);
    ul.append(li);
  });
}
