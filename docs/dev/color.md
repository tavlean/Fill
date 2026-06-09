# Color & light

## `parse()` validity via double-seed canvas
Canvas **silently ignores** an invalid `fillStyle` assignment (keeps the prior
value). So one read can't tell "invalid" from "valid but equal to the seed".
Fix: assign seed `#000` then the value (read A), assign seed `#fff` then the
value (read B). Equal ⇒ valid; differ ⇒ invalid. This is why `parse` sets the
style twice with different seeds.

## Brightness = RGB scaling, not an overlay
Brightness multiplies the base color toward black; there is no dimming overlay
element. Consequences:
- `theme-color` (mobile status bar) stays accurate — it's the real displayed color.
- White @100% is true `#ffffff` (needed for lightbox/cleaning).
- Brightness **cannot exceed** the base color; the base is the ceiling.

## White is `temp=1`, not a plain color
The White swatch enters **light mode** (`setTemperature(1)`), it does not set a
`#ffffff` color. `tempToRgb(1)` is special-cased to pure white so lightbox use
gets true `#fff` while the slider stays continuous. `activeSwatch() === "white"`
iff `temp !== null`.

## Temperature ramp
`temp` 0→1 maps linearly to **2000K→6500K** via `kelvinToRgb` (Tanner Helland
approximation). The cool end stops at ~neutral on purpose — colder/bluer light
isn't useful as a screen light — and `t=1` is forced to pure `#fff`.
The Kelvin HUD label is the linear ramp value, so it's approximate (it reads
~6500K at `t=1` even though the color is forced to white). Intentional.

## UI tone (`body.ui-light`)
Computed from the **displayed** (scaled) luminance > 0.62, not the base color.
That's why dimming a bright light flips the controls back to the dark theme.
