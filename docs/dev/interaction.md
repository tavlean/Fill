# Interaction

## Tap vs drag
The panel, help card, and help ghost all `stopPropagation` on their own
`pointerdown`, so the document-level pointer handlers **only ever see the
background**. Revealing controls happens on `pointerup` *if the pointer didn't
move past 8px* — not on `pointerdown` — so a drag never also triggers a reveal.

## Drag gestures
Axis is locked on the first move past the 8px threshold:
- vertical → brightness,
- horizontal → temperature, **but only in light mode** (otherwise the gesture
  falls back to brightness).

Sensitivity: 60% of the viewport dimension = full 0–1 range.

## Arrow keys
Global `↑/↓` = brightness, `←/→` = temperature (light mode only). They **defer
to a focused `input[type=range]`** (`active.type === "range"`) so the native
range arrows and the global handler don't both apply.

HUD policy: shown for keys only when the panel is hidden, always for gestures,
never for slider `input` (the slider is its own feedback).

## Lock / wake lock
Lock makes the surface inert (taps/wipes do nothing) and requests a Screen Wake
Lock. Unlock by **holding ~1.2s anywhere**; any movement >8px cancels the hold,
so wiping or tracing can never accidentally unlock. `L`/`Esc` also unlock.

Wake Lock is auto-released by the browser when the tab is hidden, so it's
re-acquired on `visibilitychange`. While locked: cursor and help ghost hidden,
and all keys are ignored except `L`/`Esc`.

## Custom-color form
It's an absolutely-positioned popover **above** the panel, so it reserves no
layout space when closed. The error message lives inside it.
