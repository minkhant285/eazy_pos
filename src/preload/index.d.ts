import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    backupApi: {
      save: () => Promise<{ success: boolean; path?: string; error?: string }>
      restore: () => Promise<{ success: boolean; error?: string }>
    }
  }
}
