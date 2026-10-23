const CONFIG = {
  // NOTA: Configura con el código de país (52) y el número a 10 dígitos. Sin el "1" intermedio.
  WHATSAPP: '52XXXXXXXXXX', 
  TELEFONO: '+52271XXXXXXX', 
  DB: 'https://peticiones-mvi-default-rtdb.firebaseio.com',
};

// Utilidad para selección rápida del DOM
const $ = (id) => document.getElementById(id);

let ultimo = null; // Eliminamos la variable "tema" global porque ahora usamos un menú desplegable directo

/**
 * Función central de navegación entre pantallas (SPA)
 */
function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach((s) => s.classList.toggle('activa', s.id === id));
  window.scrollTo(0, 0);
  
  if (id === 'mis') listarMis();
  if (id === 'muro') cargarMuro(); 
  if (id === 'testimonios') cargarTestimonios();
}

// Bindeo automático de eventos de navegación basados en el atributo data-ir
document.querySelectorAll('[data-ir]').forEach((el) =>
  el.addEventListener('click', (e) => { 
    e.preventDefault(); 
    mostrar(el.dataset.ir); 
  })
);

function ayudaUrl(codigo) {
  const txt = codigo ? `Hola, necesito ayuda. Mi código de petición es ${codigo}.` : 'Hola, necesito ayuda espiritual.';
  return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(txt)}`;
}

// NUEVA VERSIÓN A PRUEBA DE ERRORES:
if ($('btnAyuda')) $('btnAyuda').href = ayudaUrl('');
if ($('btnLlamar')) $('btnLlamar').href = `tel:${CONFIG.TELEFONO}`;

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
  
  // Reseteo visual de errores con "?" protector (Evita que la app choque si no encuentra la etiqueta)
  if($('error')) $('error').textContent = '';
  $('enviar').disabled = true;

  try {
    // 1. Leer el nuevo menú desplegable de Motivo (Tema)
    const temaSeleccionado = $('tema').value;

    // 2. Leer la Privacidad 
    const privacidadSeleccionada = document.querySelector('input[name="privacidad"]:checked').value;
    const solicitaMuro = (privacidadSeleccionada === 'publica'); 
    
    // 3. Evaluar el anonimato
    const esAnonimo = anonimo();

    // Petición asíncrona hacia el Endpoint del Backend (/api/peticion.js)
    const r = await fetch('/api/peticion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: $('texto').value, 
        categoria: temaSeleccionado, 
        anonimo: esAnonimo,
        nombre: esAnonimo ? "Anónimo" : $('nombre').value, 
        telefono: $('telefono').value,
        web: $('web').value,
        muro: solicitaMuro 
      }),
    });
    
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Falla de conexión con el servidor. Intente nuevamente.');
    
    ultimo = j; 
    
    // Inyección de la respuesta de la base de datos en el DOM
    $('codigoTxt').textContent = j.codigo;
    $('citaTxt').textContent = j.versiculo.cita;
    $('versoTxt').textContent = j.versiculo.texto;
    if ($('btnAyuda')) $('btnAyuda').href = ayudaUrl(j.codigo);
    
    guardarMis(j.codigo);
    
    e.target.reset();
    $('bloqueNombre').style.display = 'block';
    
    mostrar('resultado'); 

  } catch (err) {
    if($('error')) $('error').textContent = err.message;
  } finally {
    $('enviar').disabled = false; 
  }
});

// =====================================================================
// DE AQUÍ EN ADELANTE TU CÓDIGO SE QUEDA EXACTAMENTE IGUAL
// (TTS, Portapapeles, Compartir, guardarMis, listarMis, cargarMuro, etc.)
// =====================================================================

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
          ? `Estado: ${d.estado === 'contestada' ? 'Contestada' : 'Aún orando por ti.'} (${d.versiculo.cita})`
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
/**
 * RENDERIZADO DEL MURO PÚBLICO
 * Descarga las peticiones aprobadas desde un nodo público seguro y genera las tarjetas.
 */
async function cargarMuro() {
  const contenedor = $('contenedorMuro');
  contenedor.innerHTML = '<p style="text-align: center;">Cargando peticiones...</p>';

  try {
    // Consulta al nodo /muro.json (Solo contiene peticiones aprobadas por el pastor)
    const r = await fetch(`${CONFIG.DB}/muro.json`);
    const data = await r.json();

    if (!data) {
      contenedor.innerHTML = '<p style="text-align: center; color: var(--texto-suave);">Aún no hay peticiones en el muro. ¡Sé el primero en compartir tu necesidad!</p>';
      return;
    }

    // Convertir el objeto de Firebase en un Array y ordenarlo por fecha (más recientes arriba)
    const peticionesMuro = Object.entries(data)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.fecha - a.fecha);

    contenedor.innerHTML = ''; // Limpiar el estado de carga

    peticionesMuro.forEach(p => {
      // 1. Crear la tarjeta base
      const div = document.createElement('div');
      div.className = 'fila-admin'; // Usamos la clase de CSS existente que hace que parezca tarjeta
      div.style.padding = '20px';

      // 2. Determinar si mostramos el nombre o "Anónimo"
      const nombreMostrar = p.anonimo ? 'Petición Anónima' : (p.nombre || 'Petición Anónima');
      
      // 3. Formatear la fecha (Ej: 14 de octubre)
      const fechaStr = new Date(p.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });

      // 4. Lógica Visual para Peticiones Contestadas
      let badgeContestada = '';
      if (p.estado === 'contestada') {
        badgeContestada = `
          <div style="background: var(--acento); color: var(--sobre); padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; display: inline-block; margin-bottom: 12px;">
            ¡Oración Contestada!
          </div>
        `;
      }

      // 5. Ensamblar el HTML de la tarjeta
      div.innerHTML = `
        ${badgeContestada}
        <small style="display: block; color: var(--texto-suave); margin-bottom: 6px;">${fechaStr}</small>
        <h3 style="font-size: 1.2rem; margin: 0 0 10px 0;">${nombreMostrar}</h3>
        <p style="font-size: 1.1rem; line-height: 1.5; margin: 0 0 14px 0;">"${p.texto}"</p>
        <p class="nota" style="font-size: 0.95rem; font-style: italic; border-left: 3px solid var(--acento); padding-left: 10px;">
          Dios prometió: ${p.versiculo.cita}
        </p>
      `;
      
      contenedor.appendChild(div);
    });

  } catch (error) {
    contenedor.innerHTML = '<p style="text-align: center; color: var(--alerta);">Ocurrió un error al cargar el muro. Verifica tu conexión a internet.</p>';
  }
}

//-------------------------------- Enviar Testimonio------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
$('formTestimonio').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('errorTestimonio').textContent = '';$('btnEnviarTestimonio').disabled = true;

  try {
    const r = await fetch('/api/testimonio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: $('textoTestimonio').value,
        nombre: $('nombreTestimonio').value,
        web: $('webTestimonio').value
      }),
    });
    
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    
    e.target.reset();
    alert('¡Tu testimonio ha sido publicado con éxito!');
    cargarTestimonios(); // Recarga la lista instantáneamente
  } catch (err) {
    $('errorTestimonio').textContent = err.message;
    $('errorTestimonio').style.display = 'block';
  } finally {
    $('btnEnviarTestimonio').disabled = false;
  }
});

// Cargar y mostrar testimonios públicos
async function cargarTestimonios() {
  const contenedor = $('listaTestimonios');
  contenedor.innerHTML = '<p style="text-align: center;">Cargando...</p>';

  try {
    const r = await fetch(`${CONFIG.DB}/testimonios.json`);
    const data = await r.json();

    if (!data) {
      contenedor.innerHTML = '<p style="text-align: center; color: var(--texto-suave);">Aún no hay testimonios. ¡Sé el primero en testificar!</p>';
      return;
    }

    const lista = Object.entries(data).map(([id, t]) => ({ id, ...t })).sort((a, b) => b.fecha - a.fecha);
    contenedor.innerHTML = ''; 

    lista.forEach(t => {
      const fechaStr = new Date(t.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      const div = document.createElement('div');
      div.className = 'fila-admin'; 
      div.style.padding = '20px';
      
      div.innerHTML = `
        <div style="font-size: 2rem; float: left; margin-right: 15px; opacity: 0.2; color: var(--acento);">❝</div>
        <h3 style="font-size: 1.2rem; margin: 0 0 6px 0; color: var(--acento-texto);">${t.nombre}</h3>
        <small style="display: block; color: var(--texto-suave); margin-bottom: 12px;">${fechaStr}</small>
        <p style="font-size: 1.15rem; line-height: 1.6; margin: 0; font-style: italic;">${t.texto}</p>
        <div style="clear: both;"></div>
      `;
      contenedor.appendChild(div);
    });
  } catch (error) {
    contenedor.innerHTML = '<p style="text-align: center; color: var(--alerta);">Error al cargar los testimonios.</p>';
  }
}
