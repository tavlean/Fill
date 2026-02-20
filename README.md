# Fill

A lightweight single-file web app that turns your screen into a solid color fill (black, white, red, or any custom CSS color).

## Usage

### Run locally

Because this project is a static HTML app, you can run it in either of these ways:

1. **Open directly**
   - Open `index.html` in your browser.
2. **Serve over HTTP (recommended for TV / kiosk devices)**
   - From this folder, run:
     ```bash
     python3 -m http.server 8080
     ```
   - Visit `http://localhost:8080`.

## Basic interaction flow

- The app starts as a black fullscreen canvas.
- **Click / tap / press Enter** anywhere to reveal controls.
- Pick one of the preset colors (**Black**, **White**, **Red**) or open **Custom** (`+`) to type any valid CSS color.
- Controls auto-hide after ~5 seconds of inactivity unless pinned.

## Keyboard shortcuts

| Action | Key |
| --- | --- |
| Black | `B` |
| White | `W` |
| Red | `R` |
| Custom color input | `C` |
| Toggle fullscreen | `F` |
| Show/hide shortcuts card | `?` |
| Pin/unpin controls | `P` |
| Hide controls / close dialogs | `Esc` |
| Show controls | `Enter` / `NumpadEnter` / `OK` / `Select` |

## TV behavior

This app is TV-friendly by design:

- Supports remote-style confirm keys: `Enter`, `NumpadEnter`, `OK`, and `Select` to open controls.
- `F` toggles browser fullscreen mode (where supported).
- `P` pins controls so they do not auto-hide while navigating.
- The app avoids dependence on hover interactions for critical controls.

## Mobile behavior

- Touch-first interactions are fully supported (`tap` to reveal controls, tap swatches to apply colors).
- Layout scales down on small screens with compact control sizing.
- Input uses mobile-friendly text sizing and accepts any valid CSS color (hex, rgb(), hsl(), named colors, etc.).
- Hover hint behavior is disabled on coarse/non-hover pointers, so mobile devices do not show desktop hover prompts.

## Notes

- If a custom color is invalid, the app shows a brief “Invalid color” message.
- UI tone adapts automatically so controls remain visible on very light backgrounds.
