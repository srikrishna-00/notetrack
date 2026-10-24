// scripts/open-android-simulator.js
// NoteTrack — Dedicated Android Mobile Device Simulator
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setName('NoteTrack Android Simulator');

let simWindow = null;

function createAndroidSimulator() {
  simWindow = new BrowserWindow({
    width: 650,
    height: 980,
    minWidth: 460,
    minHeight: 800,
    title: 'NoteTrack — Android Mobile Device Simulator (Pixel 8 / Galaxy S24)',
    backgroundColor: '#0b0d13',
    titleBarStyle: 'default',
    alwaysOnTop: true, // Bring directly to front so user sees it immediately
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  simWindow.loadURL('http://localhost:3030/preview-android.html');

  simWindow.once('ready-to-show', () => {
    simWindow.show();
    simWindow.focus();
    // After focusing, remove alwaysOnTop so user can minimize normally
    setTimeout(() => {
      if (simWindow) simWindow.setAlwaysOnTop(false);
    }, 1500);
  });

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
