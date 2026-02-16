const { app, BrowserWindow, shell, protocol, session, ipcMain } = require('electron');
const path = require('path');

function isAllowed(url) {
  try {
    const parsed = new URL(url);

    // hanya https/http
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // izinkan fourvo.id + semua subdomain
    return parsed.hostname === 'fourvo.id' ||
           parsed.hostname.endsWith('.fourvo.id');

  } catch {
    return false;
  }
}

function createWindow() {

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {

      if (permission === 'notifications') {
        // Bisa kamu bikin dialog sendiri
        callback(true);  // allow
      } else {
        callback(false);
      }
    }
  );

  const win = new BrowserWindow({
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
  ipcMain.on('minimize', () => {
    BrowserWindow.getFocusedWindow().minimize();
  });

  ipcMain.on('close', () => {
    BrowserWindow.getFocusedWindow().close();
  });

  ipcMain.on('maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    if (win.isMaximized()) {
      win.unmaximize();   // restore
    } else {
      win.maximize();     // maximize
    }
  });
  ipcMain.on("show-notification", (event, text) => {
  new Notification({
    title: "Fourvoid",
    body: text
  }).show()
})

  win.webContents.setWindowOpenHandler(({ url }) => {
  if (!isAllowed(url)) {
    shell.openExternal(url);
    return { action: 'deny' };
  }
  return { action: 'allow' };
});
  win.setMenu(null);
  win.loadFile('app.html');

  // Handle target="_blank" dan window.open
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowed(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle redirect / klik link biasa
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.webContents.on('did-attach-webview', (event, webContents) => {

  webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

});
}

app.whenReady().then(createWindow);