// Focus Buddy - Electron MAIN process.
// Creates the transparent, frameless, always-on-top CAT window and moves that
// real window around the Windows desktop. Also grows/shrinks the window when
// the (hidden-by-default) timer panel is opened/closed.

const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');

// Window sizes. Cat-only mode is compact; the timer panel mode is taller.
const WIN_WIDTH = 210;
const WIN_FULL = 300;    // cat + timer panel
const WIN_COMPACT = 150; // cat only

let win = null;
let tray = null;

// Return the work area (screen minus taskbar) of the display the window is on.
function currentWorkArea() {
  const b = win ? win.getBounds() : { x: 0, y: 0, width: WIN_WIDTH, height: WIN_COMPACT };
  const display = screen.getDisplayMatching(b);
  return display.workArea; // { x, y, width, height }
}

// Keep the window fully inside the usable desktop so it never disappears.
// Uses the window's CURRENT size (it changes between cat-only / panel modes).
function clamp(x, y) {
  const wa = currentWorkArea();
  const b = win ? win.getBounds() : { width: WIN_WIDTH, height: WIN_COMPACT };
  const maxX = wa.x + wa.width - b.width;
  const maxY = wa.y + wa.height - b.height;
  const cx = Math.round(Math.max(wa.x, Math.min(maxX, x)));
  const cy = Math.round(Math.max(wa.y, Math.min(maxY, y)));
  return { x: cx, y: cy };
}

function createWindow() {
  const primary = screen.getPrimaryDisplay().workArea;

  win = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_COMPACT,   // launches in cat-only mode (panel hidden)
    transparent: true,      // see-through background
    frame: false,           // no title bar / borders
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,       // behave like a pet, not a normal app
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // security: isolate renderer
      nodeIntegration: false,   // security: no node in renderer
      sandbox: true             // security: fully sandboxed renderer
    }
  });

  // Float above normal windows.
  win.setAlwaysOnTop(true, 'screen-saver');

  // Start position: lower-right of the primary monitor, above the taskbar.
  const startX = primary.x + primary.width - WIN_WIDTH - 24;
  const startY = primary.y + primary.height - WIN_COMPACT - 24;
  win.setPosition(Math.round(startX), Math.round(startY));

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Show the pet if hidden, hide it if visible ("tuck it away").
function toggleWindow() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else { win.show(); win.focus(); }
}

// System tray icon + right-click menu.
function createTray() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'tray.png');
  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) return;              // no icon file -> skip tray safely
  image = image.resize({ width: 18, height: 18 });
  tray = new Tray(image);
  tray.setToolTip('Focus Buddy');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / Hide  (Ctrl+Shift+F)', click: toggleWindow },
    { type: 'separator' },
    { label: 'Quit Focus Buddy', click: () => app.quit() }
  ]));
  tray.on('click', toggleWindow);
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  // Global hotkey to summon / hide the cat from anywhere.
  globalShortcut.register('CommandOrControl+Shift+F', toggleWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  app.quit();
});

// ---------------- IPC: the renderer asks main to move / resize the window ---

// Give the renderer the usable desktop bounds.
ipcMain.handle('fb:get-workarea', () => currentWorkArea());

// Give the renderer the window's current position/size.
ipcMain.handle('fb:get-bounds', () => (win ? win.getBounds() : null));

// Move the window to an absolute desktop position (clamped on-screen).
ipcMain.on('fb:set-position', (_e, { x, y }) => {
  if (!win) return;
  const p = clamp(x, y);
  win.setPosition(p.x, p.y);
});

// Move the window by a delta (used while dragging the cat).
ipcMain.on('fb:move-by', (_e, { dx, dy }) => {
  if (!win) return;
  const b = win.getBounds();
  const p = clamp(b.x + dx, b.y + dy);
  win.setPosition(p.x, p.y);
});

// Open/close the timer panel: resize the REAL window between the compact
// cat-only height and the full cat+panel height. Anchors the bottom edge so
// the cat appears to stay put while the panel unfolds beneath it.
ipcMain.on('fb:set-compact', (_e, { open }) => {
  if (!win) return;
  const b = win.getBounds();
  const h = open ? WIN_FULL : WIN_COMPACT;
  if (b.height === h) return;
  const newY = b.y + b.height - h;          // keep the bottom edge anchored
  const p = clamp(b.x, newY);
  win.setBounds({ x: p.x, y: p.y, width: WIN_WIDTH, height: h });
});

ipcMain.on('fb:quit', () => app.quit());
