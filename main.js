const { app, BrowserWindow, shell, protocol, session } = require('electron');
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
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true
    }
  });

  win.setMenu(null);
  win.loadURL('https://fourvo.id');

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
}

app.whenReady().then(createWindow);