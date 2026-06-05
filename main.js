const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

let mainWindow;

// 保存済みデバイスのファイルパス
const userData = app.getPath('userData');
const savedDevicesFile = path.join(userData, 'last-bluetooth.json');

// 保存済みデバイスを読み込む
function loadSavedDevices() {
  try {
    if (fs.existsSync(savedDevicesFile)) {
      const data = fs.readFileSync(savedDevicesFile, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (error) {
    console.error('Failed to load saved devices:', error);
  }
  return [];
}

// デバイスを保存
function saveLaunchDevice(deviceId) {
  try {
    let devices = loadSavedDevices();
    if (!devices.includes(deviceId)) {
      devices.push(deviceId);
    }
    // 最新50個まで保持
    devices = devices.slice(-50);
    fs.writeFileSync(savedDevicesFile, JSON.stringify(devices), 'utf8');
  } catch (error) {
    console.error('Failed to save device:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.on('ready', () => {
  createWindow();

  // 自動更新チェック
  autoUpdater.checkForUpdatesAndNotify();

  // メニューを作成
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC: コマンド実行
ipcMain.handle('run-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
});

// IPC: 保存済みデバイスを取得
ipcMain.handle('get-saved-devices', async () => {
  return loadSavedDevices();
});

// IPC: デバイスを保存
ipcMain.handle('save-device', async (event, deviceId) => {
  saveLaunchDevice(deviceId);
  return true;
});

// メニューを作成
function createMenu() {
  const devices = loadSavedDevices();
  
  // 最近のデバイスサブメニューを作成
  const recentDevicesMenu = devices.map((deviceId) => ({
    label: deviceId,
    click: () => {
      // デバイスに接続
      mainWindow.webContents.send('connect-to-device', deviceId);
    }
  }));

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Recent Devices',
      submenu: recentDevicesMenu.length > 0 ? recentDevicesMenu : [
        { label: '(No recent devices)', enabled: false }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 自動更新イベント
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
});
