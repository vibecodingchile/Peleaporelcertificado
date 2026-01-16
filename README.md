# CyberDoom: Guardia de Datos (Chile) — demo web

Juego 2.5D tipo “Doom clásico” (raycasting) en HTML5 Canvas + JavaScript.
**Tema:** defensa y respuesta a incidentes (ficción) dentro de una empresa chilena.

> Importante: esto es un juego y NO incluye instrucciones para sabotear o vulnerar sistemas reales.

## 1) Ejecutar localmente (rápido)

Opción A (Python):
```bash
cd cyberdoom-chile
python -m http.server 8080
```
Abre: http://localhost:8080

Opción B (Node):
```bash
npx serve .
```

## 2) Publicar online (sitio estático)

Puedes subir el proyecto a:
- GitHub Pages
- Netlify
- Cloudflare Pages
- Vercel (como sitio estático)

**No requiere backend** para funcionar: el ranking se guarda localmente (LocalStorage).

## 3) Ranking global opcional (backend Node/Express)

Hay un backend opcional en `server/` con SQLite + JWT.
Sirve para registro/login y tabla de puntajes global.

### Requisitos
- Node.js 18+ recomendado.

### Instalar y correr
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Luego, en `src/config.js` cambia `API_BASE` a tu URL:
- local: `http://localhost:3000`

## 4) Controles

### Desktop

- WASD mover
- Shift correr (consume energía)
- Click o Espacio usar herramienta
- E interactuar (recoger)
- Tab mapa
- Esc pausa


### Móvil / Tablet
- Joystick izquierdo: mover
- Desliza en el panel derecho: mirar
- Botones: 🛠️ herramienta, E interactuar, ⇧ correr, 🗺️ mapa (mantener), ⏸ pausa

## 5) Estructura
- `index.html`, `styles.css`: interfaz
- `src/`: motor y juego
- `server/`: backend opcional

¡Listo!


## 6) Modo móvil + Pantalla completa + PWA (instalable)

### Pantalla completa
- Botón **⛶** (arriba) o **⛶** en los controles táctiles para entrar/salir de pantalla completa (si el navegador lo soporta).
- En iOS, la mejor experiencia suele ser **instalando** el juego (modo standalone) para evitar barras del navegador.

### Instalar como app (PWA)
- Android/Chrome: en el menú principal aparecerá el botón **Instalar** si el navegador lo permite.
- iPhone/iPad (Safari): usa **Compartir → Agregar a pantalla de inicio**.

El Service Worker (`sw.js`) cachea assets para que el juego funcione incluso con conexión inestable.
