# 🐱 Focus Buddy

A tiny pixel-art cat that lives on your Windows desktop and keeps you company
while you study. Pick a timer, hit Start, and the little gray tabby wanders
around your desktop, sits, grooms, stretches, and cheers when you finish.

Everything is **local** — no login, no database, no internet, no AI.

---

## ▶️ How to run it (Windows)

1. Install [Node.js](https://nodejs.org) (LTS is fine).
2. Open a terminal in this `focus-buddy` folder.
3. Run:

```bash
npm install
npm start
```

A small, frameless, transparent cat window appears in the lower-right of your
screen, floating above your other windows.

**Optional – build a real `.exe`:**

```bash
npm run dist
```

The installer lands in the `dist/` folder.

---

## 🎮 How to use it

- **Drag the cat** anywhere on your desktop (grab the cat, not the buttons).
- **Pick a time**: tap 10 / 25 / 45 / 60, or type any number `1–180` and press **set**.
- **Start**: the timer counts down and the cat starts wandering your desktop.
- **Pause**: countdown and wandering stop, the cat rests, "Taking a tiny break 🐾".
- **Reset**: clears the session and restores your chosen time.
- **Finish**: at `00:00` the cat does a happy jump and says the session is done.
- **×** (top-right): closes the app.

---

## 🧠 Learn-by-building: how it all works (simple version)

### A. What files exist and what they do

| File | What it's responsible for |
|------|---------------------------|
| `package.json` | Lists the app info + the `npm start` / `npm run dist` commands. |
| `main.js` | The **Electron main process**. Creates the little transparent window and is the ONLY code allowed to actually move the real desktop window. |
| `preload.js` | A tiny **safe bridge**. It gives the UI a small list of allowed commands (like "move the window") without exposing anything dangerous. |
| `src/index.html` | The **layout** — the cat's body parts, the timer text, the buttons, the speech bubble. |
| `src/style.css` | All the **looks and animations** — the pixel cat and every animation (idle, walk, sit, sleep, groom, stretch, celebrate). |
| `src/cat.js` | A small **CatController** that switches the cat's animation state and which way it faces. |
| `src/timer.js` | The **countdown clock** logic (start / pause / reset / format). |
| `src/interactions.js` | The **speech bubble** and the friendly mid-study messages. |
| `src/app.js` | The **conductor** — connects the buttons to the timer, tells the cat what to do, and asks the window to move. |

### B. How the desktop movement works

Only `main.js` can move the real window. The UI (`app.js`) can't touch the
desktop directly — that would be unsafe. Instead:

1. `app.js` calls a safe command like `focusBuddy.setPosition(x, y)`.
2. That command is defined in `preload.js` and forwarded to `main.js`.
3. `main.js` receives it and calls Electron's `win.setPosition(x, y)`.
4. Before moving, `main.js` **clamps** the position so the cat always stays
   inside the usable screen (never behind the taskbar, never off-screen).

During study mode, `app.js` picks a nearby random spot every few seconds and
**glides** the window there a little at a time (not a teleport).

### C. How the timer works

`timer.js` holds a `durationSec` (your chosen time). When you press Start it
runs `setInterval(..., 1000)` — once per second it subtracts 1 and calls back
so the display updates. At `0` it stops and fires `onFinish`, which triggers the
celebration. Pause just stops the interval; Reset puts the seconds back to your
chosen duration.

### D. How the walking animation works

The cat is **not one picture**. It's built from separate blocks: a body, a
head, two ears, two eyes, a tail, and **four legs**. In `style.css`, the
`state-walk` rules animate each leg with a `@keyframes` rotation. The four legs
are split into two diagonal pairs that swing in opposite phases — that's what
makes it look like a real 4-legged walk instead of the whole body just bobbing.
The body and head bob slightly and the tail wags on top of that.

### E. How the cat changes direction

The cat is drawn facing **right** by default. To face **left**, `cat.js` adds a
`face-left` class, and CSS does `transform: scaleX(-1)` — it simply **mirrors**
the whole sprite. In `app.js`, when the cat walks to a target we compare the
target's X to the current X: if the target is to the right we face right, if
it's to the left we face left. So the walk animation always matches the
direction of travel.

### F. How the custom timer works

The four chips (10/25/45/60) each carry a `data-min` number. Clicking one calls
`timer.setMinutes(...)`. The custom box accepts any number; when you press
**set** (or Enter) `app.js` clamps it to `1–180` and calls the same
`setMinutes`. So typing `37` makes the clock show `37:00`, and pressing Start
counts down from there.

### G. Safety choices (why it's set up this way)

- `contextIsolation: true` and `nodeIntegration: false` keep the UI sandboxed.
- The UI can only use the short, safe list of commands in `preload.js`.
- Buttons/inputs are marked `no-drag` so they stay clickable, while the cat area
  is the drag handle for moving the window.

---

## 📝 Notes

- Real cross-desktop movement + dragging only work when launched with Electron
  on Windows (`npm start`). If you open `src/index.html` in a plain browser,
  the cat, timer, animations and bubbles all still work — only the real window
  movement is skipped (it's a desktop-only feature).
