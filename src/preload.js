// src/preload.js - Secure Preload Bridge for AppFlowy Lean Desktop
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  platform: process.platform,
  isElectron: true,
  appVersion: '0.1.0',
  quit: () => ipcRenderer.send('app:quit')
});
