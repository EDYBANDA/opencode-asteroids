# AGENTS.md

Asteroids clone in vanilla JS (ES6+). No bundler, no dependencies, no tests, no lint/typecheck config.

## Run / verify

No automated verification exists; all checks are manual. Run with:

```bash
npx serve .   # then open http://localhost:3000
```

or open `index.html` directly in a browser.

## Structure

- All game logic lives in a single `game.js` (~420 lines); `index.html` only hosts the canvas and loads the script. Entry point is the `loop(ts)` game loop at the bottom of `game.js`.
- Entities are plain classes (`Bullet`, `Asteroid`, `Ship`, `Particle`) with `update(dt)` / `draw()` methods; game flow is driven by a `state` variable (`'playing' | 'dead' | 'gameover'`).
- Asteroid tuning lives in the `RADII` / `SPEEDS` / `POINTS` lookup arrays indexed by size (1=small, 2=medium, 3=large).

## Gotchas

- Canvas size is hardcoded in two places: the `width`/`height` attributes in `index.html` and the `W`/`H` constants in `game.js` (toroidal wrap logic depends on them). Change both together.
- Input handling: use `pressed(code)` (consumes `justPressed`) for single-shot actions like firing; use `keys[code]` only for held state (rotation, thrust).
- The README (Spanish) mentions power-ups and a "estrella fugaz" asteroid — these are not implemented in `game.js`. Don't search for them or assume they exist.

## Conventions

- The repo is in Spanish: README, HTML `lang`, and code comments. Keep comments and user-facing text in Spanish.
