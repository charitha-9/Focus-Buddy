# Focus Buddy — PRD

## Problem statement
Windows desktop study companion ("Focus Buddy"): a tiny pixel-art cat desktop
pet built with Electron. Replace prototype with a cute whole-body pixel gray
tabby cat, realistic multi-state animations, real desktop window movement,
dragging, a flexible study timer, autonomous "desktop pet" wandering during
study, friendly local mid-study prompts, and celebration on finish. Local only:
no AI, no login, no DB, no payments, no cloud. Keep Electron (no React).

## Architecture
Self-contained Electron app in `/app/focus-buddy` (separate from the unused
default React/FastAPI boilerplate).
- `main.js` — Electron main: transparent/frameless/always-on-top/skipTaskbar
  window (~210x250), IPC handlers to move the real window, clamps to work area.
- `preload.js` — secure bridge (contextIsolation ON, nodeIntegration OFF),
  exposes `window.focusBuddy` { getWorkArea, getBounds, setPosition, moveBy, quit }.
- `src/index.html` — layout (rigged pixel cat parts, timer, controls, bubble).
- `src/style.css` — pixel cat (gray tabby, unified outline via drop-shadows) +
  all 7 animation states + warm cozy retro UI.
- `src/cat.js` — CatController (state + facing direction + idle life).
- `src/timer.js` — StudyTimer (start/pause/reset/format, 1..180 min).
- `src/interactions.js` — Bubble + local prompt messages.
- `src/app.js` — conductor: UI wiring, session flow, autonomous movement
  controller (rAF glide), prompt scheduler, manual drag→IPC.

## User persona
A student who wants a low-distraction, cute desktop companion + Pomodoro-style
timer that lives on the desktop.

## Core requirements (static)
- Whole-body pixel cat (head, ears, eyes, body, 4 legs, tail).
- States: idle, walk (4-leg gait), sit, sleep (+Zzz), groom, stretch, celebrate.
- Real desktop movement via Electron window positioning, clamped on-screen.
- Draggable cat (moves real window); controls stay clickable.
- Timer presets 10/25/45/60 + custom 1–180.
- Study mode: autonomous, randomized, gentle wandering + in-place behaviours.
- Occasional dismissible local prompts (not too frequent).
- Finish → stop movement, celebrate, "Study session complete! 🎉" + minutes.
- Pause → "Taking a tiny break 🐾"; Reset → "Ready when you are!".
- Compact retro pixel UI (~180–240px wide).

## Implemented (2026-06-27)
- Full app built & verified. Cat + all 7 states render (screenshot-verified).
- Electron boots cleanly under xvfb (only env GPU/dbus warnings; no app errors).
- In-browser functional checks PASS: preset 45→45:00, custom 37→37:00,
  clamp 500→180:00, Start countdown + cat walk/study mode, Pause bubble,
  Reset restores duration + bubble.
- Theme: warm cozy retro pixel UI, gray tabby cat.

### Update 2 (2026-06-27) — 4 enhancements
- Cat Wardrobe: coat colour switch gray/black/orange (CSS var palette override,
  persisted in localStorage 'fb_coat'). Swatches in panel-top. Verified.
- Finish Chime: tiny retro square-wave arpeggio via Web Audio (no file/network);
  plays on session finish; mutable sound toggle persisted 'fb_sound'. Verified toggle.
- Focus Streaks: daily counter of finished sessions, resets each day, persisted
  'fb_streak'. Shown as 🐾 N in panel-top. Increments in finishSession.
- Tray Hideaway: system Tray (icon at src/assets/tray.png, generated locally via
  scripts/make_tray_icon.py with PIL) + global hotkey Ctrl+Shift+F to show/hide;
  tray menu Show/Hide + Quit. Window height bumped 250→300 to fit new row.
  Electron boots cleanly with tray+shortcut under xvfb (no app errors).

## Notes / not runtime-tested in container
- Real cross-desktop window movement + dragging are Windows/Electron-only and
  cannot be exercised in this headless Linux container; code follows standard
  Electron IPC patterns and boots without errors. Verified on-Windows by user.

## Backlog / future
- P2: settings (sound on finish, cat color toggle black/orange, movement calmness).
- P2: session history / streaks (would need local storage).
- P2: tray icon + global hotkey to show/hide.
- P2: more prompt variety / actionable prompts.
