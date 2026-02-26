import { app, shell, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createIPCHandler } from './trpc-server/ipc-handler'
import { appRouter } from './trpc-server/router'
import './db/db'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db/db'

import path from 'path'




function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width,
    height,
    title: 'Easy POS',
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  createIPCHandler({ router:appRouter })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const migrationsFolder = app.isPackaged
  ? path.join(process.resourcesPath, 'drizzle')  // production (packaged app)
  : path.join(__dirname, '../../drizzle')

async function runMigrations() {
  try {
    migrate(db, { migrationsFolder: migrationsFolder })
    console.log('✅ Database migrations complete')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    // Show error dialog so user knows something went wrong
    dialog.showErrorBox(
      'Database Error',
      `Failed to initialize database.\n\n${err}\n\nPlease contact support.`
    )
    app.quit()
  }
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.setName('Easy POS')

app.whenReady().then(async() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.easy-pos')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
   await runMigrations()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
