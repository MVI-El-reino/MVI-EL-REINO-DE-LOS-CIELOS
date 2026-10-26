// =====================================================================
// app.js: lógica de la página pública del Banco de peticiones.
// Cada bloque numerado explica qué hace, para poder documentar los cambios.
// =====================================================================

// 1. CONFIGURACIÓN
const CONFIG = {
  WHATSAPP: '522711330016',   // Pastor: 52 + 10 dígitos, sin el "1" intermedio
  TELEFONO: '+52271XXXXXXX',  // Oficina de la iglesia (pendiente de confirmar)
  DB: 'https://peticiones-mvi-default-rtdb.firebaseio.com', // Lectura pública de la base de datos
};
// Versículo que se muestra cuando Dios ya respondió una petición
const VERSO_TESTIMONIO = {
  cita: 'Salmo 66:16',
  texto: 'Venid, oíd todos los que teméis a Dios, y contaré lo que ha hecho a mi alma.',
};

const $ = (id) => document.getElementById(id);
const C = window.COMPARTIDO; // Categorías y filtros (archivo lib/compartido.js)
let ultimo = null;           // Última respuesta del servidor al enviar una petición
let temaManual = false;      // true si la persona eligió el motivo con sus propias manos

// Crea un elemento con texto seguro: textContent evita que se ejecute HTML escrito por otras personas
const el = (tag, texto, clase) => {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;
  if (clase) e.className = clase;
  return e;
};

// 2. NAVEGACIÓN ENTRE PANTALLAS
function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach((s) => s.classList.toggle('activa', s.id === id));
  window.scrollTo(0, 0);
  // Cada pantalla carga sus datos al abrirse
  if (id === 'mis') listarMis();
  if (id === 'muro') cargarMuro();
  if (id === 'testimonios') cargarTestimonios();
}
document.querySelectorAll('[data-ir]').forEach((b) =>
  b.addEventListener('click', (e) => { e.preventDefault(); mostrar(b.dataset.ir); })
);

