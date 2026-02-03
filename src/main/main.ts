/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import dgram from 'dgram';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let targetIp = '192.168.1.200';
let targetPort = 6789;

ipcMain.on('update-connection-settings', (event, settings: any) => {
  if (settings && settings.ip && settings.port) {
    targetIp = settings.ip;
    targetPort = settings.port;
    console.log(`Updated connection target: ${targetIp}:${targetPort}`);
  }
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('udp-send-hex', async (event, message) => {
  if (!message || typeof message !== 'string') return;
  const LOCAL_PORT = 5000;
  // Using dynamic targetIp/targetPort

  const client = dgram.createSocket('udp4');
  client.on('error', (err) => {
    console.error('UDP Broadcast Error:', err);
    try { client.close(); } catch {}
  });

  try {
    client.bind(LOCAL_PORT, () => {
      try {
        client.setBroadcast(true);
        // Convert hex string (with spaces) to buffer
        // Remove spaces first
        const hexStr = message.replace(/\s+/g, '');
        const buffer = Buffer.from(hexStr, 'hex');

        client.send(buffer, targetPort, targetIp, (err) => {
          if (err) console.error('UDP Send Callback Error:', err);
          else console.log(`UDP Hex Broadcast sent: ${message}`);
          client.close();
        });
      } catch (err) {
        console.error('UDP Send Logic Error:', err);
        client.close();
      }
    });
  } catch (e) {
    console.error('UDP Setup Error:', e);
    client.close();
  }
});

import net from 'net';

// ... (existing code)

ipcMain.on('tcp-send-hex', async (event, message) => {
  if (!message || typeof message !== 'string') return;
  const client = new net.Socket();

  client.connect(targetPort, targetIp, () => {
    try {
      const hexStr = message.replace(/\s+/g, '');
      const buffer = Buffer.from(hexStr, 'hex');
      client.write(buffer);
      console.log(`TCP Hex sent: ${message}`);
    } catch (e) {
      console.error('TCP Hex Write Error:', e);
    }
    client.end();
    client.destroy();
  });

  client.on('error', (err) => {
    console.error('TCP Connection Error:', err);
    client.destroy();
  });
});

ipcMain.on('tcp-send', async (event, message) => {
  if (!message || typeof message !== 'string') return;
  const client = new net.Socket();

  client.connect(targetPort, targetIp, () => {
    try {
      client.write(message);
      console.log(`TCP String sent: ${message}`);
    } catch (e) {
      console.error('TCP String Write Error:', e);
    }
    client.end();
    client.destroy();
  });

  client.on('error', (err) => {
    console.error('TCP Connection Error:', err);
    client.destroy();
  });
});

ipcMain.on('udp-send', async (event, message) => {
  if (!message || typeof message !== 'string') return;
  const LOCAL_PORT = 5000;
  // ... (rest of udp existing logic)

  const client = dgram.createSocket('udp4');

  // Mimicking Kotlin's DatagramSocket(LOCAL_PORT) + setBroadcast(true) logic
  // Note: Bind might fail if port is in use. We log errors.
  client.on('error', (err) => {
    console.error('UDP Broadcast Error:', err);
    try {
      client.close();
    } catch {
      /* ignore */
    }
  });

  try {
    client.bind(LOCAL_PORT, () => {
      try {
        client.setBroadcast(true);
        const buffer = Buffer.from(message);
        client.send(buffer, targetPort, targetIp, (err) => {
          if (err) {
            console.error('UDP Send Callback Error:', err);
          } else {
            console.log(`UDP Broadcast sent: ${message}`);
          }
          client.close();
        });
      } catch (err) {
        console.error('UDP Send Logic Error:', err);
        client.close();
      }
    });
  } catch (e) {
    console.error('UDP Setup Error:', e);
    client.close();
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1100,
    height: 900,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.setMenu(null);

  // Permission check handler for Web Serial
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (permission === 'serial') {
        return true;
      }
      return false;
    },
  );

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') {
      return true;
    }
    return false;
  });


  // State to track which port the renderer wants to connect to
  let targetSerialPortId = '';

  ipcMain.handle('set-serial-connect-target', (event, portId: string) => {
    targetSerialPortId = portId;
    return true; // Acknowledge receipt
  });

  mainWindow.webContents.session.on(
    'select-serial-port',
    (event, portList, webContents, callback) => {
      event.preventDefault();

      // If we have a target port to connect to, find it and approve it
      if (targetSerialPortId) {
        const port = portList.find((p) => p.portId === targetSerialPortId);
        // Clean up immediately so subsequent "refresh" calls don't get auto-approved
        targetSerialPortId = '';

        if (port) {
          callback(port.portId);
          return;
        }
        // If not found, fall through to cancel/list behavior (or maybe error? but browser API will just reject)
      }

      // Default behavior: Send list to renderer for display, then cancel the picker
      if (portList && portList.length > 0) {
        mainWindow?.webContents.send('serial-ports-list', portList);
      } else {
        mainWindow?.webContents.send('serial-ports-list', []);
      }

      callback('');
    },
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
