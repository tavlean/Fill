# Architecture

## No build, classic scripts
Three plain `<script>` tags, not ES modules. ES modules would break opening
`index.html` over `file://` (module fetch needs HTTP/CORS). This keeps zero-deps,
zero-config, single-paint, and offline-trivial.

Each file is an IIFE that hangs its exports on a shared `window.Fill` namespace.
**Load order is a hard dependency:** `color.js` → `store.js` → `app.js`.

## Module boundaries
- `color.js` — pure math. No app state. Touches the DOM only via an offscreen
  canvas inside `parse()`. Safe to unit-test in isolation.
- `store.js` — the **only** owner of state, persistence, and the URL hash.
- `app.js` — the **only** DOM/interaction layer and the **only** `render()` consumer.

## Render model
`store` is pub/sub; `app.js` subscribes once with `render()`. Every state change
re-applies the **entire** displayed state (background, theme-color, UI tone,
active swatch, slider values). No partial/diffed DOM updates — it's cheap and
idempotent, so correctness doesn't depend on which field changed.

## Derived, never stored
The displayed color is always computed, never persisted:
`displayed = scale(base, brightness)`, where
`base = temp !== null ? tempRamp(temp) : parse(color)`.
State holds only `{color, brightness, temp}`.
