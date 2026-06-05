const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runCommand: (command) => ipcRenderer.invoke('run-command', command),
  getSavedDevices: () => ipcRenderer.invoke('get-saved-devices'),
  saveDevice: (deviceId) => ipcRenderer.invoke('save-device', deviceId),
  onConnectToDevice: (callback) => ipcRenderer.on('connect-to-device', (event, deviceId) => callback(deviceId)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => {
    ipcRenderer.invoke('run-command', 'electron-updater');
    callback();
  })
});
