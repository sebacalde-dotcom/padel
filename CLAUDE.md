# Pádel 3D

Juego de pádel en 3D que se instala como PWA. Es un proyecto aparte: no tiene nada que ver con MisViajes.

## Cómo correrlo
- `node server.mjs` → http://localhost:5173. Con `--red` también se abre desde el celular en la misma Wi-Fi.
- `node test/sim.mjs` juega partidos enteros sin pantalla y muestra estadísticas: puntos, golpes por punto y cómo termina cada punto. Correrlo siempre después de tocar la física, las reglas o la IA.
- No hay build ni dependencias: son módulos ES, y Three.js 0.170 se carga desde jsDelivr con un import map (en `index.html`).
- Con `?demo` juegan los cuatro solos; `?demo&warp=8` además adelanta 8 s de partido (sirve para capturas).

## Estructura
- `src/physics.js`, `shots.js`, `rules.js`, `ai.js` y `game.js` tienen la lógica. **No importan Three.js ni usan el DOM**, así `test/sim.mjs` los prueba con Node. Mantenerlo así.
- `src/view/*` es lo que se dibuja: cancha, jugadores y pelota. `src/main.js` une todo con `input.js`, `hud.js` y `sound.js`.
- `maqueta/` guarda la maqueta original con los 4 estilos gráficos (`index.html?estilo=...`). Se eligió el realista.
- PWA: `sw.js` y `manifest.webmanifest`. Si se agregan archivos, sumarlos a `APP` en `sw.js` y subir la versión de `CACHE`.

## Convenciones del mundo
- Todo en metros. x va a lo ancho (−5..5), y hacia arriba, z a lo largo (−10..10), y la red está en z = 0.
- El equipo 0 (el del jugador) juega en z < 0 y mira a +z, así que su derecha es −x. El jugador humano es el 0 y cubre la mitad x > 0, que en pantalla queda a la izquierda.
- Medidas FIP:
  - cancha de 20 × 10 m;
  - red de 0,88 m en el centro y 0,92 m en los postes;
  - líneas de saque a 6,95 m de la red;
  - fondos con 3 m de vidrio y 1 m de malla;
  - laterales escalonados (ver `wallAt` en `physics.js`).
- Reglas:
  - punto de oro;
  - set a 6 games (si llegan a 6-6, se define 7-6);
  - dos saques;
  - pierde el punto quien deja picar dos veces la pelota, o manda la pelota a la pared rival sin que pique antes.

## Capturas sin abrir el navegador
Se sacan con Edge headless usando SwiftShader. El perfil de Edge va siempre en una carpeta temporal, nunca dentro de OneDrive.

```
msedge --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader --allow-file-access-from-files --window-size=1600,740 --virtual-time-budget=25000 --user-data-dir=<temp> --screenshot=<png> "file:///.../index.html?demo&warp=8"
```

Con `--dump-dom` en lugar de `--screenshot` se ven los errores que junta `<pre id="errors">`. Los íconos salen de capturar `tools/icon.html` a 512 y a 192 px.

## Textos
La interfaz y los comentarios van en español rioplatense (vos).
