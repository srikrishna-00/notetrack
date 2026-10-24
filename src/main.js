// src/main.js - Electron Main Process for AppFlowy Lean
'use strict';

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const SMOKE_MODE = process.env.APPFLOWY_SMOKE === '1';

app.setName('AppFlowy Lean');

if (SMOKE_MODE) {
  app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'appflowy-smoke-')));
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 850,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#12141a',
    title: 'AppFlowy Lean',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (SMOKE_MODE) {
    // Automated Smoke Test Runner
    mainWindow.webContents.on('did-finish-load', async () => {
      console.log('Smoke Mode: Checking AppFlowy Lean subsystems in renderer...');
      try {
        const result = await mainWindow.webContents.executeJavaScript(`
          (function() {
            const api = window.__APPFLOWY_LEAN__;
            if (!api) throw new Error('Global __APPFLOWY_LEAN__ hook missing');
            if (!api.store) throw new Error('Store subsystem missing');
            if (!api.shell) throw new Error('Shell subsystem missing');
            if (!api.aiAssistant) throw new Error('AI subsystem missing');

            const pages = Object.keys(api.store.data.pages);
            if (pages.length < 2) throw new Error('Expected at least 2 default pages');

            const welcomePage = api.store.getPage('page-welcome');
            if (!welcomePage || welcomePage.type !== 'document') throw new Error('Welcome document missing');

            const tasksPage = api.store.getPage('page-tasks');
            if (!tasksPage || tasksPage.type !== 'database') throw new Error('Tasks database missing');

            // Switch to database and check views
            api.renderPageView('page-tasks');
            const db = api.store.getDatabase('page-tasks');
            if (!db || db.views.length < 6) throw new Error('Database 6-view engine missing');

            // Verify prompt templates
            const templates = api.aiAssistant.getTemplates();
            if (templates.length !== 10) throw new Error('AI templates count mismatch: ' + templates.length);

            return {
              success: true,
              activePages: pages.length,
              databaseViews: db.views.length,
              aiTemplates: templates.length
            };
          })();
        `);

        console.log('Smoke Test PASSED:', JSON.stringify(result, null, 2));
        app.exit(0);
      } catch (err) {
        console.error('Smoke Test FAILED:', err);
        app.exit(1);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('app:quit', () => {
  app.quit();
});
