// // src/preload/index.ts
// import { contextBridge, ipcRenderer } from 'electron'
// import { electronAPI } from '@electron-toolkit/preload'

// // increase limit
// ipcRenderer.setMaxListeners(50)

// const electronTRPC = {
//   sendMessage: (op: unknown) => ipcRenderer.send('electron-trpc', op),
//   onMessage: (cb: (data: unknown) => void) => {
//     // ✅ once = auto removes after first call
//     ipcRenderer.once('electron-trpc', (_event, data) => cb(data))
//   },
//   removeMessageListener: () => {} // no-op, once handles cleanup
// }

// if (process.contextIsolated) {
//   try {
//     contextBridge.exposeInMainWorld('electron', electronAPI)
//     contextBridge.exposeInMainWorld('api', {})
//     contextBridge.exposeInMainWorld('electronTRPC', electronTRPC)
//   } catch (error) {
//     console.error(error)
//   }
// }

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const callbacks = new Map<number, (data: unknown) => void>()

// ONE permanent listener - routes by id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ipcRenderer.on('electron-trpc', (_event, data: any) => {
  const cb = callbacks.get(data.id)
  if (cb) {
    cb(data)
    callbacks.delete(data.id)
  }
})

const electronTRPC = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage: (op: any) => {
    ipcRenderer.send('electron-trpc', op)
  },
  onMessage: (cb: (data: unknown) => void, id: number) => {
    callbacks.set(id, cb)
  }
}

const backupApi = {
  save: () => ipcRenderer.invoke('backup:save') as Promise<{ success: boolean; path?: string; error?: string }>,
  restore: () => ipcRenderer.invoke('backup:restore') as Promise<{ success: boolean; error?: string }>,
  selectFolder: () => ipcRenderer.invoke('backup:selectFolder') as Promise<{ success: boolean; folderPath?: string }>,
  saveToFolder: (folderPath: string) => ipcRenderer.invoke('backup:saveToFolder', folderPath) as Promise<{ success: boolean; path?: string; fileName?: string; error?: string }>,
}

const appApi = {
  cleanData: (email: string, password: string) =>
    ipcRenderer.invoke('app:cleanData', { email, password }) as Promise<{ success: boolean; error?: string }>,
}

const printApi = {
  printReceipt: (html: string) =>
    ipcRenderer.invoke('print:receipt', html) as Promise<{ success: boolean; error?: string }>,
}


if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {})
    contextBridge.exposeInMainWorld('electronTRPC', electronTRPC)
    contextBridge.exposeInMainWorld('backupApi', backupApi)
    contextBridge.exposeInMainWorld('appApi', appApi)
    contextBridge.exposeInMainWorld('printApi', printApi)
  } catch (error) {
    console.error(error)
  }
}
