const path = require('path');
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} = require('electron');
const { WebSocketServer } = require('ws');

const WS_PORT = 47195;

let mainWindow = null;
let tray = null;
let wss = null;
let activeSocket = null;
let latestCompanionState = {
  snapshot: null,
  settings: null,
  extensionConnected: false,
};

let currentSize = { width: 388, height: 58 };
let customAnchor = null; // { centerX, y } when user drags window

function getWorkArea() {
  const cursor = screen.getCursorScreenPoint();
  const display = mainWindow
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getDisplayNearestPoint(cursor);
  return display.workArea;
}

function computeTopCenterBounds(width, height) {
  const work = getWorkArea();
  const centerX = customAnchor
    ? customAnchor.centerX
    : work.x + Math.round(work.width / 2);
  const y = customAnchor ? customAnchor.y : work.y + 8;

  const clampedX = Math.max(
    work.x + 8,
    Math.min(work.x + work.width - width - 8, Math.round(centerX - width / 2))
  );
  const clampedY = Math.max(
    work.y + 4,
    Math.min(work.y + work.height - height - 8, Math.round(y))
  );

  return { x: clampedX, y: clampedY, width: Math.round(width), height: Math.round(height) };
}

function applyBounds(width, height) {
  currentSize = { width, height };
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = computeTopCenterBounds(width, height);
  mainWindow.setBounds(bounds, false);
}

function snapToTopCenter() {
  customAnchor = null;
  applyBounds(currentSize.width, currentSize.height);
}

function pushStateToRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('companion:state', latestCompanionState);
}

function startWebSocketBridge() {
  wss = new WebSocketServer({ host: '127.0.0.1', port: WS_PORT });

  wss.on('connection', (ws) => {
    activeSocket = ws;
    latestCompanionState = { ...latestCompanionState, extensionConnected: true };
    pushStateToRenderer();

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'COMPANION_STATE') {
          latestCompanionState = {
            snapshot: msg.snapshot ?? null,
            settings: msg.settings ?? null,
            extensionConnected: true,
          };
          pushStateToRenderer();
        }
      } catch {
        // Ignore malformed packets.
      }
    });

    ws.on('close', () => {
      if (activeSocket === ws) {
        activeSocket = null;
        latestCompanionState = {
          ...latestCompanionState,
          extensionConnected: false,
        };
        pushStateToRenderer();
      }
    });
  });

  wss.on('error', (err) => {
    console.error('[Spotify Mini Desktop] WebSocket server error:', err.message);
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'icons', 'icon32.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Spotify Mini — Dynamic Island');

  const updateMenu = () => {
    const visible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
    const menu = Menu.buildFromTemplate([
      {
        label: visible ? 'Hide Dynamic Island' : 'Show Dynamic Island',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.showInactive();
          }
          updateMenu();
        },
      },
      {
        label: 'Snap to Top Center',
        click: () => {
          snapToTopCenter();
          mainWindow?.showInactive();
        },
      },
      { type: 'separator' },
      {
        label: 'Open Spotify Web',
        click: () => {
          if (activeSocket && activeSocket.readyState === 1) {
            activeSocket.send(JSON.stringify({ type: 'OPEN_SPOTIFY_TAB' }));
          } else {
            void shell.openExternal('https://open.spotify.com/');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Spotify Mini',
        click: () => app.quit(),
      },
    ]);
    tray.setContextMenu(menu);
  };

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.showInactive();
    }
    updateMenu();
  });

  updateMenu();
}

function createWindow() {
  const initialBounds = computeTopCenterBounds(currentSize.width, currentSize.height);

  mainWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const devUrl = process.env.SPOTIFY_MINI_DESKTOP_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'desktop.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.showInactive();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    pushStateToRenderer();
  });

  mainWindow.on('show', () => {
    mainWindow?.setAlwaysOnTop(true, 'screen-saver');
  });

  mainWindow.on('blur', () => {
    mainWindow?.setAlwaysOnTop(true, 'screen-saver');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('island:get-state', () => latestCompanionState);

ipcMain.on('island:resize', (_evt, payload) => {
  if (!payload || typeof payload.width !== 'number' || typeof payload.height !== 'number') {
    return;
  }
  applyBounds(payload.width, payload.height);
});

ipcMain.on('island:move-by', (_evt, payload) => {
  if (!mainWindow || mainWindow.isDestroyed() || !payload) return;
  const bounds = mainWindow.getBounds();
  const nextX = Math.round(bounds.x + (payload.dx || 0));
  const nextY = Math.round(bounds.y + (payload.dy || 0));
  mainWindow.setPosition(nextX, nextY, false);
  customAnchor = {
    centerX: nextX + Math.round(bounds.width / 2),
    y: nextY,
  };
});

ipcMain.on('island:snap-center', () => {
  snapToTopCenter();
});

ipcMain.on('island:hide', () => {
  mainWindow?.hide();
});

ipcMain.on('island:quit', () => {
  app.quit();
});

ipcMain.on('island:send-to-extension', (_evt, message) => {
  if (activeSocket && activeSocket.readyState === 1) {
    activeSocket.send(JSON.stringify(message));
  } else if (message?.type === 'OPEN_SPOTIFY_TAB') {
    void shell.openExternal('https://open.spotify.com/');
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.showInactive();
    }
  });

  app.whenReady().then(() => {
    startWebSocketBridge();
    createWindow();
    createTray();
  });

  app.on('will-quit', () => {
    try {
      wss?.close();
    } catch {
      // Ignore.
    }
  });

  app.on('window-all-closed', () => {
    // Keep alive in tray unless explicitly quit.
  });
}
