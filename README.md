# Banco de peticiones (MVI El Reino de los Cielos)

Sitio para celulares publicado en Vercel, con Firebase Realtime Database y un solo acceso para el panel de administración. No pide correos.

## Archivos
- `index.html`, `styles.css`, `app.js`: lo que ve la gente.
- `admin.html`: panel del pastor. Está en `/admin.html` y no tiene enlace público.
- `api/peticion.js`: recibe la petición, filtra groserías, asigna el versículo y genera el código.
- `api/admin-login.js`: revisa la contraseña única y abre el panel.
- `database.rules.json`: reglas de seguridad de Firebase.
- `manifest.json` e `icons/`: para instalarla en la pantalla de inicio.

## 1. Firebase
1. En Realtime Database, pestaña Reglas: pegue el contenido de `database.rules.json` y presione Publicar.
2. En Compilación, Authentication: presione Comenzar. No hace falta activar ningún proveedor.
3. En Configuración del proyecto, Cuentas de servicio: presione Generar nueva clave privada. Se descarga un JSON. Nunca lo suba a GitHub.
4. En Configuración del proyecto, General, sección Sus apps: copie `apiKey` y `appId` y péguelos en `admin.html`.

## 2. Variables en Vercel (Settings, Environment Variables)
- `FIREBASE_SERVICE_ACCOUNT`: el contenido completo del JSON de la cuenta de servicio.
- `FIREBASE_DATABASE_URL`: `https://peticiones-mvi-default-rtdb.firebaseio.com`
- `ADMIN_PASSWORD`: la contraseña única del panel. Use al menos 12 caracteres.

## 3. Datos por completar
- `app.js`: número de WhatsApp del pastor (521 más 10 dígitos) y teléfono de la oficina.
- `index.html`: sección "Conocer más" (historia, dirección, horarios, declaración de fe). Las partes entre corchetes se reemplazan.
- `icons/icon-192.png` e `icon-512.png`: exporte el escudo con fondo negro, porque el logo tiene fondo blanco.

## 4. Publicar
1. Suba la carpeta a un repositorio de GitHub.
2. En Vercel, Add New, Project: importe el repositorio y presione Deploy.
3. Pruebe enviando una petición desde un celular y luego entre a `/admin.html` con la contraseña.

## Acceso del panel
Una sola contraseña para el pastor y para quien administre en el futuro. Si alguien deja de administrar, cambie `ADMIN_PASSWORD` en Vercel y vuelva a desplegar. Cada celular conserva la sesión hasta que se cierre.

## Antes de compartir en Facebook
- Revisar los términos de uso de la Reina-Valera 1960 (Sociedades Bíblicas Unidas) para mostrar los versículos.
- Revisar el aviso de privacidad con alguien que conozca la LFPDPPP.
- Probar el botón de WhatsApp desde un celular. Si no abre, pruebe el número sin el 1 después del 52.
- Probar con cinco personas mayores.
- Crear un código QR con la dirección final para el templo y la página de Facebook.