// 3. BOTÓN "NECESITO AYUDA": abre WhatsApp con el código ya escrito
function ayudaUrl(codigo) {
  const txt = codigo ? `Hola, necesito ayuda. Mi código de petición es ${codigo}.` : 'Hola, necesito ayuda.';
  return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(txt)}`;
}
if ($('btnAyuda')) $('btnAyuda').href = ayudaUrl('');
if ($('btnLlamar')) $('btnLlamar').href = `tel:${CONFIG.TELEFONO}`;

// 4. MOTIVO AUTOMÁTICO
// El menú se llena con las categorías de lib/compartido.js y se sugiere según lo que escribe la persona.
const selTema = $('tema');
selTema.replaceChildren(
  new Option('Selecciona una categoría...', '', true, true),
  ...Object.entries(C.CATEGORIAS).map(([id, c]) => new Option(c.label, id))
);
const pistaTema = el('p', '', 'pista');
selTema.after(pistaTema);

$('texto').addEventListener('input', () => {
  if (temaManual) return; // Si la persona ya eligió un motivo, respetamos su elección
  const texto = $('texto').value.trim();
  if (!texto) { selTema.value = ''; pistaTema.textContent = ''; return; }
  selTema.value = C.detectarTema(texto);
  pistaTema.textContent = 'Motivo sugerido según su petición. Puede cambiarlo.';
});
// "change" solo se dispara cuando la persona elige a mano, no cuando lo llena el programa
selTema.addEventListener('change', () => {
  temaManual = true;
  pistaTema.textContent = 'Motivo elegido por usted.';
});

// 5. ANÓNIMO O CON NOMBRE
const anonimo = () => document.querySelector('input[name=anonimo]:checked').value === 'si';
document.querySelectorAll('input[name=anonimo]').forEach((r) =>
  r.addEventListener('change', () => { $('bloqueNombre').style.display = anonimo() ? 'none' : 'block'; })
);

// 6. ENVÍO DE LA PETICIÓN
$('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('error').textContent = '';
  $('enviar').disabled = true;
  const texto = $('texto').value;
  try {
    const r = await fetch('/api/peticion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto,
        categoria: selTema.value,
        anonimo: anonimo(),
        nombre: anonimo() ? '' : $('nombre').value,
        telefono: $('telefono').value,
        muro: document.querySelector('input[name="privacidad"]:checked').value === 'publica',
        acepto: $('acepto').checked, // Lo marca la persona; antes se enviaba fijo como aceptado
        web: $('web').value,         // Campo trampa anti-robots
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'No se pudo enviar. Revise su conexión e intente de nuevo.');
    ultimo = j;
    // Guardamos código, clave secreta y texto en este celular para poder editar después
    guardarMis({ codigo: j.codigo, token: j.token, texto, categoria: selTema.value });
    $('codigoTxt').textContent = j.codigo;
    $('citaTxt').textContent = j.versiculo.cita;
    $('versoTxt').textContent = j.versiculo.texto;
    if ($('btnAyuda')) $('btnAyuda').href = ayudaUrl(j.codigo);
    e.target.reset();
    temaManual = false;
    pistaTema.textContent = '';
    $('bloqueNombre').style.display = 'block';
    mostrar('resultado');
  } catch (err) {
    $('error').textContent = err.message;
  } finally {
    $('enviar').disabled = false;
  }
});

// 7. BOTONES DE LA PANTALLA DE RESULTADO
$('escuchar').onclick = () => { // Lectura en voz alta del versículo
  if (!ultimo || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(`${ultimo.versiculo.cita}. ${ultimo.versiculo.texto}`);
  u.lang = 'es-MX';
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
$('copiar').onclick = async () => { // Copia el código al portapapeles
  try {
    await navigator.clipboard.writeText(ultimo.codigo);
    $('copiar').textContent = '¡Código copiado!';
    setTimeout(() => ($('copiar').textContent = 'Copiar código'), 3000);
  } catch {
    alert(`Su código es ${ultimo.codigo}. Tome una captura de pantalla.`);
  }
};
$('compartir').onclick = () => { // Menú de compartir del celular; en computadora abre WhatsApp Web
  const txt = `${ultimo.versiculo.cita}. ${ultimo.versiculo.texto}\n\nBanco de Peticiones, MVI El Reino de los Cielos`;
  if (navigator.share) navigator.share({ text: txt, url: location.origin }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
};

// 8. "MIS PETICIONES": se guardan en este celular (código, clave secreta y texto)
function leerMis() {
  try {
    // Convierte el formato antiguo (solo códigos) al nuevo
    return JSON.parse(localStorage.getItem('mis') || '[]')
      .map((x) => (typeof x === 'string' ? { codigo: x, token: '', texto: '', categoria: '' } : x));
  } catch {
    return [];
  }
}
function guardarMis(item) {
  // La petición nueva va primero, sin duplicarse, y se guardan máximo 50
  const lista = [item, ...leerMis().filter((x) => x.codigo !== item.codigo)].slice(0, 50);
  localStorage.setItem('mis', JSON.stringify(lista));
}
function actualizarMis(codigo, cambios) {
  localStorage.setItem('mis', JSON.stringify(leerMis().map((x) => (x.codigo === codigo ? { ...x, ...cambios } : x))));
}
// Envía una acción sobre la petición con su clave secreta
async function accionMia(item, cuerpo) {
  const r = await fetch('/api/mi-peticion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo: item.codigo, token: item.token, ...cuerpo }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'No se pudo guardar el cambio.');
  return j;
}
async function cambiarEstado(item, estado) {
  try {
    await accionMia(item, { accion: 'estado', estado });
    listarMis();
  } catch (err) {
    alert(err.message);
  }
}
// Tarjeta de una petición guardada en este celular
async function tarjetaMia(item) {
  const li = el('li');
  li.append(el('strong', item.codigo));
  if (item.texto) li.append(el('p', `"${item.texto}"`, 'nota'));

  // Estado público: se lee directo de la base de datos (no necesita contraseña)
  const estado = el('p', 'Consultando…');
  li.append(estado);
  let datos = null;
  try {
    datos = await (await fetch(`${CONFIG.DB}/codigos/${item.codigo}.json`)).json();
  } catch { /* si falla, se avisa abajo */ }
  const contestada = Boolean(datos && datos.estado === 'contestada');
  estado.textContent = !datos
    ? 'No encontramos el estado de esta petición.'
    : contestada ? 'Dios ya respondió su petición.' : 'Aún orando por usted.';

  // Sin clave en este celular no se puede editar ni marcar (peticiones enviadas antes de esta versión)
  if (!item.token) return li;

  const acciones = el('div');
  const editor = el('div');
  editor.hidden = true;

  // Editor: texto y motivo
  const ta = el('textarea');
  ta.value = item.texto || '';
  ta.maxLength = 800;
  const selEd = el('select');
  selEd.replaceChildren(...Object.entries(C.CATEGORIAS).map(([id, c]) => new Option(c.label, id, false, id === item.categoria)));
  const msg = el('p', '', 'error');
  const guardar = el('button', 'Guardar cambios', 'principal');
  const cancelar = el('button', 'Cancelar', 'secundario');
  guardar.type = 'button';
  cancelar.type = 'button';
  editor.append(ta, selEd, msg, guardar, cancelar);

  guardar.onclick = async () => {
    msg.textContent = '';
    try {
      const j = await accionMia(item, { accion: 'editar', texto: ta.value, categoria: selEd.value });
      actualizarMis(item.codigo, { texto: ta.value.trim(), categoria: j.categoria });
      listarMis();
    } catch (err) {
      msg.textContent = err.message;
    }
  };
  cancelar.onclick = () => { editor.hidden = true; };

  const editar = el('button', 'Editar mi petición', 'secundario');
  editar.type = 'button';
  editar.onclick = () => { editor.hidden = !editor.hidden; };
  acciones.append(editar);

  if (contestada) {
    // Invitación a dejar testimonio, con un versículo de gratitud
    const caja = el('div', undefined, 'respondida');
    caja.append(el('p', `Gracias a Dios por su respuesta. ${VERSO_TESTIMONIO.texto} (${VERSO_TESTIMONIO.cita})`));
    caja.append(el('p', '¿Quiere animar a otros con su testimonio?'));
    const testimonio = el('button', 'Dejar mi testimonio', 'principal');
    testimonio.type = 'button';
    testimonio.onclick = () => mostrar('testimonios');
    const revertir = el('button', 'Marcar como no contestada', 'secundario');
    revertir.type = 'button';
    revertir.onclick = () => cambiarEstado(item, 'no contestada');
    caja.append(testimonio, revertir);
    acciones.append(caja);
  } else {
    const respondio = el('button', 'Dios ya respondió', 'principal');
    respondio.type = 'button';
    respondio.onclick = () => {
      if (confirm('¿Confirma que Dios ya respondió esta petición?')) cambiarEstado(item, 'contestada');
    };
    acciones.append(respondio);
  }
  li.append(acciones, editor);
  return li;
}
async function listarMis() {
  const lista = leerMis();
  $('sinMis').style.display = lista.length ? 'none' : 'block';
  $('listaMis').replaceChildren(...(await Promise.all(lista.map(tarjetaMia))));
}

// 9. MURO DE ORACIÓN (solo muestra peticiones públicas que el pastor haya aprobado)
async function cargarMuro() {
  const cont = $('contenedorMuro');
  cont.replaceChildren(el('p', 'Cargando peticiones…'));
  try {
    const data = await (await fetch(`${CONFIG.DB}/muro.json`)).json();
    if (!data) {
      cont.replaceChildren(el('p', 'Aún no hay peticiones en el muro. Sea el primero en compartir su necesidad.'));
      return;
    }
    const lista = Object.values(data).sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
    cont.replaceChildren(...lista.map((p) => {
      const card = el('article', undefined, 'fila-admin');
      if (p.estado === 'contestada') card.append(el('p', '¡Oración contestada!', 'cita'));
      card.append(
        el('small', new Date(p.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })),
        el('h3', p.anonimo ? 'Petición anónima' : (p.nombre || 'Petición anónima')),
        el('p', `"${p.texto}"`),
        el('p', `Dios prometió: ${p.versiculo?.cita || ''}`, 'nota'),
      );
      return card;
    }));
  } catch {
    cont.replaceChildren(el('p', 'No se pudo cargar el muro. Revise su conexión.'));
  }
}

// 10. MURAL DE TESTIMONIOS (público)
async function cargarTestimonios() {
  const cont = $('listaTestimonios');
  cont.replaceChildren(el('p', 'Cargando testimonios…'));
  try {
    const data = await (await fetch(`${CONFIG.DB}/testimonios.json`)).json();
    if (!data) {
      cont.replaceChildren(el('p', 'Aún no hay testimonios. Sea el primero en compartir lo que Dios hizo.'));
      return;
    }
    const lista = Object.values(data).sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
    cont.replaceChildren(...lista.map((t) => {
      const card = el('article', undefined, 'fila-admin');
      card.append(
        el('h3', t.nombre || 'Anónimo'),
        el('small', new Date(t.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })),
        el('p', `"${t.texto}"`),
      );
      return card;
    }));
  } catch {
    cont.replaceChildren(el('p', 'No se pudieron cargar los testimonios.'));
  }
}

// 11. ENVÍO DE TESTIMONIO
$('formTestimonio').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('errorTestimonio').textContent = '';
  $('btnEnviarTestimonio').disabled = true;
  try {
    const r = await fetch('/api/testimonio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: $('textoTestimonio').value,
        nombre: $('nombreTestimonio').value,
        web: $('webTestimonio').value,
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'No se pudo publicar su testimonio.');
    e.target.reset();
    alert('¡Su testimonio fue publicado! Gracias por animar a otros.');
    cargarTestimonios();
  } catch (err) {
    $('errorTestimonio').textContent = err.message;
  } finally {
    $('btnEnviarTestimonio').disabled = false;
  }
});
