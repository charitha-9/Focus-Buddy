// Focus Buddy - Electron MAIN process.
// Responsible for: creating the transparent, frameless, always-on-top desktop
// pet window, and moving that real window around the Windows desktop safely.

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// Compact desktop-pet window size (requirement: ~180-240px wide).
const WIN_WIDTH = 210;
const WIN_HEIGHT = 250;

let win = null;

// Return the work area (screen minus taskbar) of the display the window is on.
function currentWorkArea() {
  const b = win ? win.getBounds() : { x: 0, y: 0, width: WIN_WIDTH, height: WIN_HEIGHT };
  const display = screen.getDisplayMatching(b);
  return display.workArea; // { x, y, width, height }
}

// Keep the window fully inside the usable desktop so it never disappears.
function clamp(x, y) {
  const wa = currentWorkArea();
  const maxX = wa.x + wa.width - WIN_WIDTH;
  const maxY = wa.y + wa.height - WIN_HEIGHT;
  const cx = Math.round(Math.max(wa.x, Math.min(maxX, x)));
  const cy = Math.round(Math.max(wa.y, Math.min(maxY, y)));
  return { x: cx, y: cy };
}

function createWindow() {
  const primary = screen.getPrimaryDisplay().workArea;

  win = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
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
      sandbox: false
    }
  });

  // Float above normal windows.
  win.setAlwaysOnTop(true, 'screen-saver');

  // Start position: lower-right of the primary monitor, above the taskbar.
  const startX = primary.x + primary.width - WIN_WIDTH - 24;
  const startY = primary.y + primary.height - WIN_HEIGHT - 24;
  win.setPosition(Math.round(startX), Math.round(startY));

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

// ---------------- IPC: the renderer asks main to move the real window --------

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

ipcMain.on('fb:quit', () => app.quit());
