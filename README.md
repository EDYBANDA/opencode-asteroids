# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción                    |
| --------- | ------------------------- |
| `←` `→`   | Rotar nave                |
| `↑`       | Propulsar                 |
| `Espacio` | Disparar                  |
| `S`       | Cambiar skin de la nave   |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Estrella fugaz: asteroide dorado veloz que aparece cada 8–15 s, se desvanece sola con el tiempo y otorga 250 puntos si logras destruirla
- Sistema de skins: cambia la apariencia de la nave (silueta y color) con `S`; la elección se recuerda entre sesiones
- Power-ups que sueltan los asteroides destruidos (12%): **Velocidad** (rayo cian) duplica el empuje 5 s; **Escudo** (hexágono verde) protege de colisiones 5 s, destruyendo sin puntos lo que toque
