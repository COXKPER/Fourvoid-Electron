const { app, BrowserWindow, shell, session, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow;

// ==========================
// PROTOCOL (DEV + PROD)
// ==========================
if (process.defaultApp) {
  // Dev mode
  app.setAsDefaultProtocolClient(
    'fourvoid',
    process.execPath,
    [path.resolve(process.argv[1])]
  );
} else {
  // Production
  app.setAsDefaultProtocolClient('fourvoid');
}

// ==========================
// URL FILTER
// ==========================
function isAllowed(url) {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    return parsed.hostname === 'fourvo.id' ||
           parsed.hostname.endsWith('.fourvo.id');

  } catch {
    return false;
  }
}

// ==========================
// CREATE WINDOW
// ==========================
function createWindow() {

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(permission === 'notifications');
    }
  );

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Fourvoid",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile('app.html');

  // External link protection
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowed(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  return mainWindow;
}

// ==========================
// WINDOW CONTROLS
// ==========================
ipcMain.on('minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on('close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.on('maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;

  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on("show-notification", (event, text) => {
  new Notification({
    title: "Fourvoid",
    body: text
  }).show();
});

// ==========================
// SINGLE INSTANCE + DEEPLINK
// ==========================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {

  app.on('second-instance', (event, commandLine) => {

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    const deepLink = commandLine.find(arg =>
      arg.startsWith('fourvoid://')
    );

    if (deepLink && mainWindow) {
      mainWindow.webContents.send('deep-link', deepLink);
    }
  });

  app.whenReady().then(() => {

    mainWindow = createWindow();

    // Tangkap deep link saat first launch
    const deepLink = process.argv.find(arg =>
      arg.startsWith('fourvoid://')
    );

    if (deepLink) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('deep-link', deepLink);
      });
    }

    // Auto updater
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = "info";
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// ==========================
// AUTO UPDATER EVENTS
// ==========================
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
});

autoUpdater.on("update-available", () => {
  dialog.showMessageBox({
    type: "info",
    title: "Update Available",
    message: "Update Available, Downloading..."
  });
});

autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox({
    type: "info",
    title: "Update Ready",
    message: "Restart Now?",
    buttons: ["Restart", "Later"]
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on("error", (err) => {
  console.log("Update error:", err);
});