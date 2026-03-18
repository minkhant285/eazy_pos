import { app, shell, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createIPCHandler } from './trpc-server/ipc-handler'
import { appRouter } from './trpc-server/router'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, sqlite, dbPath } from './db/db'
import { encryptDbFile, decryptMkbakToFile } from './backup/backup.service'
import { clearLicense } from './license/licenseService'
import { UserService } from './db/services'

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

// Enable Wayland support on Linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
}

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

  // ── Backup: save .mkbak ──────────────────────────────────────
  ipcMain.handle('backup:save', async () => {
    const tmpPath = path.join(app.getPath('temp'), `easypos-bk-${Date.now()}.db`)
    try {
      await sqlite.backup(tmpPath)
      const mkbakBuffer = encryptDbFile(tmpPath)
      fs.unlinkSync(tmpPath)

      const dateStr = new Date().toISOString().slice(0, 10)
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save EasyPOS Backup',
        defaultPath: `easypos-backup-${dateStr}.mkbak`,
        filters: [{ name: 'EasyPOS Backup', extensions: ['mkbak'] }],
      })
      if (canceled || !filePath) return { success: false }

      fs.writeFileSync(filePath, mkbakBuffer)
      return { success: true, path: filePath }
    } catch (e: unknown) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
      return { success: false, error: (e as Error).message }
    }
  })

  // ── Backup: restore .mkbak ───────────────────────────────────
  ipcMain.handle('backup:restore', async () => {
    try {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Restore EasyPOS Backup',
        filters: [{ name: 'EasyPOS Backup', extensions: ['mkbak'] }],
        properties: ['openFile'],
      })
      if (canceled || !filePaths[0]) return { success: false }

      const mkbakBuffer = fs.readFileSync(filePaths[0])
      const tmpPath = path.join(app.getPath('temp'), `easypos-restore-${Date.now()}.db`)
      decryptMkbakToFile(mkbakBuffer, tmpPath)

      // Close DB, replace file, relaunch
      sqlite.close()
      fs.copyFileSync(tmpPath, dbPath)
      fs.unlinkSync(tmpPath)

      // Spawn a new instance preserving env vars (important in dev — keeps ELECTRON_RENDERER_URL)
      spawn(process.execPath, process.argv.slice(1), {
        detached: true,
        stdio: 'ignore',
        env: process.env,
      }).unref()

      app.exit(0)
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

  // ── Backup: pick folder ──────────────────────────────────────
  ipcMain.handle('backup:selectFolder', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (canceled || !filePaths[0]) return { success: false }
    return { success: true, folderPath: filePaths[0] }
  })

  // ── Backup: save .mkbak to a specific folder ─────────────────
  ipcMain.handle('backup:saveToFolder', async (_event, folderPath: string) => {
    const tmpPath = path.join(app.getPath('temp'), `easypos-bk-${Date.now()}.db`)
    try {
      await sqlite.backup(tmpPath)
      const mkbakBuffer = encryptDbFile(tmpPath)
      fs.unlinkSync(tmpPath)

      const dateStr = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
      const fileName = `easypos-backup-${dateStr}.mkbak`
      const filePath = path.join(folderPath, fileName)
      fs.writeFileSync(filePath, mkbakBuffer)
      return { success: true, path: filePath, fileName }
    } catch (e: unknown) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
      return { success: false, error: (e as Error).message }
    }
  })

  // ── Print receipt / label ─────────────────────────────────────
  ipcMain.handle('print:receipt', async (_event, html: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: false, javascript: true },
      })

      let settled = false
      const finish = (result: { success: boolean; error?: string }) => {
        if (settled) return
        settled = true
        try { printWin.destroy() } catch { /* ignore */ }
        resolve(result)
      }

      // Load blank page, then inject HTML once blank is ready
      printWin.loadURL('about:blank')

      printWin.webContents.once('did-finish-load', () => {
        printWin.webContents
          .executeJavaScript(
            `document.open();document.write(${JSON.stringify(html)});document.close();`
          )
          .then(() => {
            // Give Chromium a tick to apply CSS layout before printing
            setTimeout(() => {
              printWin.webContents.print(
                { silent: false, printBackground: false },
                (success, failureReason) => {
                  finish(success ? { success: true } : { success: false, error: failureReason })
                }
              )
            }, 150)
          })
          .catch((err) => finish({ success: false, error: String(err) }))
      })

      printWin.on('closed', () => finish({ success: false, error: 'cancelled' }))
    })
  })

  // ── Clean all data (admin password required) ─────────────────
  ipcMain.handle('app:cleanData', async (_event, { email, password }: { email: string; password: string }) => {
    try {
      // Verify admin credentials
      const user = UserService.verifyPassword(email, password)
      if (!user) return { success: false, error: 'Incorrect email or password' }
      if (user.role !== 'admin') return { success: false, error: 'Only admin accounts can clean app data' }

      // 1. Close DB connection
      sqlite.close()

      // 2. Delete DB file
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

      // 3. Delete license file
      clearLicense()

      // 4. Relaunch fresh
      spawn(process.execPath, process.argv.slice(1), {
        detached: true,
        stdio: 'ignore',
        env: process.env,
      }).unref()

      app.exit(0)
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  })

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
