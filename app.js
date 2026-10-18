const CONFIG = {
  WHATSAPP: '521XXXXXXXXXX', // número del pastor: 521 más 10 dígitos, sin espacios
  TELEFONO: '+52271XXXXXXX', // teléfono de la oficina de la iglesia
  DB: 'https://peticiones-mvi-default-rtdb.firebaseio.com',
};
const $ = (id) => document.getElementById(id);
let tema = '';
let ultimo = null;

function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach((s) => s.classList.toggle('activa', s.id === id));
  window.scrollTo(0, 0);
  if (id === 'mis') listarMis();
}
document.querySelectorAll('[data-ir]').forEach((el) =>
  el.addEventListener('click', (e) => { e.preventDefault(); mostrar(el.dataset.ir); }));

function ayudaUrl(codigo) {
  const txt = codigo ? `Hola, necesito ayuda. Mi código de petición es ${codigo}.` : 'Hola, necesito ayuda.';
  return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(txt)}`;
}
$('btnAyuda').href = ayudaUrl('');
$('btnLlamar').href = `tel:${CONFIG.TELEFONO}`;

function marcarTemas() {
  document.querySelectorAll('#temas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tema === tema)));
}
document.querySelectorAll('#temas button').forEach((b) => b.addEventListener('click', () => {
  tema = tema === b.dataset.tema ? '' : b.dataset.tema;
  marcarTemas();
}));

const anonimo = () => document.querySelector('input[name=anonimo]:checked').value === 'si';
document.querySelectorAll('input[name=anonimo]').forEach((r) =>
  r.addEventListener('change', () => { $('bloqueNombre').style.display = anonimo() ? 'none' : ''; }));

$('formulario').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('error').textContent = '';
  $('enviar').disabled = true;
  try {
    const r = await fetch('/api/peticion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: $('texto').value, categoria: tema, anonimo: anonimo(),
        nombre: $('nombre').value, telefono: $('telefono').value,
        web: $('web').value, acepto: $('acepto').checked,
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'No se pudo enviar. Revise su conexión e intente de nuevo.');
    ultimo = j;
    $('codigoTxt').textContent = j.codigo;
    $('citaTxt').textContent = j.versiculo.cita;
    $('versoTxt').textContent = j.versiculo.texto;
    $('btnAyuda').href = ayudaUrl(j.codigo);
    guardarMis(j.codigo);
    e.target.reset();
    tema = '';
    marcarTemas();
    $('bloqueNombre').style.display = '';
    mostrar('resultado');
  } catch (err) {
    $('error').textContent = err.message;
  } finally {
    $('enviar').disabled = false;
  }
});

$('escuchar').onclick = () => {
  if (!ultimo || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(`${ultimo.versiculo.cita}. ${ultimo.versiculo.texto}`);
  u.lang = 'es-MX';
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
$('copiar').onclick = async () => {
  try {
    await navigator.clipboard.writeText(ultimo.codigo);
    $('copiar').textContent = 'Código copiado';
  } catch {
    alert(`Su código es ${ultimo.codigo}`);
  }
};
$('compartir').onclick = () => {
  const txt = `${ultimo.versiculo.cita}. ${ultimo.versiculo.texto}\n\nBanco de peticiones, MVI El Reino de los Cielos`;
  if (navigator.share) navigator.share({ text: txt, url: location.origin }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
};

function guardarMis(codigo) {
  const lista = JSON.parse(localStorage.getItem('mis') || '[]').filter((c) => c !== codigo);
  lista.unshift(codigo);
  localStorage.setItem('mis', JSON.stringify(lista.slice(0, 50)));
}
function listarMis() {
  const ul = $('listaMis');
  const lista = JSON.parse(localStorage.getItem('mis') || '[]');
  ul.textContent = '';
  $('sinMis').style.display = lista.length ? 'none' : '';
  lista.forEach((codigo) => {
    const li = document.createElement('li');
    const cod = document.createElement('strong');
    cod.textContent = codigo;
    const estado = document.createElement('p');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secundario';
    btn.textContent = 'Ver estado';
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const d = await (await fetch(`${CONFIG.DB}/codigos/${codigo}.json`)).json();
        estado.textContent = d
          ? `${d.estado === 'contestada' ? 'Contestada.' : 'Todavía no contestada.'} ${d.versiculo.cita}`
          : 'No encontramos ese código. Revise que esté bien escrito.';
      } catch {
        estado.textContent = 'No se pudo consultar. Revise su conexión e intente de nuevo.';
      }
      btn.disabled = false;
    };
    li.append(cod, estado, btn);
    ul.append(li);
  });
}
