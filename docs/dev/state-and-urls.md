# State, persistence & URLs

## State shape
`{ color: cssString, brightness: 0–1, temp: 0–1 | null }`.
`temp !== null` means **light mode** — `color` is ignored and the base comes
from the temperature ramp instead.

## Persistence + URL mirror
Every change writes `localStorage["fill:v1"]` and (debounced 250ms) mirrors
state into the URL hash via `history.replaceState` — **no history entries**, so
back/forward isn't polluted.

## Load precedence
URL hash > `localStorage` > default `{black, 1, null}`. A shared link always
wins over the visitor's saved session.

## Hash encoding
- Bare hex: `#ff8800` (solid color at 100%).
- `#c=<hex>&b=<pct>` (solid color, dimmed).
- `#t=<pct>&b=<pct>` (light mode).

Colors are normalized to hex on encode, so named/`rgb()`/custom inputs come back
as hex — lossless visually, intentional. The **default** state encodes to an
empty hash to keep the URL clean (and so the "TV-off" black case has a bare URL).

## `hashchange`
A listener re-applies external/manual hash edits. Note our own `replaceState`
does **not** fire `hashchange`, so this only catches real navigation/edits — no
feedback loop.

## Other storage key
`fill:hinted` — set once after the first-run touch hint shows.
