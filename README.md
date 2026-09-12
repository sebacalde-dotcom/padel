# Padel Park

Partido de pádel en 3D para el celular o la compu: vos y tu compañero contra la computadora, en una cancha reglamentaria de césped azul y paredes de vidrio.

## Jugar
En el celular o en la compu: **https://sebacalde-dotcom.github.io/padel/**. Desde el celular se puede instalar como app.

Para correrlo en tu compu:
1. `node server.mjs`
2. Abrí http://localhost:5173

Con `node server.mjs --red` también se abre desde el celular, si está en la misma Wi-Fi.

## Controles
| | Celular | Compu |
|---|---|---|
| Moverte | joystick (mitad izquierda de la pantalla) | flechas o WASD |
| Golpe (drive o volea) | GOLPE | J o espacio |
| Globo | GLOBO | K |
| Remate | REMATE | L |
| Dejada | DEJADA | I |
| Pausa | botón de pausa | P o Esc |

Apretá el golpe justo antes de que te llegue la pelota. La dirección del joystick en ese momento elige hacia qué lado va.

## Qué tiene
- **Física de la pelota:**
  - aire y efecto (liftado y cortado);
  - piques en el césped;
  - rebotes vivos en el vidrio, y muertos e impredecibles en la malla;
  - red y pelotas que salen por arriba del cerramiento.
- **Golpes con trayectoria propia:** drive, globo, remate, dejada y saque.
- **Reglas:**
  - saque cruzado con dos oportunidades;
  - pierde el punto quien deja picar dos veces la pelota;
  - también pierde quien manda la pelota a la pared rival sin que pique antes;
  - punto de oro y set a 6 games.
- **Rivales y compañero** manejados por la computadora.

## Pruebas
`node test/sim.mjs` juega partidos completos sin pantalla y muestra estadísticas.
