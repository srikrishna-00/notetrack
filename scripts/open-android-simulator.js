// scripts/open-android-simulator.js
// NoteTrack — Dedicated Android Mobile Device Simulator
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setName('NoteTrack Android');

let simWindow = null;

function createAndroidSimulator() {
  simWindow = new BrowserWindow({
    width: 420,
    height: 900,
    minWidth: 360,
    minHeight: 640,
    maxWidth: 480,
    maxHeight: 960,
    title: 'NoteTrack — Android Mobile Interface (Pixel 8 Viewport)',
    backgroundColor: '#12141a',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../src/preload.js'),
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  // Emulate Android Mobile Chrome User-Agent
  simWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
  );

  simWindow.loadFile(path.join(__dirname, '../src/index.html'));

  simWindow.on('closed', () => {
    simWindow = null;
  });
}

app.whenReady().then(() => {
  createAndroidSimulator();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createAndroidSimulator();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
