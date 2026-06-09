# Fill

Turn any screen into a controllable light or a solid color. Fill is a tiny,
single-purpose web app — no build step, no dependencies, works offline as a PWA.

Pick a color or white light, set the **brightness** and **warmth**, **lock** it
as a steady lightbox, and **share** an exact setup with a link.

## What it's good for

- **Screen light / softbox** — light your face on a call or in a mirror; tune
  brightness and warm↔cool temperature.
- **Lightbox / tracing** — full white at max brightness, locked so wiping or
  laying paper on the screen won't disturb it. The screen stays awake.
- **Night light / reading light** — a dim, warm fill that's easy on the eyes.
- **Bias light** — a soft, dim color behind a monitor or TV.
- **Dead-pixel check & screen cleaning** — solid black/white/red, full screen.
- **"TV is off" illusion** — a full-screen black fill on a TV browser.
- **Color reference** — show any CSS color and share it by link.

## Controls

Tap / click anywhere to reveal the controls, then:

- **Swatches** — Black, White (light), Red, or **+** for any CSS color.
- **Brightness** slider — dims the current color or light.
- **Temperature** slider — warm→cool, shown only for White / light.

Controls auto-hide after a few seconds unless pinned.

### Gestures

- **Drag up/down** anywhere to change brightness.
- **Drag left/right** (in light mode) to change temperature.

### Keyboard

| Action | Key |
| --- | --- |
| Black | `B` |
| White (light) | `W` |
| Red | `R` |
| Custom color input | `C` |
| Brightness up / down | `↑` / `↓` |
| Temperature warm / cool | `←` / `→` (light mode) |
| Toggle fullscreen | `F` |
| Lock / unlock | `L` |
| Show/hide shortcuts | `?` |
| Pin/unpin controls | `P` |
| Hide controls / close dialogs | `Esc` |
| Show controls | `Enter` / `OK` / `Select` |

### Lock (lightbox mode)

Press `L` (or use the shortcuts card) to lock. While locked the surface is
inert — taps and wipes won't summon the controls — and the screen is kept awake
via the Screen Wake Lock API. **Hold anywhere for ~1 second** to unlock (a
moving touch, like wiping, won't unlock), or press `L` / `Esc`.

## Sharing & persistence

The current setup is mirrored into the URL hash so links are shareable, and the
last setup is restored on your next visit.

- `https://fill.tavlean.com/#ff8800` — a bare color.
- `…/#c=ff8800&b=60` — a color at 60% brightness.
- `…/#t=30&b=80` — warm light (temperature 30%) at 80% brightness.

A shared link always wins over your saved state; the default (black, 100%) keeps
the URL clean.

## Run locally

It's a static site — no build.

1. **Open directly** — open `index.html` in a browser. (Shareable links and the
   Wake Lock API work best over HTTP/HTTPS.)
2. **Serve over HTTP** (recommended for TV / kiosk):
   ```bash
   python3 -m http.server 8080
   ```
   then visit `http://localhost:8080`.

## Project layout

```
index.html              markup + script tags (no bundler)
assets/css/app.css      styles
assets/js/color.js      pure color math (parse, scale, luminance, Kelvin)
assets/js/store.js      state, persistence, and URL-hash sharing
assets/js/app.js        DOM wiring: controls, sliders, gestures, lock
```

`color.js` holds no state and touches no DOM beyond an offscreen canvas for
parsing, so its math is easy to reason about and test in isolation.

## Notes

- UI tone (light/dark controls) adapts automatically to the fill so controls
  stay legible on bright backgrounds.
- An invalid custom color shows a brief "Invalid color" message.
- Touch, mouse, and TV-remote (`Enter`/`OK`/`Select`, arrow keys) are all
  supported.
